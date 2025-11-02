import { z } from 'zod';

export type DayPlan = {
  day: number;
  description: string;
  cost: number;
};

export type Itinerary = {
  id: string;
  dailyPlans: DayPlan[];
  totalPrice: number;
  originalResponse: string;
};

export const TripRecommendationSchema = z.object({
  destination: z.string().describe('The recommended city and country.'),
  description: z.string().describe('A brief, compelling description of why this destination is a great choice for the specified climate.'),
});
export type TripRecommendation = z.infer<typeof TripRecommendationSchema>;
