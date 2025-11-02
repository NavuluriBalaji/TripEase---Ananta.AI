import { NextRequest, NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.SERPAPI_KEY || "655bf6eb32c0653cbe4f02b961f452e38e2c16d4a5a3873a375ca3f72cfaf2fc";

/**
 * SerpAPI-based trip planning endpoint
 * Searches for trip information and generates itineraries
 */
export async function POST(request: NextRequest) {
  try {
    const { tripTitle, destination, duration, category, interests, budget } = await request.json();

    if (!tripTitle || !destination) {
      return NextResponse.json(
        { error: 'Missing required fields: tripTitle and destination' },
        { status: 400 }
      );
    }

    if (!SERPAPI_KEY) {
      return NextResponse.json(
        { error: 'SerpAPI key not configured' },
        { status: 500 }
      );
    }

    // Generate search queries for trip planning
    const tripPlanQueries = [
      `${duration}-day itinerary for ${category} trip to ${destination}`,
      `Best attractions and activities in ${destination}`,
      `Local transportation options in ${destination}`,
      `Best restaurants and local food in ${destination}`,
      `Safety and travel tips for ${destination}`
    ];

    // Search for trip information using Google Search API
    let allResults: any[] = [];
    
    for (const query of tripPlanQueries) {
      try {
        const response = await fetch(
          `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${SERPAPI_KEY}&num=3`,
          { method: 'GET' }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.organic_results) {
            allResults = [...allResults, ...data.organic_results];
          }
        }
      } catch (error) {
        console.error(`Error searching for query "${query}":`, error);
      }
    }

    // Build itinerary from search results
    const itinerary = {
      title: tripTitle,
      destination: destination,
      duration: duration,
      category: category,
      research: allResults.slice(0, 10),
      itinerary: generateItineraryFromSearchResults(duration, category),
      planning: formatSearchResults(allResults)
    };

    return NextResponse.json({
      success: true,
      itinerary: itinerary,
      rawResponse: formatSearchResults(allResults)
    });

  } catch (error) {
    console.error('Error planning trip with Perplexity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Generate itinerary structure from search results
 */
function generateItineraryFromSearchResults(duration: number, category: string): any[] {
  const activities: Record<string, string[]> = {
    'friends': ['Adventure', 'Nightlife', 'Group Activities', 'Local Culture'],
    'solo': ['Exploration', 'Local Markets', 'Cafes', 'Cultural Sites'],
    'peace': ['Meditation', 'Yoga', 'Nature', 'Relaxation'],
    'temples': ['Temple Tours', 'Spiritual', 'Photography', 'History'],
    'adventure': ['Trekking', 'Water Sports', 'Climbing', 'Extreme'],
    'beach': ['Swimming', 'Water Sports', 'Beach', 'Relaxation']
  };

  const categoryActivities = activities[category] || activities['friends'];
  const itinerary = [];

  for (let day = 1; day <= duration; day++) {
    itinerary.push({
      day: day,
      title: `Day ${day}`,
      activities: [categoryActivities[(day - 1) % categoryActivities.length]],
      morning: 'Breakfast and exploration',
      afternoon: 'Main activities',
      evening: 'Dinner and relaxation',
      estimatedCost: '₹1,500 - ₹2,500'
    });
  }

  return itinerary;
}

/**
 * Format search results for display
 */
function formatSearchResults(results: any[]): string {
  return results
    .map((result, index) => {
      return `${index + 1}. ${result.title}\n   ${result.snippet}\n   Link: ${result.link}\n`;
    })
    .join('\n');
}
