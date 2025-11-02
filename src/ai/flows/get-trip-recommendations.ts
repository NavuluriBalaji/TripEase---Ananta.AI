'use server';

/**
 * @fileOverview Recommends trip destinations based on climatic conditions.
 *
 * - getTripRecommendations - A function that returns a list of travel destinations.
 * - GetTripRecommendationsInput - The input type for the getTripRecommendations function.
 * - GetTripRecommendationsOutput - The return type for the getTripRecommendations function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TripRecommendationSchema } from '@/lib/types';
import type { TripRecommendation } from '@/lib/types';


const GetTripRecommendationsInputSchema = z.object({
  climaticCondition: z.string().describe('The desired climatic condition for the trip (e.g., sunny, snowy, mild).'),
});
export type GetTripRecommendationsInput = z.infer<typeof GetTripRecommendationsInputSchema>;


const GetTripRecommendationsOutputSchema = z.object({
  recommendations: z.array(TripRecommendationSchema).describe('A list of 4 trip recommendations.'),
});
export type GetTripRecommendationsOutput = z.infer<typeof GetTripRecommendationsOutputSchema>;

export async function getTripRecommendations(input: GetTripRecommendationsInput): Promise<GetTripRecommendationsOutput> {
  return getTripRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getTripRecommendationsPrompt',
  input: { schema: GetTripRecommendationsInputSchema },
  output: { schema: GetTripRecommendationsOutputSchema },
  prompt: `You are a travel expert. Based on the desired climatic condition of '{{{climaticCondition}}}', recommend 4 unique travel destinations. For each destination, provide a short, engaging description highlighting why it's a great choice.`,
});

const getTripRecommendationsFlow = ai.defineFlow(
  {
    name: 'getTripRecommendationsFlow',
    inputSchema: GetTripRecommendationsInputSchema,
    outputSchema: GetTripRecommendationsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
