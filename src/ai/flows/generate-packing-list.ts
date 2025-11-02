'use server';

/**
 * @fileOverview Generates a personalized packing list for a trip.
 * 
 * - generatePackingList - A function that creates a packing list based on trip details.
 * - GeneratePackingListInput - The input type for the generatePackingList function.
 * - GeneratePackingListOutput - The return type for the generatePackingList function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePackingListInputSchema = z.object({
  destination: z.string().describe('The destination of the trip (e.g., "Paris, France").'),
  duration: z.number().describe('The duration of the trip in days.'),
  travelStyle: z.string().describe('The style of travel (e.g., "Luxury", "Backpacking", "Family").'),
  preferences: z.string().describe('User preferences and planned activities (e.g., "hiking, museums, fancy dinners").'),
});
export type GeneratePackingListInput = z.infer<typeof GeneratePackingListInputSchema>;

const PackingCategorySchema = z.object({
  category: z.string().describe('The category of items, e.g., "Clothing", "Toiletries", "Documents".'),
  items: z.array(z.string()).describe('A list of items in this category.'),
});

const GeneratePackingListOutputSchema = z.object({
  packingList: z.array(PackingCategorySchema).describe('A list of packing categories with their items.'),
});
export type GeneratePackingListOutput = z.infer<typeof GeneratePackingListOutputSchema>;


export async function generatePackingList(input: GeneratePackingListInput): Promise<GeneratePackingListOutput> {
  return generatePackingListFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePackingListPrompt',
  input: { schema: GeneratePackingListInputSchema },
  output: { schema: GeneratePackingListOutputSchema },
  prompt: `You are an expert travel assistant who specializes in creating personalized packing lists. Generate a comprehensive packing list based on the user's trip details.

Destination: {{{destination}}}
Duration: {{{duration}}} days
Travel Style: {{{travelStyle}}}
Activities & Preferences: {{{preferences}}}

Consider the climate of the destination, the duration of the trip, the travel style, and the planned activities. Group the items into logical categories like "Clothing", "Toiletries", "Electronics", "Documents", and "Miscellaneous". Be thorough and practical.`,
});


const generatePackingListFlow = ai.defineFlow(
  {
    name: 'generatePackingListFlow',
    inputSchema: GeneratePackingListInputSchema,
    outputSchema: GeneratePackingListOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
