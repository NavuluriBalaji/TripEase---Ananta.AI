// src/ai/flows/generate-personalized-itinerary.ts
'use server';

/**
 * @fileOverview Generates a personalized trip itinerary based on user preferences, budget, and travel style.
 *
 * - generatePersonalizedItinerary - A function that generates a personalized trip itinerary.
 * - GeneratePersonalizedItineraryInput - The input type for the generatePersonalizedItinerary function.
 * - GeneratePersonalizedItineraryOutput - The return type for the generatePersonalizedItinerary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedItineraryInputSchema = z.object({
  preferences: z.string().describe('User preferences for the trip, such as interests and activities.'),
  budget: z.number().describe('The budget for the trip in USD.'),
  travelStyle: z.string().describe('The user travel style, e.g., adventurous, relaxed, luxury.'),
  destination: z.string().describe('The destination for the trip.'),
  duration: z.number().describe('The duration of the trip in days.'),
  checkInDate: z.string().optional().describe('Optional check-in date (ISO or human-readable).'),
  checkOutDate: z.string().optional().describe('Optional check-out date (ISO or human-readable).'),
});
export type GeneratePersonalizedItineraryInput = z.infer<typeof GeneratePersonalizedItineraryInputSchema>;

const GeneratePersonalizedItineraryOutputSchema = z.object({
  itinerary: z.string().describe('A detailed itinerary for the trip.'),
  totalPrice: z.number().describe('The estimated total price for the trip.'),
});
export type GeneratePersonalizedItineraryOutput = z.infer<typeof GeneratePersonalizedItineraryOutputSchema>;

export async function generatePersonalizedItinerary(input: GeneratePersonalizedItineraryInput): Promise<GeneratePersonalizedItineraryOutput> {
  return generatePersonalizedItineraryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedItineraryPrompt',
  input: {schema: GeneratePersonalizedItineraryInputSchema},
  output: {schema: GeneratePersonalizedItineraryOutputSchema},
  prompt: `You are an AI trip planner. Generate a personalized trip itinerary based on the user's preferences, budget, and travel style for the destination: {{{destination}}}. The trip duration is {{{duration}}} days.

User Preferences: {{{preferences}}}
Budget (USD): {{{budget}}}
Travel Style: {{{travelStyle}}}
Check-in: {{{checkInDate}}}
Check-out: {{{checkOutDate}}}

Provide a detailed itinerary and the estimated total price for the trip.

Output format should include a description for each day's plan and the estimated cost for that day.
`,
});

const generatePersonalizedItineraryFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedItineraryFlow',
    inputSchema: GeneratePersonalizedItineraryInputSchema,
    outputSchema: GeneratePersonalizedItineraryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
