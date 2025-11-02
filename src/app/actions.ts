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
import { analyzeIntentAndQuestions, AnalyzeInput } from '@/ai/flows/analyze-intent-and-questions';
import { orchestrateTripPlan, OrchestrateInput } from '@/ai/flows/orchestrate-trip-plan';
import { callAdkPlanner, type AdkConversationTurn } from '@/lib/adkClient';
import { sendBookingEmail } from '@/lib/mailer';

function toIsoIfDate(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date && !isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  return undefined;
}

export async function generateItineraryAction(
  input: any
) {
  try {
    const normalized = {
      ...input,
      checkInDate: toIsoIfDate(input?.checkInDate),
      checkOutDate: toIsoIfDate(input?.checkOutDate),
    } as GeneratePersonalizedItineraryInput;
    const result = await generatePersonalizedItinerary(normalized);
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

export async function analyzeQueryAction(input: AnalyzeInput) {
  try {
    const result = await analyzeIntentAndQuestions(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to analyze query.' };
  }
}

export async function orchestrateTripPlanAction(input: OrchestrateInput) {
  try {
    // Prefer external ADK if available, but only if we have the basics
    const hasBasics = !!(input.destination && typeof input.durationDays === 'number' && isFinite(input.durationDays) && input.durationDays > 0);
    if (hasBasics) {
      const conv: AdkConversationTurn[] = [
        { role: 'user', content: `Plan a trip: ${input.destination}, ${input.durationDays} days.` },
      ];
      const adk = await callAdkPlanner({ conversation: conv, context: input as any });
      // If ADK produced a plan, return it; otherwise fall through to our orchestrator instead of surfacing questions
      if (adk.status === 'ok' && adk.plan) {
        return { success: true, data: adk };
      }
    }
  } catch (e) {
    console.warn('ADK not available, falling back to Genkit orchestrator');
  }
  try {
    const result = await orchestrateTripPlan(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to orchestrate trip plan.' };
  }
}

export async function mockInitiatePaymentAction(amountUsd: number) {
  // Non-mandatory mock payment
  await new Promise(r => setTimeout(r, 400));
  return { success: true, data: { status: 'mock_confirmed', amountUsd } };
}

// ---- Mock Checkout / Payment + Email ----
export type CheckoutItem = {
  category: 'flight' | 'hotel' | 'car';
  description: string; // free text label like airline & times, hotel name & room, car type
  unitPriceUsd: number; // per ticket/night/day
  quantity?: number; // tickets/nights/days
};

export type ProcessCheckoutInput = {
  email: string;
  name?: string;
  currency?: 'USD';
  items: CheckoutItem[];
};

export async function processCheckoutAction(input: ProcessCheckoutInput) {
  'use server';
  try {
    // Basic validation
    if (!input?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      return { success: false, error: 'A valid email is required.' };
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { success: false, error: 'Please add at least one item (flight, hotel, or car).' };
    }
    const normalized = input.items.map((it) => ({
      category: it.category,
      description: String(it.description || '').slice(0, 300),
      unitPriceUsd: Number(it.unitPriceUsd) || 0,
      quantity: Math.max(1, Number(it.quantity) || 1),
    }));

    const totals = normalized.reduce(
      (acc, it) => {
        const line = it.unitPriceUsd * (it.quantity || 1);
        acc.subtotal += line;
        acc.byCategory[it.category] = (acc.byCategory[it.category] || 0) + line;
        return acc;
      },
      { subtotal: 0, byCategory: {} as Record<string, number> }
    );

    // Mock tax/fees
    const serviceFee = Math.round(totals.subtotal * 0.025 * 100) / 100; // 2.5%
    const taxes = Math.round(totals.subtotal * 0.08 * 100) / 100; // 8%
    const total = Math.round((totals.subtotal + serviceFee + taxes) * 100) / 100;

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 600));
    const paymentId = 'pay_' + Math.random().toString(36).slice(2, 10);
    const status: 'succeeded' | 'failed' = 'succeeded';

    // Build email
    const subject = `Your TripEase booking confirmation (${paymentId})`;
    const lines = normalized
      .map(
        (it) => `- [${it.category.toUpperCase()}] ${it.description} — $${it.unitPriceUsd.toFixed(2)} x ${it.quantity} = $${(
          it.unitPriceUsd * (it.quantity || 1)
        ).toFixed(2)}`
      )
      .join('\n');

    const text = [
      `Hi ${input.name || 'Traveler'},`,
      '',
      'Thanks for booking with TripEase. Here is your confirmation:',
      '',
      lines,
      '',
      `Subtotal:₹${totals.subtotal.toFixed(2)}`,
      `Service fee (2.5%): ₹${serviceFee.toFixed(2)}`,
      `Taxes (8%): ₹${taxes.toFixed(2)}`,
      `Total charged: $${total.toFixed(2)}`,
      '',
      `Payment ID: ₹{paymentId}`,
      'Status: succeeded',
      '',
      'Safe travels and have an amazing trip!\n— TripEase Team',
    ].join('\n');

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#111">
        <h2>Thanks for your booking, ${input.name || 'Traveler'}!</h2>
        <p>Here is your confirmation:</p>
        <ul>
          ${normalized
            .map(
              (it) => `<li><strong>[${it.category.toUpperCase()}]</strong> ${
                it.description
              } — $${it.unitPriceUsd.toFixed(2)} × ${it.quantity} = <strong>$${(
                it.unitPriceUsd * (it.quantity || 1)
              ).toFixed(2)}</strong></li>`
            )
            .join('')}
        </ul>
        <p>
          Subtotal: <strong>$${totals.subtotal.toFixed(2)}</strong><br/>
          Service fee (2.5%): <strong>$${serviceFee.toFixed(2)}</strong><br/>
          Taxes (8%): <strong>$${taxes.toFixed(2)}</strong><br/>
          <span style="font-size:1.1em">Total charged: <strong>$${total.toFixed(2)}</strong></span>
        </p>
        <p>
          Payment ID: <code>${paymentId}</code><br/>
          Status: <strong>${status}</strong>
        </p>
        <p>Safe travels and have an amazing trip!<br/>— TripEase Team</p>
      </div>
    `;

    const mailResult = await sendBookingEmail(input.email, subject, html, text);

    return {
      success: true,
      data: {
        paymentId,
        status,
        charges: { subtotal: totals.subtotal, serviceFee, taxes, total },
        email: { sent: mailResult.success, transport: mailResult.transport, filePath: mailResult.filePath },
      },
    };
  } catch (error) {
    console.error('processCheckoutAction error', error);
    return { success: false, error: 'Failed to process checkout.' };
  }
}
