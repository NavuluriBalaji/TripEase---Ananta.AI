import { config } from 'dotenv';
config();

import '@/ai/flows/generate-personalized-itinerary.ts';
import '@/ai/flows/provide-feedback-to-refine-itinerary.ts';
import '@/ai/flows/get-trip-recommendations.ts';
import '@/ai/flows/get-tourism-news.ts';
import '@/ai/flows/generate-packing-list.ts';
import '@/ai/flows/find-local-cuisine.ts';
