'use server';

/**
 * @fileOverview A flow that allows users to provide feedback on the generated itinerary and regenerate specific parts of the plan using AI.
 *
 * - provideFeedbackToRefineItinerary - A function that handles the feedback process and triggers itinerary refinement.
 * - ProvideFeedbackToRefineItineraryInput - The input type for the provideFeedbackToRefineItinerary function.
 * - ProvideFeedbackToRefineItineraryOutput - The return type for the provideFeedbackToRefineItinerary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideFeedbackToRefineItineraryInputSchema = z.object({
  itineraryId: z.string().describe('The ID of the itinerary to refine.'),
  feedback: z.string().describe('The user feedback on the itinerary.'),
  sectionToRefine: z.string().describe('The specific section of the itinerary to regenerate (e.g., Day 2 activities).'),
});
export type ProvideFeedbackToRefineItineraryInput = z.infer<typeof ProvideFeedbackToRefineItineraryInputSchema>;

const ProvideFeedbackToRefineItineraryOutputSchema = z.object({
  refinedItinerarySection: z.string().describe('The refined section of the itinerary based on the user feedback.'),
});
export type ProvideFeedbackToRefineItineraryOutput = z.infer<typeof ProvideFeedbackToRefineItineraryOutputSchema>;

export async function provideFeedbackToRefineItinerary(input: ProvideFeedbackToRefineItineraryInput): Promise<ProvideFeedbackToRefineItineraryOutput> {
  return provideFeedbackToRefineItineraryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideFeedbackToRefineItineraryPrompt',
  input: {schema: ProvideFeedbackToRefineItineraryInputSchema},
  output: {schema: ProvideFeedbackToRefineItineraryOutputSchema},
  prompt: `You are an AI travel assistant. A user has provided feedback on their itinerary, and you need to regenerate a specific section of the itinerary based on their feedback.

Itinerary ID: {{{itineraryId}}}
Feedback: {{{feedback}}}
Section to refine: {{{sectionToRefine}}}

Regenerate the section of the itinerary, taking into account the user's feedback. Provide only the refined section of the itinerary. Make sure you do not hallucinate locations or activities that are not possible.
`,
});

const provideFeedbackToRefineItineraryFlow = ai.defineFlow(
  {
    name: 'provideFeedbackToRefineItineraryFlow',
    inputSchema: ProvideFeedbackToRefineItineraryInputSchema,
    outputSchema: ProvideFeedbackToRefineItineraryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
