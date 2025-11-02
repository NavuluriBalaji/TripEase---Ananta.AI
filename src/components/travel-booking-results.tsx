'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  Hotel,
  Train,
  Bus,
  MapPin,
  Car,
  Clock,
  MapPinIcon,
  ExternalLink,
  Star,
  Users,
  AlertCircle,
} from 'lucide-react';
import type {
  HotelResult,
  TrainResult,
  BusResult,
  ActivityResult,
  CarBookingResult,
  TravelBookingData,
} from '@/lib/travelBookingService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TravelBookingResultsProps {
  data: TravelBookingData;
  origin: string;
  destination: string;
}

export const TravelBookingResults = ({
  data,
  origin,
  destination,
}: TravelBookingResultsProps) => {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [openMock, setOpenMock] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [mockItem, setMockItem] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Helper function to safely format fetch time
  const formatFetchTime = (fetchedAt: Date | string) => {
    try {
      const date = typeof fetchedAt === 'string' ? new Date(fetchedAt) : fetchedAt;
      return date.toLocaleTimeString();
    } catch {
      return 'Recently';
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const renderRating = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="text-sm font-semibold">{rating}</span>
      </div>
    );
  };

  const openMockDialog = (item: any) => {
    setMockItem(item);
    setSendResult(null);
    setOpenMock(true);
  };

  const submitMockBooking = async () => {
    if (!recipientEmail) {
      setSendResult('Please enter recipient email');
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/send-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: 'TripEase Booking Confirmation (Mock)',
          booking: mockItem,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send');
      setSendResult('Confirmation sent! Check your inbox' + (json.filePath ? ` (saved to ${json.filePath})` : ''));
    } catch (e: any) {
      setSendResult(e?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const confirmBooking = async (item: any) => {
    try {
      const doc = await addDoc(collection(db, 'bookings'), {
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        itemType: item?.type || 'unknown',
        title: item?.title || item?.name || 'Booking',
        origin,
        destination,
        price: item?.price || null,
        providerUrl: item?.url || null,
        payload: item || null,
        status: 'confirmed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Try to email the user automatically if we have an email
      const toEmail = currentUser?.email || recipientEmail;
      if (toEmail) {
        try {
          await fetch('/api/send-booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: toEmail,
              subject: 'TripEase Booking Confirmation',
              booking: { id: doc.id, ...item, origin, destination },
            }),
          });
        } catch {}
      }

      toast({
        title: 'Booking confirmed',
        description: `${item?.title || item?.name || 'Your booking'} is confirmed.`,
      });
    } catch (e: any) {
      toast({
        title: 'Booking failed',
        description: e?.message || 'Please try again.',
      });
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Plan Your Trip from {origin} to {destination}
        </h1>
        <p className="text-gray-600 text-lg">
          All options available for your journey
        </p>
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <MapPin className="w-4 h-4" />
          <span>
            Results fetched at {formatFetchTime(data.fetchedAt)}
          </span>
        </div>
      </div>

      {/* Error alerts */}
      {data.errors && data.errors.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Some services couldn't be reached. Showing available options and
            cached results.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for different booking types */}
      <Tabs defaultValue="hotels" className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-8">
          <TabsTrigger value="hotels" className="flex items-center gap-2">
            <Hotel className="w-4 h-4" />
            <span className="hidden sm:inline">Hotels</span>
            <span className="sm:hidden text-xs">{data.hotels.length}</span>
          </TabsTrigger>
          <TabsTrigger value="trains" className="flex items-center gap-2">
            <Train className="w-4 h-4" />
            <span className="hidden sm:inline">Trains</span>
            <span className="sm:hidden text-xs">{data.trains.length}</span>
          </TabsTrigger>
          <TabsTrigger value="buses" className="flex items-center gap-2">
            <Bus className="w-4 h-4" />
            <span className="hidden sm:inline">Buses</span>
            <span className="sm:hidden text-xs">{data.buses.length}</span>
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Activities</span>
            <span className="sm:hidden text-xs">{data.activities.length}</span>
          </TabsTrigger>
          <TabsTrigger value="cars" className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="hidden sm:inline">Cars</span>
            <span className="sm:hidden text-xs">{data.cars.length}</span>
          </TabsTrigger>
          <TabsTrigger value="airport" className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="hidden sm:inline">Airport</span>
            <span className="sm:hidden text-xs">{data.airports.length}</span>
          </TabsTrigger>
        </TabsList>

        {/* Hotels Tab */}
        <TabsContent value="hotels" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.hotels.map((hotel, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => toggleExpanded(`hotel-${idx}`)}
              >
                {hotel.image && (
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{hotel.name}</CardTitle>
                  <div className="flex justify-between items-start mt-2">
                    <span className="text-sm text-gray-600">{hotel.location}</span>
                    {renderRating(hotel.rating)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xl font-bold text-blue-600">
                    {hotel.price || 'Contact for price'}
                  </p>
                  <a
                    href={hotel.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className="w-full" size="sm">
                      Check Available Rooms
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); confirmBooking({ type: 'hotel', title: hotel.name, ...hotel }); }}>
                      Confirm Booking
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMockDialog({ type: 'hotel', title: hotel.name, ...hotel }); }}>
                      Mock Book & Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Trains Tab */}
        <TabsContent value="trains" className="space-y-4">
          <div className="space-y-4">
            {data.trains.map((train, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all"
                onClick={() => toggleExpanded(`train-${idx}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{train.trainName}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Train #{train.trainNumber}
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {train.price}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Departure</p>
                      <p className="text-lg font-bold">{train.departure}</p>
                    </div>
                    <div className="text-center">
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">{train.duration}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Arrival</p>
                      <p className="text-lg font-bold">{train.arrival}</p>
                    </div>
                  </div>
                  {train.seats && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{train.seats} seats available</span>
                    </div>
                  )}
                  <a
                    href={train.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className="w-full" size="sm">
                      Book Train
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); confirmBooking({ type: 'train', title: train.trainName, ...train }); }}>
                      Confirm Booking
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMockDialog({ type: 'train', title: train.trainName, ...train }); }}>
                      Mock Book & Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Buses Tab */}
        <TabsContent value="buses" className="space-y-4">
          <div className="space-y-4">
            {data.buses.map((bus, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all"
                onClick={() => toggleExpanded(`bus-${idx}`)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle>{bus.busName}</CardTitle>
                      {bus.rating && renderRating(bus.rating)}
                    </div>
                    <span className="text-2xl font-bold text-purple-600">
                      {bus.price}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Departure</p>
                      <p className="text-lg font-bold">{bus.departure}</p>
                    </div>
                    <div className="text-center">
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      <p className="text-sm text-gray-600">{bus.duration}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Arrival</p>
                      <p className="text-lg font-bold">{bus.arrival}</p>
                    </div>
                  </div>
                  {bus.seats && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{bus.seats} seats available</span>
                    </div>
                  )}
                  <a
                    href={bus.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className="w-full" size="sm">
                      Book Bus
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); confirmBooking({ type: 'bus', title: bus.busName, ...bus }); }}>
                      Confirm Booking
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMockDialog({ type: 'bus', title: bus.busName, ...bus }); }}>
                      Mock Book & Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.activities.map((activity, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all overflow-hidden"
                onClick={() => toggleExpanded(`activity-${idx}`)}
              >
                {activity.image && (
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={activity.image}
                      alt={activity.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{activity.name}</CardTitle>
                  {activity.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {activity.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {activity.duration && (
                        <>
                          <Clock className="w-4 h-4 text-gray-600" />
                          <span className="text-sm text-gray-600">
                            {activity.duration}
                          </span>
                        </>
                      )}
                    </div>
                    {activity.rating && renderRating(activity.rating)}
                  </div>
                  <p className="text-xl font-bold text-blue-600">
                    {activity.price || 'Contact for price'}
                  </p>
                  <a
                    href={activity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className="w-full" size="sm">
                      Book Activity
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); confirmBooking({ type: 'activity', title: activity.name, ...activity }); }}>
                      Confirm Booking
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMockDialog({ type: 'activity', title: activity.name, ...activity }); }}>
                      Mock Book & Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cars Tab */}
        <TabsContent value="cars" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.cars.map((car, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all overflow-hidden"
                onClick={() => toggleExpanded(`car-${idx}`)}
              >
                {car.image && (
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={car.image}
                      alt={car.carType}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{car.carType}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      Capacity: {car.capacity} persons
                    </span>
                  </div>
                  {car.rating && renderRating(car.rating)}
                  <p className="text-xl font-bold text-blue-600">
                    {car.price || 'Contact for price'}
                  </p>
                  <a
                    href={car.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className="w-full" size="sm">
                      Book Now
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); confirmBooking({ type: 'car', title: car.carType, ...car }); }}>
                      Confirm Booking
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMockDialog({ type: 'car', title: car.carType, ...car }); }}>
                      Mock Book & Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Airport Cabs Tab */}
        <TabsContent value="airport" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.airports.map((airport, idx) => (
              <Card
                key={idx}
                className="hover:shadow-lg transition-all overflow-hidden"
                onClick={() => toggleExpanded(`airport-${idx}`)}
              >
                {airport.image && (
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={airport.image}
                      alt={airport.carType}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{airport.carType}</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">Airport Transfer</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-600">
                      Capacity: {airport.capacity} persons
                    </span>
                  </div>
                  {airport.rating && renderRating(airport.rating)}
                  <p className="text-xl font-bold text-blue-600">
                    {airport.price || 'Contact for price'}
                  </p>
                  <a
                    href={airport.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button className="w-full" size="sm">
                      Book Transfer
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                  </a>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="default" size="sm" onClick={(e) => { e.stopPropagation(); confirmBooking({ type: 'airport', title: airport.carType, ...airport }); }}>
                      Confirm Booking
                    </Button>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openMockDialog({ type: 'airport', title: airport.carType, ...airport }); }}>
                      Mock Book & Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mock Booking Dialog */}
      <Dialog open={openMock} onOpenChange={setOpenMock}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Booking Confirmation</DialogTitle>
            <DialogDescription>
              This is a mock confirmation. Enter the recipient email to send details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-sm text-gray-600">Booking</div>
              <div className="font-medium">{mockItem?.title || mockItem?.name || 'Selected item'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Recipient Email</div>
              <Input
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
            {sendResult && (
              <div className={`text-sm ${sendResult.startsWith('Confirmation') ? 'text-green-600' : 'text-red-600'}`}>
                {sendResult}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenMock(false)}>Close</Button>
            <Button onClick={submitMockBooking} disabled={sending}>
              {sending ? 'Sending…' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
