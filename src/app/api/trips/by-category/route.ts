import { NextRequest, NextResponse } from 'next/server';

const SERPAPI_KEY = process.env.SERPAPI_KEY || "655bf6eb32c0653cbe4f02b961f452e38e2c16d4a5a3873a375ca3f72cfaf2fc";

interface TripCategory {
  id: string;
  name: string;
  description: string;
  query: string;
  icon?: string;
}

const tripCategories: Record<string, TripCategory> = {
  friends: {
    id: 'friends',
    name: '👥 Friends Trips',
    description: 'Group adventures with friends',
    query: 'best group trip destinations for friends adventure and fun',
    icon: '👥'
  },
  solo: {
    id: 'solo',
    name: '🧳 Solo Running Way',
    description: 'Solo travel & self-discovery',
    query: 'best solo travel destinations for backpackers',
    icon: '🧳'
  },
  peace: {
    id: 'peace',
    name: '🧘 Peace & Relaxation',
    description: 'Peaceful retreats and calm places',
    query: 'most peaceful and relaxing travel destinations for meditation',
    icon: '🧘'
  },
  temples: {
    id: 'temples',
    name: '🛕 Temples & Spirituality',
    description: 'Spiritual and religious sites',
    query: 'most important temples and religious pilgrimage sites worldwide',
    icon: '🛕'
  },
  adventure: {
    id: 'adventure',
    name: '🏔️ Adventure',
    description: 'Thrilling outdoor experiences',
    query: 'best adventure travel destinations for extreme sports',
    icon: '🏔️'
  },
  beach: {
    id: 'beach',
    name: '🏖️ Beach Getaways',
    description: 'Coastal escapes and beach resorts',
    query: 'best beach destinations for vacation and relaxation',
    icon: '🏖️'
  }
};

// Placeholder image URLs for each category - using valid Unsplash image IDs
const categoryImages: Record<string, string[]> = {
  friends: [
    'https://images.unsplash.com/photo-1552832860-cfcddc32be86?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  ],
  solo: [
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1501126613377-2b072b97faae?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1488872657612-192a60718cb4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1512757776214-26d36777b513?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1516426122078-c23e76319801?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  ],
  peace: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1495612519256-cd40320b8f85?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1439066615861-d1af74d74000?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  ],
  temples: [
    'https://images.unsplash.com/photo-1548013146-72d440649117?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1586762200536-8e23a3a5a948?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1618654377451-92b57e5db6c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1569163139394-de4798aa62b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1548013146-72d440649117?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1586762200536-8e23a3a5a948?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  ],
  adventure: [
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1551085254-e96b210db58a?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1541625602330-2277a4647d6d?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  ],
  beach: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1528992291531-62f47440d133?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1473590331182-a0aa67b46fe4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1528992291531-62f47440d133?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60',
  ]
};

