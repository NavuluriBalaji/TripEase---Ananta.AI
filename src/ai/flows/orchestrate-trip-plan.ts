'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  searchFlights,
  searchHotels,
  searchCarRentals,
  searchBikeRentals,
  searchBarsAndClubs,
  searchAttractions,
  searchLocalGuides,
} from '@/lib/serpapi';
import { fetchFlightsFromService } from '@/lib/flightradarClient';

const OrchestrateInputSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  durationDays: z.number().optional(),
  budgetUsd: z.number().optional(),
  partySize: z.number().optional(),
  interests: z.array(z.string()).optional(),
  travelDates: z.string().optional(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  // When true, do not ask follow-up questions; proceed with best-effort defaults
  forceProceed: z.boolean().optional(),
  // Original free-form user request (helps LLM capture nuance)
  userQuery: z.string().optional(),
});
export type OrchestrateInput = z.infer<typeof OrchestrateInputSchema>;

const OrchestrateOutputSchema = z.object({
  summary: z.string(),
  raw: z.any(),
});
export type OrchestrateOutput = z.infer<typeof OrchestrateOutputSchema>;

// Ask the user targeted follow-up questions when required inputs are missing
const clarifierPrompt = ai.definePrompt({
  name: 'tripInfoClarifier',
  input: { schema: z.object({
    origin: z.string().optional(),
    destination: z.string().optional(),
    durationDays: z.number().optional(),
    budgetUsd: z.number().optional(),
    partySize: z.number().optional(),
    interests: z.array(z.string()).optional(),
    travelDates: z.string().optional(),
    checkInDate: z.string().optional(),
    checkOutDate: z.string().optional(),
    missing: z.array(z.string()),
  }) },
  output: { schema: z.object({ summary: z.string() }) },
  prompt: `You're a friendly trip planner. Some details are missing: {{{missing}}}.
Ask 2-4 short, targeted questions to fill these gaps. Always ask for destination and trip length (number of days) first if missing.
Use what's already provided to be specific (origin: {{{origin}}}, tentative dates: {{{travelDates}}}, interests: {{{interests}}}, party size: {{{partySize}}}).
Offer example formats, like: "Destination: Goa, Trip length: 4 days (Nov 10–13)". Keep it concise and easy to answer.
Output only plain text questions (a brief sentence or a numbered list). Do not include code, JSON, or backticks.`,
});

const summarizerPrompt = ai.definePrompt({
  name: 'tripAggregatorSummarizer',
  input: { schema: z.object({
    origin: z.string().optional(),
    destination: z.string(),
    durationDays: z.number(),
    budgetUsd: z.number().optional(),
    partySize: z.number().optional(),
    interests: z.array(z.string()).optional(),
    travelDates: z.string().optional(),
    checkInDate: z.string().optional(),
    checkOutDate: z.string().optional(),
    userQuery: z.string().optional(),
    toolsResult: z.any(),
  }) },
  output: { schema: z.object({ summary: z.string() }) },
  prompt: `You are a meticulous trip planner.
User request (may include additional nuance): {{{userQuery}}}
Context: origin={{origin}}, destination={{destination}}, durationDays={{durationDays}}, partySize={{partySize}}, budgetUsd={{budgetUsd}}, travelDates={{travelDates}}, checkIn={{checkInDate}}, checkOut={{checkOutDate}}, interests={{interests}}

Using the raw tool results, prepare a robust plan with:
Flights: list 3-5 options from {{{origin}}} to {{{destination}}} with airline, approx price, departure/arrival times, layover information, baggage allowance, and a short note about timing or convenience. If international, include visa requirements and currency exchange tips. If traveling during peak season, note price fluctuations.
Hotels: list 3-5 mid-range options (consider party size {{{partySize}}}) with approx nightly price, location, room type suitable for party size, amenities, and cancellation policy. If family with children, note kid-friendly features. If solo traveler, note safety features and social opportunities. If large group, note group accommodations.
Local logistics: car rentals and bike rentals with names, phone numbers if present, rough daily price, and requirements (license, age restrictions). Include public transportation options and costs. If international, note if international driving permit is needed. If accessibility needs, ensure options accommodate these requirements.
Local tour guides: list 2-3 guides with phone numbers, specialization, languages spoken, and approximate cost per day/hour. If specific interests mentioned, ensure guides specialize in those areas.
Attractions: propose a day-by-day outline for {{{durationDays}}} days, matching interests {{{interests}}}. For each day, include morning, afternoon, and evening activities with travel time between locations. If short trip (≤3 days), prioritize must-see attractions. If extended trip (>7 days), include rest days and day trips. If family with children, include age-appropriate activities. If mixed age group, balance activities to suit different energy levels. Include indoor alternatives for bad weather.
Nightlife: 2-3 options if relevant with name, type, location, approximate cost, and dress code. If family with children, include family-friendly evening entertainment instead.
Dining: include 3-5 restaurant recommendations for different meals with price range, cuisine type, and location. If dietary restrictions mentioned, include accommodating options. If international, note local specialties to try.
Special considerations: address any seasonal factors, local events, or travel advisories. If destination is a major tourist hub, include both popular attractions and hidden gems. If off-the-beaten-path, focus on local experiences and practical information about accessibility.
Cost: rough total estimate broken down by category (flights, accommodation, transportation, activities, meals), clearly indicating estimates. If currency differs from origin, provide approximate conversions. Note potential price fluctuations based on season or local events.
IMPORTANT: Do not include any raw JSON, code blocks, or backticks.`,
});

