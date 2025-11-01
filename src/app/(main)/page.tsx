'use client';

import Image from 'next/image';
import { MapPin, Calendar, Users, TrendingUp, Loader, AlertCircle, CheckCircle, ExternalLink, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const { currentUser, userProfile } = useAuth();
  
  // Get user's display name or default to "Traveler"
  const userName = userProfile?.displayName || currentUser?.displayName || 'Traveler';

  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending' | 'prompt'>('prompt');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Mock data for dashboard stats
  const stats = [
    { label: 'Total Trips', value: 'Not Yet', icon: TrendingUp, color: 'from-blue-500 to-blue-600' },
    { label: 'Done', value: 'Not Yet', icon: MapPin, color: 'from-green-500 to-green-600' },
    { label: 'Booked', value: 'Not Yet', icon: Calendar, color: 'from-purple-500 to-purple-600' },
    { label: 'Cancelled', value: 'Not Yet', icon: Users, color: 'from-red-500 to-red-600' },
  ];

  // Mock upcoming trips with real coordinates
  const upcomingTrips = [
    {
      id: 1,
      title: 'The Quiet Side of Bali',
      description: 'Bali is Indonesian best travel destination',
      date: '14 Jun - 18 Jun',
      duration: '4 Days',
      image: 'https://images.unsplash.com/photo-1555400038-63f5ba517a47?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=1170?w=400&h=250&fit=crop',
      travelers: 3,
      destination: 'Bali, Indonesia',
      latitude: -8.6705,
      longitude: 115.2126,
    },
    {
      id: 2,
      title: 'Villa Borghese Gardens',
      description: 'A peaceful green space with an art gallery',
      date: '14 Aug - 18 Aug',
      duration: '4 Days',
      image: 'https://images.unsplash.com/photo-1552832860-cfcddc32be86?w=400&h=250&fit=crop',
      travelers: 2,
      destination: 'Rome, Italy',
      latitude: 41.9028,
      longitude: 12.4964,
    },
  ];

  // Function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Generate Google Maps link
  const generateMapsLink = (lat: number, lng: number, name: string) => {
    return `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lng},13z`;
  };

  // Fetch nearby places using Google Places API (via backend)
  const fetchNearbyLocations = async (latitude: number, longitude: number) => {
    setLoadingLocations(true);
    try {
      const response = await fetch('/api/nearby-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!response.ok) {
        // If API fails, use mock data
        console.warn('Failed to fetch from API, using mock data');
        const mockLocations = [
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
        ];
        setNearbyLocations(mockLocations);
        setLoadingLocations(false);
        return;
      }

      const data = await response.json();
      setNearbyLocations(data.places || []);
    } catch (error) {
      console.error('Error fetching nearby locations:', error);
      // Fallback to mock data on error
      const mockLocations = [
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
      ];
      setNearbyLocations(mockLocations);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Request geolocation permission and get user's location
  const requestLocationPermission = () => {
    setLocationError(null);
    setLocationPermission('pending');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationPermission('denied');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ latitude, longitude });
        setLocationPermission('granted');

        // Fetch nearby places from Google Places API
        fetchNearbyLocations(latitude, longitude);
      },
      (error) => {
        setLocationPermission('denied');
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Enable it in your browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Location information is unavailable.');
        } else if (error.code === error.TIMEOUT) {
          setLocationError('Request to get user location timed out.');
        } else {
          setLocationError('An unknown error occurred while retrieving location.');
        }
      }
    );
  };

  // Auto-request geolocation on component mount
  useEffect(() => {
    requestLocationPermission();
  }, []);

  // Mock done trips
  const doneTrips = [
    {
      id: 1,
      city: 'Berlin, Germany',
      date: '23 Jan - 02 Feb (2025)',
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=200&h=200&fit=crop',
    },
    {
      id: 2,
      city: 'New York, USA',
      date: '25 Aug - (2024)',
      image: 'https://images.unsplash.com/photo-1512453327778-5abe08e89000?w=200&h=200&fit=crop',
    },
    {
      id: 3,
      city: 'Athens, Greece',
      date: '22 Mar - 07 Mar (2024)',
      image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=200&h=200&fit=crop',
    },
  ];

  return (
    <div className="flex-1 overflow-auto bg-white p-8">
      {/* Header Section */}
      <div className="mb-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
          Good Morning, {userName}👋
        </h1>
        <p className="text-lg text-gray-600" style={{ fontFamily: 'Poppins, sans-serif' }}>Plan your itinerary with us</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-2 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-blue-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`bg-gradient-to-br ${stat.color} w-14 h-14 rounded-xl flex items-center justify-center shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column - Upcoming Trips */}
        <div className="lg:col-span-2">
          {/* Location Permission Status & Nearby Locations Section */}
          {locationPermission !== 'denied' && (
            <div className="mb-10 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {locationPermission === 'granted' ? (
                    <>
                      <CheckCircle className="h-6 w-6 text-green-600" />
                      <div>
                        <p className="text-base font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Location Enabled ✓
                        </p>
                        <p className="text-sm text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {loadingLocations ? 'Finding nearby attractions...' : 'Nearby places loaded'}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Loader className="h-6 w-6 text-blue-600 animate-spin" />
                      <div>
                        <p className="text-base font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Requesting Location...
                        </p>
                        <p className="text-sm text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Please allow access to find nearby attractions
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {locationPermission === 'granted' && !loadingLocations && (
                  <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {nearbyLocations.length} Nearby Attractions
                  </span>
                )}
              </div>

              {/* Nearby Locations Grid */}
              {locationPermission === 'granted' && nearbyLocations.length > 0 && !loadingLocations && (
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    🗺️ Nearby attractions to explore:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nearbyLocations.map((location: any) => {
                      const mapsLink = generateMapsLink(location.latitude, location.longitude, location.name);
                      return (
                        <Card key={location.id} className="bg-white border-0 hover:shadow-lg transition-all hover:-translate-y-1 shadow-md">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <span className="text-4xl">{location.icon}</span>
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold flex items-center gap-1">
                                <span>★</span> {location.rating}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              {location.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                              {location.address}
                            </p>
                            <div className="flex items-center gap-2 mb-4 text-sm text-blue-600 font-semibold">
                              <Navigation className="h-4 w-4" />
                              {location.distance} km away
                            </div>
                            <a
                              href={mapsLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full"
                            >
                              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                View on Maps
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {loadingLocations && (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-8 w-8 text-blue-600 animate-spin mr-3" />
                  <p className="text-gray-700 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Loading nearby attractions...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message Display */}
          {locationError && locationPermission === 'denied' && (
            <div className="mb-10 p-5 bg-red-50 rounded-xl border border-red-200 shadow-sm flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-base font-bold text-gray-900 mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Location Access Denied
                </p>
                <p className="text-sm text-gray-700 mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {locationError}
                </p>
                <Button
                  onClick={requestLocationPermission}
                  className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold h-8"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                Upcoming Trips
              </h2>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                See All
              </Button>
            </div>
            <p className="text-base text-gray-600 mb-6 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Remember your upcoming trips!
            </p>

            {/* Trip Cards */}
            <div className="space-y-5">
              {upcomingTrips.map((trip) => (
                <Card 
                  key={trip.id} 
                  className="bg-white border-0 overflow-hidden hover:shadow-xl transition-shadow shadow-md hover:-translate-y-1"
                >
                  <div className="flex">
                    <div className="w-44 h-36 relative flex-shrink-0">
                      <Image
                        src={trip.image}
                        alt={trip.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute top-3 right-3 bg-orange-500 text-white rounded-full w-9 h-9 flex items-center justify-center text-sm font-bold shadow-lg">
                        ✓
                      </div>
                    </div>
                    <CardContent className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                          {trip.title}
                        </h3>
                        <p className="text-gray-700 text-base mb-4 font-normal" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {trip.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 text-base font-medium text-gray-700" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          <span>{trip.date}</span>
                          <span>|</span>
                          <span>{trip.duration}</span>
                        </div>
                        <div className="flex -space-x-2">
                          {[...Array(trip.travelers)].map((_, i) => (
                            <div
                              key={i}
                              className="w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full border-2 border-white flex items-center justify-center text-xs text-white font-bold shadow-md"
                            >
                              U
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Group Trips and Done Trips */}
        <div className="space-y-8">
          {/* Group Trips */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                Group Trips
              </h2>
              <Button variant="ghost" className="text-blue-600 hover:bg-blue-100 font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                See All
              </Button>
            </div>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
              <CardContent className="p-5">
                <div className="relative h-44 mb-4">
                  <Image
                    src="https://images.unsplash.com/photo-1552862750-746b8f6f7f25?w=400&h=300&fit=crop"
                    alt="Thailand Group Trip"
                    fill
                    className="object-cover rounded-lg"
                  />
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                  Thailand
                </h3>
                <p className="text-sm text-gray-700 mb-4 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  10 Aug - 18 Aug (2025)
                </p>
                <div className="grid grid-cols-3 gap-3 text-sm text-center mb-4">
                  <div>
                    <p className="font-bold text-lg text-blue-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                      $1400
                    </p>
                    <p className="text-gray-700 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Budget</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-blue-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                      10
                    </p>
                    <p className="text-gray-700 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Members</p>
                  </div>
                  <div>
                    <p className="font-bold text-lg text-blue-600" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                      7D 6N
                    </p>
                    <p className="text-gray-700 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>Duration</p>
                  </div>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                  Book Now
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Done Trips */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                Done Trips
              </h2>
              <Button variant="ghost" className="text-blue-600 hover:bg-blue-100 font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                See All
              </Button>
            </div>
            <div className="space-y-3">
              {doneTrips.map((trip, index) => (
                <Card key={index} className="bg-white border-0 hover:shadow-lg transition-shadow shadow-md">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-16 h-16 relative flex-shrink-0">
                      <Image
                        src={trip.image}
                        alt={trip.city}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-base font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                          {trip.city}
                        </h4>
                        <p className="text-xs text-gray-600 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {trip.date}
                        </p>
                      </div>
                      {trip.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                            {trip.rating}
                          </span>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 text-sm text-blue-600 hover:bg-blue-50 font-semibold" 
                      style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600 }}
                    >
                      Rebook
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Discount Banner */}
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl p-5 shadow-lg">
            <p className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
              50% Discount!
            </p>
            <p className="text-sm text-white mb-4 font-medium" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Get a discount on certain days and don't miss it
            </p>
            <Button className="w-full bg-white hover:bg-gray-100 text-orange-600 text-base font-bold shadow-lg" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
              → Explore Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