// Mock trip data for each category
const mockTrips: Record<string, any[]> = {
  friends: [
    {
      id: 'friends-1',
      title: 'Goa Beach Party Bash',
      destination: 'Goa, India',
      duration: '4 Days',
      budget: '₹15,000 - ₹25,000',
      rating: 4.7,
      reviews: 2450,
      description: 'Perfect for group activities, beach parties, water sports, and nightlife with friends.',
      category: 'friends',
      activities: ['Water Sports', 'Beach Party', 'Nightlife', 'Group Dining']
    },
    {
      id: 'friends-2',
      title: 'Jaipur City Adventure',
      destination: 'Jaipur, India',
      duration: '3 Days',
      budget: '₹12,000 - ₹20,000',
      rating: 4.6,
      reviews: 1890,
      description: 'Heritage sites, group tours, local markets, and camel rides in the pink city.',
      category: 'friends',
      activities: ['Heritage Tours', 'Shopping', 'Camel Ride', 'Local Cuisine']
    },
    {
      id: 'friends-3',
      title: 'Shimla Hill Station Gang',
      destination: 'Shimla, India',
      duration: '5 Days',
      budget: '₹18,000 - ₹28,000',
      rating: 4.8,
      reviews: 3120,
      description: 'Mountain views, adventure sports, group trekking, and cozy bonfire nights.',
      category: 'friends',
      activities: ['Trekking', 'Adventure Sports', 'Bonfire', 'Photography']
    },
    {
      id: 'friends-4',
      title: 'Kerala Backwater Cruise',
      destination: 'Kerala, India',
      duration: '4 Days',
      budget: '₹20,000 - ₹35,000',
      rating: 4.9,
      reviews: 4560,
      description: 'Houseboat adventure, group river cruises, and backwater exploration.',
      category: 'friends',
      activities: ['Houseboat', 'Cruise', 'Beach', 'Water Sports']
    }
  ],
  solo: [
    {
      id: 'solo-1',
      title: 'Bangalore Tech City',
      destination: 'Bangalore, India',
      duration: '3 Days',
      budget: '₹8,000 - ₹15,000',
      rating: 4.5,
      reviews: 2100,
      description: 'Tech culture, cafes, startup ecosystem, and networking events for solo travelers.',
      category: 'solo',
      activities: ['Coworking Spaces', 'Cafes', 'Networking', 'Tech Museums']
    },
    {
      id: 'solo-2',
      title: 'Rishikesh Yoga Retreat',
      destination: 'Rishikesh, India',
      duration: '5 Days',
      budget: '₹10,000 - ₹18,000',
      rating: 4.8,
      reviews: 3890,
      description: 'Yoga classes, meditation, river walks, and spiritual exploration.',
      category: 'solo',
      activities: ['Yoga', 'Meditation', 'Hiking', 'Spiritual Talks']
    },
    {
      id: 'solo-3',
      title: 'Vagabond Jodhpur',
      destination: 'Jodhpur, India',
      duration: '3 Days',
      budget: '₹7,000 - ₹12,000',
      rating: 4.6,
      reviews: 1650,
      description: 'Blue city exploration, heritage walks, and hostels for solo backpackers.',
      category: 'solo',
      activities: ['Heritage Walk', 'Photography', 'Local Markets', 'Hostels']
    },
    {
      id: 'solo-4',
      title: 'Darjeeling Tea Trails',
      destination: 'Darjeeling, India',
      duration: '4 Days',
      budget: '₹9,000 - ₹16,000',
      rating: 4.7,
      reviews: 2340,
      description: 'Tea plantations, mountain views, trains, and peaceful hiking for solo adventurers.',
      category: 'solo',
      activities: ['Tea Estate Tours', 'Hiking', 'Train Rides', 'Photography']
    }
  ],
  peace: [
    {
      id: 'peace-1',
      title: 'Kerala Ayurveda Retreat',
      destination: 'Kerala, India',
      duration: '7 Days',
      budget: '₹35,000 - ₹60,000',
      rating: 4.9,
      reviews: 5670,
      description: 'Ayurveda spa treatments, yoga, nature walks, and complete wellness.',
      category: 'peace',
      activities: ['Ayurveda', 'Yoga', 'Meditation', 'Nature Walks']
    },
    {
      id: 'peace-2',
      title: 'Ooty Misty Mountains',
      destination: 'Ooty, India',
      duration: '3 Days',
      budget: '₹12,000 - ₹20,000',
      rating: 4.7,
      reviews: 2890,
      description: 'Peaceful hill station, botanical gardens, and serene lake views.',
      category: 'peace',
      activities: ['Nature Walks', 'Botanical Gardens', 'Lake Views', 'Photography']
    },
    {
      id: 'peace-3',
      title: 'Munnar Tea Tranquility',
      destination: 'Munnar, India',
      duration: '4 Days',
      budget: '₹15,000 - ₹25,000',
      rating: 4.8,
      reviews: 4120,
      description: 'Tea gardens, mist-covered hills, and peaceful mountain retreat.',
      category: 'peace',
      activities: ['Tea Tours', 'Hiking', 'Photography', 'Relaxation']
    },
    {
      id: 'peace-4',
      title: 'Gokarna Beach Bliss',
      destination: 'Gokarna, India',
      duration: '4 Days',
      budget: '₹10,000 - ₹18,000',
      rating: 4.6,
      reviews: 1950,
      description: 'Quiet beach town, hippie culture, and peaceful vibes.',
      category: 'peace',
      activities: ['Beach Walks', 'Meditation', 'Yoga', 'Local Cafes']
    }
  ],
  temples: [
    {
      id: 'temples-1',
      title: 'Varanasi Spiritual Journey',
      destination: 'Varanasi, India',
      duration: '3 Days',
      budget: '₹8,000 - ₹15,000',
      rating: 4.8,
      reviews: 6780,
      description: 'Holy ghats, temple visits, Ganga Aarti, and spiritual awakening.',
      category: 'temples',
      activities: ['Temple Tours', 'Ghat Visits', 'Meditation', 'River Cruises']
    },
    {
      id: 'temples-2',
      title: 'Tirupati Pilgrimage',
      destination: 'Tirupati, India',
      duration: '2 Days',
      budget: '₹5,000 - ₹10,000',
      rating: 4.9,
      reviews: 8900,
      description: 'Famous Tirupati Temple, darshan, and spiritual rituals.',
      category: 'temples',
      activities: ['Temple Darshan', 'Religious Rituals', 'Pilgrimage']
    },
    {
      id: 'temples-3',
      title: 'Khajuraho Temple Trail',
      destination: 'Khajuraho, India',
      duration: '2 Days',
      budget: '₹6,000 - ₹12,000',
      rating: 4.7,
      reviews: 3450,
      description: 'UNESCO temples, intricate architecture, and historical exploration.',
      category: 'temples',
      activities: ['Temple Tours', 'Photography', 'Historical Sites']
    },
    {
      id: 'temples-4',
      title: 'Haridwar Holy City',
      destination: 'Haridwar, India',
      duration: '3 Days',
      budget: '₹7,000 - ₹13,000',
      rating: 4.6,
      reviews: 4230,
      description: 'Sacred temples, Ghat experiences, and holy ceremonies.',
      category: 'temples',
      activities: ['Temple Visits', 'Ghat Tours', 'Yoga', 'Meditation']
    }
  ],
  adventure: [
    {
      id: 'adventure-1',
      title: 'Ladakh Motorcycle Tour',
      destination: 'Ladakh, India',
      duration: '6 Days',
      budget: '₹25,000 - ₹40,000',
      rating: 4.9,
      reviews: 5230,
      description: 'High altitude biking, scenic routes, and extreme adventures.',
      category: 'adventure',
      activities: ['Motorcycle Touring', 'Mountain Passes', 'Photography']
    },
    {
      id: 'adventure-2',
      title: 'Himalayan Trekking',
      destination: 'Himalayas, India',
      duration: '7 Days',
      budget: '₹20,000 - ₹35,000',
      rating: 4.8,
      reviews: 4120,
      description: 'Mountain trekking, alpine meadows, and high altitude camping.',
      category: 'adventure',
      activities: ['Trekking', 'Camping', 'Rock Climbing', 'Mountain Sports']
    },
    {
      id: 'adventure-3',
      title: 'Paragliding Paradise',
      destination: 'Bir-Billing, India',
      duration: '3 Days',
      budget: '₹12,000 - ₹22,000',
      rating: 4.7,
      reviews: 2890,
      description: 'Paragliding, aerial views, and extreme sports.',
      category: 'adventure',
      activities: ['Paragliding', 'Hiking', 'Photography']
    },
    {
      id: 'adventure-4',
      title: 'Rafting & Canyoning',
      destination: 'Manali, India',
      duration: '4 Days',
      budget: '₹15,000 - ₹28,000',
      rating: 4.6,
      reviews: 3560,
      description: 'River rafting, canyon exploration, and water adventures.',
      category: 'adventure',
      activities: ['Rafting', 'Canyoning', 'Hiking', 'Water Sports']
    }
  ],
  beach: [
    {
      id: 'beach-1',
      title: 'Maldives Paradise Island',
      destination: 'Maldives',
      duration: '5 Days',
      budget: '₹80,000 - ₹150,000',
      rating: 4.9,
      reviews: 12340,
      description: 'Luxury resorts, crystal clear waters, and underwater adventures.',
      category: 'beach',
      activities: ['Snorkeling', 'Diving', 'Island Tours', 'Water Sports']
    },
    {
      id: 'beach-2',
      title: 'Andaman Island Hopping',
      destination: 'Andaman, India',
      duration: '5 Days',
      budget: '₹25,000 - ₹45,000',
      rating: 4.8,
      reviews: 6780,
      description: 'Multiple islands, snorkeling, and beach exploration.',
      category: 'beach',
      activities: ['Island Tours', 'Snorkeling', 'Water Sports', 'Beaches']
    },
    {
      id: 'beach-3',
      title: 'Lakshadweep Coral Reefs',
      destination: 'Lakshadweep, India',
      duration: '4 Days',
      budget: '₹30,000 - ₹50,000',
      rating: 4.7,
      reviews: 3450,
      description: 'Pristine beaches, coral reefs, and marine life exploration.',
      category: 'beach',
      activities: ['Diving', 'Snorkeling', 'Beach Time', 'Photography']
    },
    {
      id: 'beach-4',
      title: 'Thailand Beach Escape',
      destination: 'Phuket, Thailand',
      duration: '5 Days',
      budget: '₹35,000 - ₹65,000',
      rating: 4.8,
      reviews: 8900,
      description: 'Tropical beaches, water activities, and island parties.',
      category: 'beach',
      activities: ['Island Tours', 'Water Sports', 'Nightlife', 'Beaches']
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category') || 'friends';
    const useGoogle = searchParams.get('google') !== 'false'; // Enable Google API by default

    const categoryInfo = tripCategories[categoryId] || tripCategories.friends;

    // Try to fetch real recommendations from SerpAPI
    if (useGoogle && SERPAPI_KEY) {
      try {
        const trips = await fetchSerpAPIRecommendations(categoryInfo);
        if (trips && trips.length > 0) {
          return NextResponse.json({
            success: true,
            category: categoryId,
            trips,
            categories: Object.values(tripCategories),
            source: 'serpapi'
          });
        }
      } catch (serpapiError) {
        console.error('SerpAPI fetch failed, falling back to mock data:', serpapiError);
        // Fall back to mock data on error
      }
    }

    // Fallback: Use mock data
    const trips = mockTrips[categoryId] || mockTrips.friends;
    const images = categoryImages[categoryId] || categoryImages.friends;

    const tripsWithImages = trips.map((trip, index) => ({
      ...trip,
      image: images[index % images.length]
    }));

    return NextResponse.json({
      success: true,
      category: categoryId,
      trips: tripsWithImages,
      categories: Object.values(tripCategories),
      source: 'mock'
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trips', success: false },
      { status: 500 }
    );
  }
}

/**
 * Fetch real trip recommendations from SerpAPI
 */
async function fetchSerpAPIRecommendations(category: TripCategory): Promise<any[]> {
  try {
    const searchQuery = category.query;
    
    const response = await fetch(
      `https://serpapi.com/search?q=${encodeURIComponent(searchQuery)}&api_key=${SERPAPI_KEY}&num=6`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('SerpAPI error:', response.status, errorData);
      return [];
    }

    const data = await response.json();

    // Handle organic search results
    if (data.organic_results && Array.isArray(data.organic_results) && data.organic_results.length > 0) {
      return data.organic_results.slice(0, 6).map((result: any, index: number) => ({
        id: `${category.id}-serpapi-${index}`,
        title: result.title || 'Trending Destination',
        destination: extractDestinationFromTitle(result.title || ''),
        duration: '5 Days',
        budget: estimateBudget(category.id),
        rating: 4.5 + Math.random() * 0.5,
        reviews: 1000 + Math.floor(Math.random() * 5000),
        description: result.snippet || 'Amazing travel experience',
        category: category.id,
        activities: getActivitiesForCategory(category.id),
        image: getCategoryImage(category.id, index),
        url: result.link,
        isSerpAPI: true
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching from SerpAPI:', error);
    return [];
  }
}

/**
 * Get category-specific search queries for Google Search API
 */
function getCategorySearchQueries(categoryId: string): string[] {
  // This is kept for backward compatibility but not used with Google API
  const queries: Record<string, string[]> = {
    'friends': [
      'best group trip destinations for friends adventure 2024',
      'trending destinations for friend groups travel',
      'fun adventure destinations for groups'
    ],
    'solo': [
      'best solo travel destinations for backpackers 2024',
      'safe solo travel destinations',
      'budget backpacker destinations'
    ],
    'peace': [
      'peaceful relaxing travel destinations meditation 2024',
      'best yoga retreat destinations',
      'calm serene vacation destinations'
    ],
    'temples': [
      'best temple destinations pilgrimage sites 2024',
      'important temples spiritual travel',
      'famous religious sites worldwide'
    ],
    'adventure': [
      'best adventure travel destinations extreme sports 2024',
      'trekking hiking mountain destinations',
      'adventure sports travel locations'
    ],
    'beach': [
      'best beach resort destinations 2024',
      'tropical island vacation spots',
      'top beach destinations for travel'
    ]
  };

  return queries[categoryId] || queries['friends'];
}

/**
 * Extract destination name from title
 */
function extractDestinationFromTitle(title: string): string {
  // Simple extraction - try to find city/country pattern
  const words = title.split(/[,\s-]+/);
  return words.slice(-2).join(', ') || title.substring(0, 30);
}

/**
 * Estimate budget based on category
 */
function estimateBudget(categoryId: string): string {
  const budgets: Record<string, string> = {
    'friends': '₹25,000 - ₹45,000',
    'solo': '₹15,000 - ₹35,000',
    'peace': '₹20,000 - ₹40,000',
    'temples': '₹20,000 - ₹40,000',
    'adventure': '₹30,000 - ₹60,000',
    'beach': '₹25,000 - ₹50,000'
  };
  return budgets[categoryId] || '₹20,000 - ₹40,000';
}

/**
 * Get activities for category
 */
function getActivitiesForCategory(categoryId: string): string[] {
  const activities: Record<string, string[]> = {
    'friends': ['Group Activities', 'Nightlife', 'Adventure Sports', 'Local Culture'],
    'solo': ['Self-Discovery', 'Local Markets', 'Backpacking', 'Cultural Sites'],
    'peace': ['Meditation', 'Yoga', 'Nature Walks', 'Spa & Wellness'],
    'temples': ['Temple Tours', 'Spiritual Practices', 'Photography', 'Cultural Learning'],
    'adventure': ['Trekking', 'Water Sports', 'Rock Climbing', 'Extreme Activities'],
    'beach': ['Swimming', 'Water Sports', 'Beach Activities', 'Relaxation']
  };
  return activities[categoryId] || ['Sightseeing', 'Local Culture', 'Food Tour', 'Adventure'];
}

/**
 * Get a real image URL for the destination based on category
 */
function getCategoryImage(categoryId: string, index: number): string {
  const categoryImages: Record<string, string[]> = {
    friends: [
      'https://images.unsplash.com/photo-1552832860-cfcddc32be86?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551085254-e96b210db58a?w=500&h=400&fit=crop',
    ],
    solo: [
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1501126613377-2b072b97faae?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1488872657612-192a60718cb4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1512757776214-26d36777b513?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1502044695114-a21217c1a57b?w=500&h=400&fit=crop',
    ],
    peace: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1495612519256-cd40320b8f85?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1509017776751-fc653f88eade?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1474540412665-1cdae210236f?w=500&h=400&fit=crop',
    ],
    temples: [
      'https://images.unsplash.com/photo-1548013146-72d440649117?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1586762200536-8e23a3a5a948?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1618654377451-92b57e5db6c0?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1569163139394-de4798aa62b0?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1433086720283-50416fe59761?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
    ],
    adventure: [
      'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551085254-e96b210db58a?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1541625602330-2277a4647d6d?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1511497584788-876760111969?w=500&h=400&fit=crop',
    ],
    beach: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1528992291531-62f47440d133?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1473590331182-a0aa67b46fe4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=400&fit=crop',
    ]
  };

  const images = categoryImages[categoryId] || categoryImages.friends;
  return images[index % images.length];
}
