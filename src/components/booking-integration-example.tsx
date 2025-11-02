'use client';

/**
 * Example: How to integrate BookingDisplay into your trip planner
 * This shows you how to fetch real booking data and display it
 */

import { useState, useEffect } from 'react';
import { BookingDisplay } from '@/components/booking-display';
import { fetchBusBookingsAction, fetchActivityBookingsAction } from '@/app/actions';
import type { BusBooking, ActivityBooking } from '@/lib/types';

interface BookingIntegrationExampleProps {
  origin: string;
  destination: string;
  checkoutDate?: string;
}

/**
 * Example Component: Displays real booking data for a trip leg
 * 
 * Usage:
 * ```tsx
 * <BookingIntegrationExample 
 *   origin="Hyderabad" 
 *   destination="Chennai" 
 * />
 * ```
 */
export function BookingIntegrationExample({
  origin,
  destination,
  checkoutDate,
}: BookingIntegrationExampleProps) {
  const [buses, setBuses] = useState<BusBooking[]>([]);
  const [activities, setActivities] = useState<ActivityBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin || !destination) return;

    const fetchBookings = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch buses
        const busResult = await fetchBusBookingsAction(origin, destination, checkoutDate);
        if (busResult.success && busResult.data?.buses) {
          setBuses(busResult.data.buses);
        } else {
          console.warn('Bus fetch failed:', busResult.error);
        }

        // Fetch activities
        const activityResult = await fetchActivityBookingsAction(destination);
        if (activityResult.success && activityResult.data?.activities) {
          setActivities(activityResult.data.activities);
        } else {
          console.warn('Activity fetch failed:', activityResult.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [origin, destination, checkoutDate]);

  return (
    <BookingDisplay
      buses={buses}
      activities={activities}
      origin={origin}
      destination={destination}
      loading={loading}
      error={error || undefined}
    />
  );
}

/**
 * Integration Pattern 1: Use in Trip Planner Results
 * 
 * In your trip-planner.tsx:
 * ```tsx
 * {itinerary && (
 *   <>
 *     <ItineraryDisplay itinerary={itinerary} />
 *     
 *     <BookingIntegrationExample 
 *       origin={origin} 
 *       destination={destination}
 *       checkoutDate={checkoutDate}
 *     />
 *     
 *     <Checkout suggestions={suggestions} />
 *   </>
 * )}
 * ```
 */

/**
 * Integration Pattern 2: Use per Day in Itinerary
 * 
 * In your itinerary-display.tsx DayPlan component:
 * ```tsx
 * {dayPlan.activities && dayPlan.activities.length > 0 && (
 *   <>
 *     <div className="prose">{dayPlan.description}</div>
 *     
 *     <BookingIntegrationExample
 *       origin={fromCity}
 *       destination={toCity}
 *     />
 *   </>
 * )}
 * ```
 */

/**
 * Integration Pattern 3: In a Sidebar for Quick Booking
 * 
 * In your layout or sidebar:
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Quick Book from {origin}</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     <BookingIntegrationExample 
 *       origin={currentCity}
 *       destination={nextCity}
 *     />
 *   </CardContent>
 * </Card>
 * ```
 */

/**
 * Integration Pattern 4: Manual Data Fetching (if you need more control)
 * 
 * ```tsx
 * export function CustomBookingComponent() {
 *   const [buses, setBuses] = useState([]);
 *   
 *   const handleSearch = async () => {
 *     const result = await fetchBusBookingsAction('Delhi', 'Mumbai');
 *     if (result.success) {
 *       setBuses(result.data.buses);
 *     }
 *   };
 *   
 *   return (
 *     <>
 *       <Button onClick={handleSearch}>Search Buses</Button>
 *       <BookingDisplay buses={buses} />
 *     </>
 *   );
 * }
 * ```
 */

/**
 * Full Example: Itinerary Page with Bookings
 * 
 * This shows a complete page that displays itinerary + bookings
 */
