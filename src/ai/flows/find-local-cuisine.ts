'use server';

/**
 * @fileOverview Recommends local cuisine and restaurants for a given destination.
 * 
 * - findLocalCuisine - A function that suggests local dishes and where to find them.
 * - FindLocalCuisineInput - The input type for the findLocalCuisine function.
 * - FindLocalCuisineOutput - The return type for the findLocalCuisine function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FindLocalCuisineInputSchema = z.object({
  destination: z.string().describe('The destination city and country (e.g., "Kyoto, Japan").'),
});
export type FindLocalCuisineInput = z.infer<typeof FindLocalCuisineInputSchema>;

const CuisineRecommendationSchema = z.object({
    dishName: z.string().describe("The name of the local dish."),
    dishDescription: z.string().describe("A brief, appetizing description of the dish."),
    restaurantName: z.string().describe("The name of a recommended restaurant to try this dish."),
    restaurantAddress: z.string().describe("The address of the recommended restaurant."),
});

const FindLocalCuisineOutputSchema = z.object({
  recommendations: z.array(CuisineRecommendationSchema).describe('A list of 3-4 local cuisine recommendations.'),
});
export type FindLocalCuisineOutput = z.infer<typeof FindLocalCuisineOutputSchema>;

export async function findLocalCuisine(input: FindLocalCuisineInput): Promise<FindLocalCuisineOutput> {
  return findLocalCuisineFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findLocalCuisinePrompt',
  input: { schema: FindLocalCuisineInputSchema },
  output: { schema: FindLocalCuisineOutputSchema },
  prompt: `You are a world-renowned food critic and travel expert. For the given destination, recommend 3-4 must-try local dishes.

Destination: {{{destination}}}

For each dish, provide:
1.  The name of the dish.
2.  A short, mouth-watering description.
3.  The name of a specific, highly-rated restaurant famous for that dish.
4.  The address of that restaurant.

Present your recommendations clearly. Do not recommend fictional places.`,
});

const findLocalCuisineFlow = ai.defineFlow(
  {
    name: 'findLocalCuisineFlow',
    inputSchema: FindLocalCuisineInputSchema,
    outputSchema: FindLocalCuisineOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
