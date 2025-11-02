'use client';

import Image from 'next/image';
import { MapPin, Calendar, Users, TrendingUp, Loader, AlertCircle, CheckCircle, ExternalLink, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  // Category trips state
  const [selectedCategory, setSelectedCategory] = useState<string>('friends');
  const [categoryTrips, setCategoryTrips] = useState<any[]>([]);
  const [tripCategories, setTripCategories] = useState<any[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [bookingTrip, setBookingTrip] = useState<string | null>(null);
  const [planningTrip, setPlanningTrip] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [tripPlan, setTripPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Booking confirmation modal state
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedTripForBooking, setSelectedTripForBooking] = useState<any | null>(null);
  const [bookingEmail, setBookingEmail] = useState<string>(userProfile?.email || currentUser?.email || '');
  const [sendingBookingEmail, setSendingBookingEmail] = useState(false);
  const [bookingEmailError, setBookingEmailError] = useState<string | null>(null);
  const [bookingEmailSuccess, setBookingEmailSuccess] = useState<string | null>(null);

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
  id: 3,
  title: 'Santorini Sunset Viewpoint',
  description: 'Beautiful cliffside views of the Aegean Sea',
  date: '10 Sep - 14 Sep',
  duration: '5 Days',
  image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=250&fit=crop',
  travelers: 2,
  destination: 'Santorini, Greece',
  latitude: 36.3932,
  longitude: 25.4615,
},
// {
//   id: 4,
//   title: 'Kyoto Bamboo Forest',
//   description: 'Tranquil paths surrounded by towering bamboo',
//   date: '21 Oct - 25 Oct',
//   duration: '5 Days',
//   image: 'https://images.unsplash.com/photo-1526481280691-9065fcb91f5d?w=400&h=250&fit=crop',
//   travelers: 1,
//   destination: 'Kyoto, Japan',
//   latitude: 35.0116,
//   longitude: 135.7681,
// },
{
  id: 5,
  title: 'Banff National Park',
  description: 'Stunning lakes and mountain trails in the Rockies',
  date: '5 Nov - 10 Nov',
  duration: '6 Days',
  image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=400&h=250&fit=crop',
  travelers: 4,
  destination: 'Alberta, Canada',
  latitude: 51.4968,
  longitude: -115.9281,
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
    fetchTripsForCategory('friends');
  }, []);

  // Fetch trips for selected category
  const fetchTripsForCategory = async (categoryId: string) => {
    setLoadingTrips(true);
    try {
      const response = await fetch(`/api/trips/by-category?category=${categoryId}`);
      const data = await response.json();
      setCategoryTrips(data.trips || []);
      setTripCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoadingTrips(false);
    }
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    fetchTripsForCategory(categoryId);
  };

  // Book trip: open modal and prepare to email
  const handleBookTrip = async (tripId: string, tripTitle: string) => {
    setBookingTrip(tripId);
    setBookingEmailError(null);
    setBookingEmailSuccess(null);
    try {
      const trip = categoryTrips.find((t: any) => String(t.id) === String(tripId));
      setSelectedTripForBooking(trip || { id: tripId, title: tripTitle });
      setShowBookModal(true);
    } catch (error) {
      console.error('Error preparing booking:', error);
    } finally {
      setBookingTrip(null);
    }
  };

  const confirmAndSendBookingEmail = async () => {
    if (!bookingEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingEmail)) {
      setBookingEmailError('Please enter a valid email address.');
      return;
    }
    setBookingEmailError(null);
    setSendingBookingEmail(true);
    setBookingEmailSuccess(null);
    try {
      const trip = selectedTripForBooking;
      const bookingPayload = {
        id: trip?.id,
        title: trip?.title,
        destination: trip?.destination,
        duration: trip?.duration,
        budget: trip?.budget,
        rating: trip?.rating,
      };

      const res = await fetch('/api/send-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: bookingEmail,
          subject: `Your TripEase booking: ${trip?.title || 'Trip'}`,
          booking: bookingPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to send booking email');
      }

      const data = await res.json();
      setBookingEmailSuccess('Booking confirmation sent successfully.');
      // Optionally close modal after a short delay
      // setTimeout(() => setShowBookModal(false), 1200);
    } catch (e: any) {
      setBookingEmailError(e?.message || 'Failed to send booking email.');
    } finally {
      setSendingBookingEmail(false);
    }
  };

  // Plan trip using Perplexity
  const handlePlanTrip = async (trip: any) => {
    setPlanningTrip(trip.id);
    setLoadingPlan(true);
    setPlanError(null);
    try {
      const response = await fetch('/api/trips/plan-with-perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripTitle: trip.title,
          destination: trip.destination,
          duration: trip.duration,
          category: selectedCategory
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate trip plan');
      }

      const data = await response.json();
      setTripPlan(data);
      setShowPlanModal(true);
    } catch (error) {
      console.error('Error planning trip:', error);
      setPlanError('Failed to generate trip plan. Please try again.');
    } finally {
      setPlanningTrip(null);
      setLoadingPlan(false);
    }
  };

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

      {/* Location Permission Status & Nearby Locations Section (moved near top) */}
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

      {/* Categorized Trips Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: 'Poppins, sans-serif' }}>
          Available Trips by Category
        </h2>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-3 mb-8 pb-4 overflow-x-auto">
          {tripCategories.map((category: any) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`px-6 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Trips Grid */}
        {loadingTrips ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryTrips.map((trip: any) => (
              <div
                key={trip.id}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all border border-gray-200"
              >
                {/* Trip Image */}
                <div className="relative h-48 overflow-hidden group">
                  <img
                    src={trip.image}
                    alt={trip.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=400&fit=crop';
                    }}
                  />
                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3 bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-bold">
                    ⭐ {trip.rating}
                  </div>
                </div>

                {/* Trip Details */}
                <div className="p-5">
                  <p className="text-xs text-gray-500 mb-1 uppercase font-semibold">📍 {trip.destination}</p>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{trip.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{trip.description}</p>

                  {/* Trip Meta */}
                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs border-b pb-4">
                    <div>
                      <p className="text-gray-500">Duration</p>
                      <p className="font-semibold text-gray-900">📅 {trip.duration}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Budget</p>
                      <p className="font-semibold text-gray-900">💰 {trip.budget}</p>
                    </div>
                  </div>

                  {/* Trip Stats */}
                  <div className="flex gap-3 mb-4 text-xs">
                    <div className="flex-1">
                      <p className="text-gray-600">Reviews</p>
                      <p className="font-semibold">{(trip.reviews / 1000).toFixed(1)}K</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-600">Activities</p>
                      <p className="font-semibold">{trip.activities?.length || 0}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => handleBookTrip(trip.id, trip.title)}
                      disabled={bookingTrip === trip.id}
                    >
                      {bookingTrip === trip.id ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Preparing...
                        </>
                      ) : (
                        '✅ Book'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePlanTrip(trip)}
                      disabled={planningTrip === trip.id}
                    >
                      {planningTrip === trip.id ? (
                        <>
                          <Loader className="h-4 w-4 mr-2 animate-spin" />
                          Planning...
                        </>
                      ) : (
                        '🗺️ Plan'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Grid - Keep existing structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column - Upcoming Trips */}
        <div className="lg:col-span-2">

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
                Best Ever Trips On-Cards
              </h2>
              {/* <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                See All
              </Button> */}
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
          {/* <div>
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
          </div> */}

          {/* Done Trips */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700 }}>
                Suggestions
              </h2>
              <Button variant="ghost" className="text-blue-600 hover:bg-blue-100 font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                {/* See All */}
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

      {/* Trip Planning Modal - Loading State */}
      {/* Booking Confirmation Modal */}
      <Dialog open={showBookModal} onOpenChange={setShowBookModal}>
        <DialogContent className="sm:max-w-md">
          {/* Hidden title for accessibility tools that require it */}
          <DialogHeader>
            <DialogTitle className="sr-only">Booking Confirmation</DialogTitle>
            <DialogDescription className="sr-only">Confirm your booking and receive an email confirmation.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">You are booking</p>
              <h3 className="text-xl font-semibold text-gray-900">{selectedTripForBooking?.title || 'Selected Trip'}</h3>
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                {selectedTripForBooking?.destination && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Destination</p>
                    <p className="font-medium">{selectedTripForBooking.destination}</p>
                  </div>
                )}
                {selectedTripForBooking?.duration && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Duration</p>
                    <p className="font-medium">{selectedTripForBooking.duration}</p>
                  </div>
                )}
                {selectedTripForBooking?.budget && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium">{selectedTripForBooking.budget}</p>
                  </div>
                )}
                {selectedTripForBooking?.rating && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-500">Rating</p>
                    <p className="font-medium">⭐ {selectedTripForBooking.rating}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-email">Send confirmation to</Label>
              <Input
                id="booking-email"
                type="email"
                value={bookingEmail}
                onChange={(e) => setBookingEmail(e.target.value)}
                placeholder="you@example.com"
              />
              {bookingEmailError && <p className="text-sm text-red-600">{bookingEmailError}</p>}
              {bookingEmailSuccess && <p className="text-sm text-green-600">{bookingEmailSuccess}</p>}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBookModal(false)} disabled={sendingBookingEmail}>
              Cancel
            </Button>
            <Button onClick={confirmAndSendBookingEmail} disabled={sendingBookingEmail} className="bg-blue-600 hover:bg-blue-700 text-white">
              {sendingBookingEmail ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                'Confirm & Send Email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trip Planning Modal - Loading State */}
      {showPlanModal && loadingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl flex flex-col items-center justify-center">
            <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Planning Your Trip</h3>
            <p className="text-gray-600 text-center">Searching Perplexity for the best recommendations...</p>
          </div>
        </div>
      )}

      {/* Trip Planning Modal - Error State */}
      {showPlanModal && planError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="bg-red-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Error</h2>
              </div>
              <button
                onClick={() => {
                  setShowPlanModal(false);
                  setPlanError(null);
                  setTripPlan(null);
                }}
                className="text-white text-2xl hover:bg-white hover:bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4">{planError}</p>
              <Button
                className="w-full"
                onClick={() => {
                  setShowPlanModal(false);
                  setPlanError(null);
                  setTripPlan(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Planning Modal - Success State */}
      {showPlanModal && tripPlan && !loadingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-2xl w-[95vw] h-[95vh] max-w-7xl shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-4xl font-bold">{tripPlan.itinerary?.title || 'Your Trip Plan'}</h2>
                <p className="text-blue-100 text-lg mt-2">📍 {tripPlan.itinerary?.destination}</p>
              </div>
              <button
                onClick={() => {
                  setShowPlanModal(false);
                  setTripPlan(null);
                  setPlanError(null);
                }}
                className="text-white text-3xl hover:bg-white hover:bg-opacity-20 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="flex flex-1 overflow-hidden">
              {/* LEFT SIDE - ITINERARY */}
              <div className="flex-1 overflow-y-auto bg-gray-50 p-8 border-r border-gray-200">
                {/* Key Info Cards */}
                {tripPlan.itinerary?.duration && (
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-blue-100 p-4 rounded-xl border-2 border-blue-300">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Duration</p>
                      <p className="text-2xl font-bold text-blue-900">{tripPlan.itinerary.duration} </p>
                    </div>
                    <div className="bg-green-100 p-4 rounded-xl border-2 border-green-300">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Category</p>
                      <p className="text-2xl font-bold text-green-900 capitalize">{tripPlan.itinerary.category}</p>
                    </div>
                    <div className="bg-purple-100 p-4 rounded-xl border-2 border-purple-300">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Source</p>
                      <p className="text-2xl font-bold text-purple-900">Google Search Console</p>
                    </div>
                  </div>
                )}

                {/* Day-by-Day Itinerary */}
                {tripPlan.itinerary?.itinerary && tripPlan.itinerary.itinerary.length > 0 && (
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                      📅 Day-by-Day Itinerary
                    </h3>
                    <div className="space-y-4">
                      {tripPlan.itinerary.itinerary.map((day: any, index: number) => (
                        <div key={index} className="bg-white p-6 rounded-xl border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-2xl font-bold text-gray-900">Day {day.day || index + 1}</h4>
                              <p className="text-sm text-gray-600 mt-1">{day.title}</p>
                            </div>
                            {day.estimatedCost && (
                              <span className="text-lg font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg">{day.estimatedCost}</span>
                            )}
                          </div>
                          
                          {day.activities && Array.isArray(day.activities) && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-500 mb-2">ACTIVITIES</p>
                              <ul className="space-y-2">
                                {day.activities.map((activity: string, i: number) => (
                                  <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                                    <span className="text-blue-500 text-lg">✓</span>
                                    {activity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-3 text-xs mt-4 pt-4 border-t border-gray-100">
                            {day.morning && (
                              <div>
                                <span className="font-semibold text-yellow-600">🌅 Morning</span>
                                <p className="text-gray-600">{day.morning}</p>
                              </div>
                            )}
                            {day.afternoon && (
                              <div>
                                <span className="font-semibold text-orange-600">☀️ Afternoon</span>
                                <p className="text-gray-600">{day.afternoon}</p>
                              </div>
                            )}
                            {day.evening && (
                              <div>
                                <span className="font-semibold text-purple-600">🌙 Evening</span>
                                <p className="text-gray-600">{day.evening}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Details moved to left column */}
                {tripPlan.itinerary?.planning && (
                  <div className="mt-8 pt-8 border-t-2 border-blue-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">📋 Full Details</h3>
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded border border-blue-100 max-h-72 overflow-y-auto">
                      {tripPlan.itinerary.planning}
                    </p>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE - RESEARCH REFERENCES */}
              <div className="w-96 overflow-y-auto bg-blue-50 p-8 border-l border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  🔍 Research & References
                </h3>

                {/* Research Results */}
                {tripPlan.itinerary?.research && tripPlan.itinerary.research.length > 0 && (
                  <div className="space-y-4">
                    {tripPlan.itinerary.research.map((result: any, index: number) => (
                      <div key={index} className="bg-white p-4 rounded-lg border-l-4 border-blue-500 hover:shadow-lg transition-all group">
                        <a 
                          href={result.url || result.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <div className="text-blue-600 hover:text-blue-800 font-bold text-sm mb-2 flex items-start gap-2 group-hover:underline">
                            <span className="text-lg flex-shrink-0">#{index + 1}</span>
                            <span className="line-clamp-2">{result.title}</span>
                          </div>
                        </a>
                        
                        {(result.snippet || result.description) && (
                          <p className="text-gray-700 text-xs leading-relaxed mb-3 line-clamp-3">
                            {result.snippet || result.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-xs gap-2 mb-3">
                          {result.date && (
                            <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              📅 {result.date}
                            </span>
                          )}
                        </div>

                        <a
                          href={result.url || result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-semibold transition-colors group-hover:shadow-md"
                        >
                          Read More
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Planning Details moved to left column */}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-100 p-6 rounded-b-2xl flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPlanModal(false);
                  setTripPlan(null);
                  setPlanError(null);
                }}
              >
                Close
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Save Trip Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}