export function FullItineraryWithBookingsExample() {
  const tripData = {
    origin: 'Hyderabad',
    destination: 'Chennai',
    legs: [
      { from: 'Hyderabad', to: 'Bangalore', date: '2024-12-15' },
      { from: 'Bangalore', to: 'Mysore', date: '2024-12-16' },
      { from: 'Mysore', to: 'Chennai', date: '2024-12-17' },
    ],
  };

  return (
    <div className="space-y-8">
      <div className="prose">
        <h1>Your Complete Trip</h1>
        <p>{tripData.origin} → {tripData.destination}</p>
      </div>

      {/* Day 1: Hyderabad to Bangalore */}
      <section className="space-y-4">
        <h2>Day 1: Hyderabad to Bangalore</h2>
        
        {/* Transportation Options */}
        <div>
          <h3>Transportation</h3>
          <BookingIntegrationExample
            origin="Hyderabad"
            destination="Bangalore"
            checkoutDate="2024-12-15"
          />
        </div>

        {/* Things to Do */}
        <div>
          <h3>Things to Do in Bangalore</h3>
          <BookingIntegrationExample
            origin="Bangalore"
            destination="Bangalore" // Same city - for activities
            checkoutDate="2024-12-15"
          />
        </div>
      </section>

      {/* Day 2: Bangalore to Mysore */}
      <section className="space-y-4">
        <h2>Day 2: Bangalore to Mysore</h2>
        
        <div>
          <h3>Transportation</h3>
          <BookingIntegrationExample
            origin="Bangalore"
            destination="Mysore"
            checkoutDate="2024-12-16"
          />
        </div>

        <div>
          <h3>Things to Do in Mysore</h3>
          <BookingIntegrationExample
            origin="Mysore"
            destination="Mysore"
            checkoutDate="2024-12-16"
          />
        </div>
      </section>

      {/* Day 3: Mysore to Chennai */}
      <section className="space-y-4">
        <h2>Day 3: Mysore to Chennai</h2>
        
        <div>
          <h3>Transportation</h3>
          <BookingIntegrationExample
            origin="Mysore"
            destination="Chennai"
            checkoutDate="2024-12-17"
          />
        </div>

        <div>
          <h3>Things to Do in Chennai</h3>
          <BookingIntegrationExample
            origin="Chennai"
            destination="Chennai"
            checkoutDate="2024-12-17"
          />
        </div>
      </section>
    </div>
  );
}

/**
 * Expected API Responses
 * 
 * GET /api/buses?origin=hyderabad&destination=bangalore
 * Response:
 * {
 *   "status": "success",
 *   "buses": [
 *     {
 *       "operator": "RedBus Express",
 *       "departure": "06:30",
 *       "arrival": "14:45",
 *       "duration": "8h 15m",
 *       "price": "₹450-550",
 *       "seats_available": 12,
 *       "rating": 4.2,
 *       "bus_type": "Volvo AC",
 *       "amenities": ["WiFi", "Charging", "Water"],
 *       "url": "https://easemytrip.com/..."
 *     },
 *     ...more buses
 *   ],
 *   "total_buses": 5,
 *   "origin": "hyderabad",
 *   "destination": "bangalore",
 *   "url": "https://easemytrip.com/bus/hyderabad-to-bangalore-bus-tickets/"
 * }
 * 
 * GET /api/activities?destination=bangalore
 * Response:
 * {
 *   "status": "success",
 *   "activities": [
 *     {
 *       "name": "Vidhana Soudha Heritage Tour",
 *       "description": "Guided tour of the iconic Kannada building",
 *       "price": "₹300-500",
 *       "duration": "2 hours",
 *       "rating": 4.4,
 *       "image": "https://...",
 *       "category": "Cultural",
 *       "url": "https://easemytrip.com/..."
 *     },
 *     ...more activities
 *   ],
 *   "total_activities": 8,
 *   "destination": "bangalore",
 *   "url": "https://easemytrip.com/activities/activity-in-bangalore/"
 * }
 */

/**
 * Styling Tips
 * 
 * The BookingDisplay component uses shadcn/ui components:
 * - Card, CardHeader, CardTitle, CardDescription, CardContent
 * - Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger
 * - Alert, AlertDescription
 * - Lucide React icons
 * 
 * To customize styling:
 * 1. Modify the component in src/components/booking-display.tsx
 * 2. Add Tailwind classes to the Card/Button/Badge elements
 * 3. Adjust colors: text-primary, bg-muted, text-muted-foreground, etc.
 * 4. Responsive design: Use grid-cols-1 md:grid-cols-2 lg:grid-cols-3
 */

/**
 * Error Handling
 * 
 * The component handles:
 * - Loading state: Shows skeleton loaders
 * - Error state: Shows alert with error message
 * - No data: Shows informational alert
 * - Partial data: Shows "Note: Sample data available"
 * - Network timeouts: Retries with exponential backoff (optional)
 */

/**
 * Performance Optimization
 * 
 * To improve performance:
 * 
 * 1. Add caching:
 *    const [cache, setCache] = useState({});
 *    if (cache[key]) return cache[key];
 * 
 * 2. Debounce searches:
 *    const debouncedFetch = useDebounce(fetchBookings, 500);
 * 
 * 3. Lazy load bookings:
 *    Use Intersection Observer to load only visible sections
 * 
 * 4. Parallel requests:
 *    Promise.all([fetchBuses, fetchActivities])
 * 
 * 5. Request deduplication:
 *    Keep track of in-flight requests to avoid duplicates
 */
