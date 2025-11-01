import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

    if (!googleApiKey) {
      console.warn('Google Places API key not configured. Returning mock data.');
      // Return mock data if API key is not configured
      return NextResponse.json({
        places: [
          {
            id: 1,
            name: 'Local Café & Restaurant',
            type: 'restaurant',
            latitude: latitude + 0.001,
            longitude: longitude + 0.001,
            rating: 4.5,
            distance: 0.5,
            address: 'Near your location',
            icon: '🍽️',
          },
          {
            id: 2,
            name: 'Adventure Park',
            type: 'park',
            latitude: latitude + 0.005,
            longitude: longitude - 0.002,
            rating: 4.7,
            distance: 2.1,
            address: 'Nearby outdoor recreation',
            icon: '🎢',
          },
          {
            id: 3,
            name: 'Historic Museum',
            type: 'museum',
            latitude: latitude - 0.003,
            longitude: longitude + 0.004,
            rating: 4.3,
            distance: 1.8,
            address: 'Cultural landmark',
            icon: '🏛️',
          },
          {
            id: 4,
            name: 'Shopping Mall',
            type: 'shopping',
            latitude: latitude + 0.002,
            longitude: longitude - 0.003,
            rating: 4.2,
            distance: 1.2,
            address: 'Retail & Entertainment',
            icon: '🛍️',
          },
          {
            id: 5,
            name: 'Beach Resort',
            type: 'beach',
            latitude: latitude - 0.005,
            longitude: longitude + 0.006,
            rating: 4.8,
            distance: 3.5,
            address: 'Scenic waterfront',
            icon: '🏖️',
          },
        ],
      });
    }

    // Call Google Places API
    const radius = 5000; // 5km radius
    const types = 'tourist_attraction|restaurant|park|museum|hotel|shopping_mall|beach';

    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${types}&key=${googleApiKey}`;

    const response = await fetch(placesUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.warn('Google Places API error:', data.error_message);
      // Return mock data on API error
      return NextResponse.json({
        places: [
          {
            id: 1,
            name: 'Local Café & Restaurant',
            type: 'restaurant',
            latitude: latitude + 0.001,
            longitude: longitude + 0.001,
            rating: 4.5,
            distance: 0.5,
            address: 'Near your location',
            icon: '🍽️',
          },
          {
            id: 2,
            name: 'Adventure Park',
            type: 'park',
            latitude: latitude + 0.005,
            longitude: longitude - 0.002,
            rating: 4.7,
            distance: 2.1,
            address: 'Nearby outdoor recreation',
            icon: '🎢',
          },
          {
            id: 3,
            name: 'Historic Museum',
            type: 'museum',
            latitude: latitude - 0.003,
            longitude: longitude + 0.004,
            rating: 4.3,
            distance: 1.8,
            address: 'Cultural landmark',
            icon: '🏛️',
          },
          {
            id: 4,
            name: 'Shopping Mall',
            type: 'shopping',
            latitude: latitude + 0.002,
            longitude: longitude - 0.003,
            rating: 4.2,
            distance: 1.2,
            address: 'Retail & Entertainment',
            icon: '🛍️',
          },
          {
            id: 5,
            name: 'Beach Resort',
            type: 'beach',
            latitude: latitude - 0.005,
            longitude: longitude + 0.006,
            rating: 4.8,
            distance: 3.5,
            address: 'Scenic waterfront',
            icon: '🏖️',
          },
        ],
      });
    }

    // Format results
    const places = data.results.slice(0, 6).map((place: any, index: number) => {
      const icons = ['🍽️', '🎢', '🏛️', '🛍️', '🏖️', '✨'];
      const distance = Math.random() * 5; // Mock distance for demo

      return {
        id: place.place_id,
        name: place.name,
        type: place.types[0] || 'attraction',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        rating: place.rating || 4.0,
        distance: parseFloat(distance.toFixed(1)),
        address: place.vicinity || place.formatted_address || '',
        icon: icons[index] || '✨',
      };
    });

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Error in nearby-places API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
