'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeInputSchema = z.object({
  userQuery: z.string().describe('Free-form user request for trip planning'),
});
export type AnalyzeInput = z.infer<typeof AnalyzeInputSchema>;

const AnalyzeOutputSchema = z.object({
  normalized: z.object({
    destination: z.string().optional(),
    durationDays: z.number().optional(),
    interests: z.array(z.string()).optional(),
    travelDates: z.string().optional(),
    budgetUsd: z.number().optional(),
    partySize: z.number().optional(),
  }),
  missingQuestions: z.array(z.string()).describe('Dynamic questions to clarify missing info'),
});
export type AnalyzeOutput = z.infer<typeof AnalyzeOutputSchema>;

const analyzePrompt = ai.definePrompt({
  name: 'analyzeTripIntentPrompt',
  input: { schema: AnalyzeInputSchema },
  output: { schema: AnalyzeOutputSchema },
  prompt: `You are a senior trip planner. First, extract any details found in the user's request:
- destination (string)
- durationDays (number)
- interests (list of strings)
- travelDates (string; specific dates or a month/season range)
- budgetUsd (number)
- partySize (number)

Then generate a comprehensive but concise set of clarifying questions to gather all relevant information needed to produce the best itinerary. Even if some information appears present, include a brief confirmation-style question instead of omitting it. Deduplicate and keep each question short, specific, and answerable in one line.

Cover these areas as appropriate, but only when relevant to the user's intent:
- Core trip: destination (confirm spelling/region), trip length (days), exact dates or date window, origin city for flights
- Travelers: party size, ages of children (if any), accessibility or mobility needs
- Preferences: interests/activities (e.g., backwaters, hill stations, beaches), pace (relaxed vs. packed), must-see items, exclusions
- Lodging: budget per night, preferred accommodation type (hotel, resort, homestay), room needs (e.g., family room), location preference
- Transport: flights (preferred times/airlines if any), airport flexibility, local transport preference (car rental, driver, public transit)
- Practical: overall budget range, dietary restrictions, safety/cultural considerations, weather tolerances (rain/heat), visa/passport considerations for international
- Extras: nightlife appetite, shopping interests, photography/sunrise/sunset goals, special occasions

Aim for 8–14 questions total depending on context. Use the user's wording to make questions feel tailored. Keep them in a logical order (core -> travelers -> preferences -> logistics -> practical -> extras).

Return your result strictly in the schema: populate \"normalized\" fields with what you can infer, and put the final question list in \"missingQuestions\" (even if they are confirmations). Do not include explanations, code blocks, or JSON outside of the schema.

User: {{{userQuery}}}`,
});

export const analyzeIntentAndQuestions = ai.defineFlow(
  {
    name: 'analyzeIntentAndQuestions',
    inputSchema: AnalyzeInputSchema,
    outputSchema: AnalyzeOutputSchema,
  },
  async (input) => {
    const { output } = await analyzePrompt(input);
    return output!;
  }
);
