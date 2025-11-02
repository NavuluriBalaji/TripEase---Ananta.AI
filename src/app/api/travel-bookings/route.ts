import { NextRequest, NextResponse } from 'next/server';
import { fetchTravelBookings, sanitizeTravelBookingData } from '@/lib/travelBookingService';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds timeout for scraping

/**
 * POST /api/travel-bookings
 * Fetches travel booking data from various providers
 * Body: { origin: string, destination: string, date?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { origin, destination, date, hotelsCity, rentalsCity, guidesCity } = body as {
      origin?: string;
      destination?: string;
      date?: string;
      hotelsCity?: string;
      rentalsCity?: string;
      guidesCity?: string;
    };

    // Validate inputs
    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    // Fetch all travel bookings, allowing optional city overrides for specific providers
  const raw = await fetchTravelBookings(origin, destination, date, { hotelsCity, rentalsCity, guidesCity });
  const data = sanitizeTravelBookingData(raw);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes
      },
    });
  } catch (error) {
    console.error('Error in travel bookings API:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch travel bookings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/travel-bookings
 * For debugging or quick access
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const date = searchParams.get('date');
    const hotelsCity = searchParams.get('hotelsCity') || undefined;
    const rentalsCity = searchParams.get('rentalsCity') || undefined;
    const guidesCity = searchParams.get('guidesCity') || undefined;

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required as query parameters' },
        { status: 400 }
      );
    }

  const raw = await fetchTravelBookings(origin, destination, date || undefined, { hotelsCity, rentalsCity, guidesCity });
  const data = sanitizeTravelBookingData(raw);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in travel bookings API:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch travel bookings',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
