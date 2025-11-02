'use client';

import { BusBooking, ActivityBooking } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Clock,
  Users,
  Star,
  Zap,
  ArrowRight,
  MapIcon,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BookingDisplayProps {
  buses?: BusBooking[];
  activities?: ActivityBooking[];
  origin?: string;
  destination?: string;
  loading?: boolean;
  error?: string;
}

export function BookingDisplay({
  buses = [],
  activities = [],
  origin,
  destination,
  loading = false,
  error,
}: BookingDisplayProps) {
  const hasData = buses.length > 0 || activities.length > 0;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Loading Bookings...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!hasData) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No bookings found. Please try a different route or destination.
        </AlertDescription>
      </Alert>
    );
  }

  const handleBookNow = (url: string, name: string, type: 'bus' | 'activity') => {
    // In a real app, this would open a booking modal or redirect to booking page
    console.log(`Booking ${type}: ${name}`);
    // window.open(url, '_blank');
    // Or: navigate to checkout with booking info
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Available Bookings</CardTitle>
        <CardDescription>
          {origin && destination && (
            <span className="flex items-center gap-2 mt-2">
              <span className="font-semibold">{origin}</span>
              <ArrowRight className="h-4 w-4" />
              <span className="font-semibold">{destination}</span>
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue={buses.length > 0 ? 'buses' : 'activities'} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[buses.length > 0 ? 1 : 0, activities.length > 0 ? 1 : 0].filter(Boolean).length}, 1fr)` }}>
            {buses.length > 0 && (
              <TabsTrigger value="buses">
                Buses <Badge variant="secondary" className="ml-2">{buses.length}</Badge>
              </TabsTrigger>
            )}
            {activities.length > 0 && (
              <TabsTrigger value="activities">
                Activities <Badge variant="secondary" className="ml-2">{activities.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Buses Tab */}
          {buses.length > 0 && (
            <TabsContent value="buses" className="space-y-4 mt-4">
              <div className="space-y-3">
                {buses.map((bus, index) => (
                  <BusCard
                    key={index}
                    bus={bus}
                    onBook={() => handleBookNow(bus.url, bus.operator, 'bus')}
                  />
                ))}
              </div>
            </TabsContent>
          )}

          {/* Activities Tab */}
          {activities.length > 0 && (
            <TabsContent value="activities" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activities.map((activity, index) => (
                  <ActivityCard
                    key={index}
                    activity={activity}
                    onBook={() => handleBookNow(activity.url, activity.name, 'activity')}
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface BusCardProps {
  bus: BusBooking;
  onBook: () => void;
}

function BusCard({ bus, onBook }: BusCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{bus.operator}</h3>
              <p className="text-sm text-muted-foreground">{bus.bus_type}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-primary">{bus.price}</p>
              <div className="flex items-center gap-1 justify-end mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{bus.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          {/* Times */}
          <div className="flex items-center gap-4 bg-muted p-3 rounded-lg">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Departure</p>
              <p className="font-semibold">{bus.departure}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 text-right">
              <p className="text-xs text-muted-foreground">Arrival</p>
              <p className="font-semibold">{bus.arrival}</p>
            </div>
          </div>

          {/* Duration and Seats */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{bus.duration}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{bus.seats_available} seats left</span>
            </div>
          </div>

          {/* Amenities */}
          {bus.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {bus.amenities.map((amenity, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          )}

          {/* Book Button */}
          <Button onClick={onBook} className="w-full" size="sm">
            Book Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ActivityCardProps {
  activity: ActivityBooking;
  onBook: () => void;
}

function ActivityCard({ activity, onBook }: ActivityCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1 space-y-3">
        {/* Category Badge */}
        <div className="flex justify-between items-start gap-2">
          <Badge variant="secondary" className="text-xs">
            {activity.category}
          </Badge>
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{activity.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold line-clamp-2">{activity.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {activity.description}
          </p>
        </div>

        {/* Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span>{activity.duration}</span>
          </div>
          <p className="text-lg font-bold text-primary">{activity.price}</p>
        </div>

        {/* Book Button */}
        <Button onClick={onBook} className="w-full mt-auto" size="sm">
          Book Now
        </Button>
      </CardContent>
    </Card>
  );
}