async function backoffSleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 600): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const message = (err?.message || '').toLowerCase();
      const isTransient = message.includes('503') || message.includes('unavailable') || message.includes('overloaded');
      if (i < attempts - 1 && isTransient) {
        await backoffSleep(baseDelayMs * Math.pow(2, i));
        continue;
      }
      break;
    }
  }
  throw lastErr;
}

function cleanSummary(text: string): string {
  let cleaned = text.replace(/```[\s\S]*?```/g, '').trim();
  cleaned = cleaned
    .split('\n')
    .filter(line => !line.trim().startsWith('{') && !line.trim().startsWith('[') && !line.trim().startsWith('}'))
    .join('\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/^\s*\*\*([A-Za-z].*?)\*\*\s*$/gm, '### $1');
  return cleaned.trim();
}

export const orchestrateTripPlan = ai.defineFlow(
  {
    name: 'orchestrateTripPlan',
    inputSchema: OrchestrateInputSchema,
    outputSchema: OrchestrateOutputSchema,
  },
  async (input) => {
    const { origin, destination, durationDays, travelDates, checkInDate, checkOutDate, partySize, forceProceed } = input;

    // If key info is missing, either ask for clarification or proceed with defaults
    const missing: string[] = [];
    if (!destination) missing.push('destination');
    if (!durationDays) missing.push('durationDays');
    if (missing.length && !forceProceed) {
      const { output: clarification } = await withRetries(() => clarifierPrompt({ ...input, missing }));
      return { summary: cleanSummary(clarification!.summary), raw: { status: 'needs_info', missing } };
    }

    // Safe fallbacks if forceProceed: craft a generic plan rather than blocking
    const safeDestination = destination || 'your chosen destination';
    const safeDuration = durationDays || 3;

    // Prefer FlightRadar-backed service if configured
    const frFlights = destination
      ? await fetchFlightsFromService(origin || 'your city', destination!, travelDates).catch(() => [])
      : [];

    const [flights, hotels, cars, bikes, bars, attractions, guides] = destination
      ? await Promise.all([
          frFlights.length ? Promise.resolve({ frFlights }) : searchFlights(origin || 'your city', destination!, travelDates),
          searchHotels(destination!, checkInDate, checkOutDate, partySize),
          searchCarRentals(destination!),
          searchBikeRentals(destination!),
          searchBarsAndClubs(destination!),
          searchAttractions(destination!),
          searchLocalGuides(destination!),
        ])
      : await Promise.all([
          Promise.resolve({ frFlights }),
          Promise.resolve({}),
          Promise.resolve({}),
          Promise.resolve({}),
          Promise.resolve({}),
          Promise.resolve({}),
          Promise.resolve({}),
        ]);

    const toolsResult = { flights, hotels, cars, bikes, bars, attractions, guides };

    const summarizerInput = {
      origin,
      destination: destination ? destination! : safeDestination,
      durationDays: durationDays ? durationDays! : safeDuration,
      budgetUsd: input.budgetUsd,
      partySize,
      interests: input.interests,
      travelDates,
      checkInDate,
      checkOutDate,
      userQuery: input.userQuery,
      toolsResult,
    };

    const { output } = await withRetries(() => summarizerPrompt(summarizerInput as any));

    return { summary: cleanSummary(output!.summary), raw: toolsResult };
  }
);
