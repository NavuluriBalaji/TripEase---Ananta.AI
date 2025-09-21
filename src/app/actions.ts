'use server';

import {
  generatePersonalizedItinerary,
  GeneratePersonalizedItineraryInput,
} from '@/ai/flows/generate-personalized-itinerary';
import {
  provideFeedbackToRefineItinerary,
  ProvideFeedbackToRefineItineraryInput,
} from '@/ai/flows/provide-feedback-to-refine-itinerary';
import { 
  getTripRecommendations,
} from '@/ai/flows/get-trip-recommendations';
import type { GetTripRecommendationsInput } from '@/ai/flows/get-trip-recommendations';
import { getTourismNews } from '@/ai/flows/get-tourism-news';
import {
  generatePackingList,
  GeneratePackingListInput
} from '@/ai/flows/generate-packing-list';
import { 
  findLocalCuisine,
  FindLocalCuisineInput
} from '@/ai/flows/find-local-cuisine';


export async function generateItineraryAction(
  input: GeneratePersonalizedItineraryInput
) {
  try {
    const result = await generatePersonalizedItinerary(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate itinerary. Please try again.' };
  }
}

export async function refineItineraryAction(
  input: ProvideFeedbackToRefineItineraryInput
) {
  try {
    const result = await provideFeedbackToRefineItinerary(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to refine itinerary. Please try again.' };
  }
}

export async function getTripRecommendationsAction(input: GetTripRecommendationsInput) {
  try {
    const result = await getTripRecommendations(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to get recommendations.' };
  }
}

export async function getTourismNewsAction() {
  try {
    const result = await getTourismNews();
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to get tourism news.' };
  }
}

export async function generatePackingListAction(input: GeneratePackingListInput) {
    try {
        const result = await generatePackingList(input);
        return { success: true, data: result };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to generate packing list.' };
    }
}

export async function findLocalCuisineAction(input: FindLocalCuisineInput) {
    try {
        const result = await findLocalCuisine(input);
        return { success: true, data: result };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to get cuisine recommendations.' };
    }
}
