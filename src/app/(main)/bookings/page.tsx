'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TravelBookingLoader } from '@/components/travel-booking-loader';
import { TravelBookingResults } from '@/components/travel-booking-results';
import { MapPin, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import type { TravelBookingData } from '@/lib/travelBookingService';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function BookingsPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bookingData, setBookingData] = useState<TravelBookingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Sample destinations for quick selection
  const popularDestinations = [
    { city: 'Bangalore', code: 'BLR' },
    { city: 'Delhi', code: 'DEL' },
    { city: 'Mumbai', code: 'BOM' },
    { city: 'Goa', code: 'GOI' },
    { city: 'Kolkata', code: 'KOL' },
    { city: 'Hyderabad', code: 'HYD' },
    { city: 'Jaipur', code: 'JAI' },
    { city: 'Pune', code: 'PUN' },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!origin.trim() || !destination.trim()) {
      setError('Please enter both origin and destination');
      return;
    }

    if (origin.toLowerCase() === destination.toLowerCase()) {
      setError('Origin and destination cannot be the same');
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch('/api/travel-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: origin.trim(),
          destination: destination.trim(),
          date: date || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch booking data');
      }

      const data = await response.json();
      setBookingData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSelect = (dest: string) => {
    setDestination(dest);
  };

  if (isLoading) {
    return <TravelBookingLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          Travel Bookings
        </h1>
        <p className="text-gray-600 text-lg">
          Find and compare flights, hotels, trains, buses, and activities all in one place
        </p>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Search Form */}
        {!hasSearched && !bookingData && (
          <Card className="mb-8 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle>Search Your Journey</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSearch} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Origin Input */}
                  <div className="space-y-2">
                    <Label htmlFor="origin" className="text-gray-700 font-semibold">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      From (Origin)
                    </Label>
                    <Input
                      id="origin"
                      placeholder="e.g., Bangalore, Delhi, Mumbai"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>

                  {/* Destination Input */}
                  <div className="space-y-2">
                    <Label htmlFor="destination" className="text-gray-700 font-semibold">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      To (Destination)
                    </Label>
                    <Input
                      id="destination"
                      placeholder="e.g., Goa, Jaipur, Pune"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-gray-700 font-semibold">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Journey Date (Optional)
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Search Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold"
                >
                  <span>Search All Travel Options</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </form>

              {/* Quick Selection */}
              <div className="mt-8 pt-8 border-t">
                <p className="text-gray-700 font-semibold mb-4">Popular Destinations:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {popularDestinations.map((dest) => (
                    <button
                      key={dest.code}
                      onClick={() => handleQuickSelect(dest.city)}
                      className="p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 hover:text-blue-600"
                    >
                      {dest.city}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {bookingData && (
          <div className="space-y-8">
            <Button
              onClick={() => {
                setBookingData(null);
                setHasSearched(false);
                setOrigin('');
                setDestination('');
                setDate('');
                setError(null);
              }}
              variant="outline"
              className="mb-4"
            >
              ← Back to Search
            </Button>
            <TravelBookingResults
              data={bookingData}
              origin={origin}
              destination={destination}
            />
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && !bookingData && !isLoading && (
          <Card className="border-dashed border-2 p-12 text-center">
            <div className="space-y-4">
              <div className="inline-block p-4 bg-blue-100 rounded-full">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Plan Your Next Adventure
              </h3>
              <p className="text-gray-600">
                Enter your origin and destination to see all available travel options
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
