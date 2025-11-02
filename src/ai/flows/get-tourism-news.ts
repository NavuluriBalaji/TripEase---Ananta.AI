'use server';

/**
 * @fileOverview Provides a summary of the latest tourism and travel news.
 *
 * - getTourismNews - A function that returns a summary of tourism news.
 * - GetTourismNewsOutput - The return type for the getTourismNews function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GetTourismNewsOutputSchema = z.object({
  newsSummary: z.string().describe('A summary of the latest tourism and travel news. Use markdown for formatting, including headers (###) for categories and bold text for key phrases.'),
});
export type GetTourismNewsOutput = z.infer<typeof GetTourismNewsOutputSchema>;

export async function getTourismNews(): Promise<GetTourismNewsOutput> {
  return getTourismNewsFlow();
}

const prompt = ai.definePrompt({
  name: 'getTourismNewsPrompt',
  output: { schema: GetTourismNewsOutputSchema },
  prompt: `You are a travel news editor. Provide a concise summary of the top 3-4 trending topics in the world of tourism and travel for today. 
  
  Structure your response with the following format:
  - Use '###' for category headlines (e.g., ### Airline Updates, ### New Destination Openings).
  - Use a short paragraph for each news item.
  - Make key phrases or destinations **bold**.
  
  Generate fresh, interesting, and relevant news as if you were writing for a travel blog. Do not include dates.`,
});

const getTourismNewsFlow = ai.defineFlow(
  {
    name: 'getTourismNewsFlow',
    outputSchema: GetTourismNewsOutputSchema,
  },
  async () => {
    const { output } = await prompt();
    return output!;
  }
);
