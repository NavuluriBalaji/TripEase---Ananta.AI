/**
 * Travel Booking Service
 * Handles scraping and parsing of travel-related data from EasyMyTrip and other providers
 * Uses pure HTML parsing with regex and DOM selectors
 * Supports: Hotels, Trains, Buses, Activities, Car Bookings
 */

export interface HotelResult {
  name: string;
  price?: string;
  rating?: number;
  location: string;
  image?: string;
  url: string;
}

export interface TrainResult {
  trainName: string;
  trainNumber: string;
  departure: string;
  arrival: string;
  duration: string;
  price?: string;
  url: string;
  seats?: number;
}

export interface BusResult {
  busName: string;
  departure: string;
  arrival: string;
  duration: string;
  price?: string;
  seats?: number;
  url: string;
  rating?: number;
}

export interface ActivityResult {
  name: string;
  description?: string;
  price?: string;
  rating?: number;
  url: string;
  image?: string;
  duration?: string;
}

export interface CarBookingResult {
  carType: string;
  price?: string;
  capacity: number;
  image?: string;
  url: string;
  rating?: number;
}

export interface TravelBookingData {
  hotels: HotelResult[];
  trains: TrainResult[];
  buses: BusResult[];
  activities: ActivityResult[];
  cars: CarBookingResult[];
  airports: CarBookingResult[];
  fetchedAt: Date;
  errors?: string[];
}

/**
 * Extract data from HTML using pure parsing (no AI models)
 * Uses regex patterns to identify and extract common travel data formats
 */

/**
 * Parse prices from text - handles various formats: ₹5000, Rs. 5000, $100, 5000 INR, etc.
 */
const parsePrice = (text: string): string | undefined => {
  if (!text) return undefined;
  
  // Match currency formats
  const priceMatch = text.match(/[\$₹€]?\s*(\d+(?:[,\.]\d{2,3})*)\s*(?:INR|USD|EUR)?/);
  if (priceMatch) {
    return priceMatch[0].trim();
  }
  
  // Match just numbers with currency symbols
  const simplePrice = text.match(/(?:₹|Rs\.|\$|€)?\s*(\d+(?:,\d{3})*)/);
  if (simplePrice) {
    return simplePrice[0].trim();
  }
  
  return text.substring(0, 50);
};

/**
 * Parse time strings - handles HH:MM, HH:MM AM/PM, etc.
 */
const parseTime = (text: string): string => {
  if (!text) return '';
  
  // Match HH:MM AM/PM or HH:MM format
  const timeMatch = text.match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/i);
  if (timeMatch) {
    return timeMatch[0];
  }
  
  return text.substring(0, 20);
};

/**
 * Parse duration - handles "2h 30m", "2:30", "2 hours 30 mins", etc.
 */
const parseDuration = (text: string): string => {
  if (!text) return '';
  
  // Match duration formats
  const durationMatch = text.match(/(\d+)\s*(?:h|hours?)[.\s]*(\d+)?\s*(?:m|mins?)?|\d+:\d+/i);
  if (durationMatch) {
    return durationMatch[0];
  }
  
  return text.substring(0, 30);
};

/**
 * Parse rating - handles "4.5 stars", "4.5/5", "4.5", etc.
 */
const parseRating = (text: string): number | undefined => {
  if (!text) return undefined;
  
  const ratingMatch = text.match(/(\d+\.?\d*)\s*(?:\/\s*5|\s*stars?)?/);
  if (ratingMatch) {
    const rating = parseFloat(ratingMatch[1]);
    if (rating >= 0 && rating <= 5) {
      return rating;
    }
  }
  
  return undefined;
};

/**
 * Extract text between tags or from specific HTML elements
 */
const extractText = (html: string, regex: RegExp): string[] => {
  const matches = html.match(regex);
  return matches ? matches.map(m => m.replace(/<[^>]*>/g, '').trim()).filter(m => m.length > 0) : [];
};

/**
 * Extract all text content and clean up
 */
const cleanHtml = (html: string): string => {
  // Remove script and style tags
  let cleaned = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Decode HTML entities
  cleaned = cleaned
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  
  return cleaned;
};

/**
 * Build EasyMyTrip URLs for different services
 */
export const buildTravelUrls = (
  origin: string,
  destination: string,
  date?: string
) => {
  return {
    hotels: `https://www.easemytrip.com/hotels/hotels-in-${destination.toLowerCase()}`,
    trains: `https://railways.easemytrip.com/TrainListInfo/${origin}--All-Stations-(StationCode)-to-${destination}--All-Stations-(Stationcode)/2/${date || '01/01/2024'}`,
    buses: `https://www.easemytrip.com/bus/${origin.toLowerCase()}-to-${destination.toLowerCase()}-bus-tickets/`,
    activities: `https://www.easemytrip.com/activities/activity-in-${destination.toLowerCase()}/`,
    carBooking: `https://www.easemytrip.com/cabs/${origin.toLowerCase()}-to-${destination.toLowerCase()}-cab-booking/`,
    airportCabs: `https://www.easemytrip.com/cabs/cabs-from-${origin.toLowerCase()}-airport/`,
  };
};

/**
 * Parse HTML and extract hotel information using pure regex/HTML parsing
 */
const parseHotels = (html: string, destination: string, url: string): HotelResult[] => {
  if (!html || html.length < 50) {
    return [];
  }

  try {
    const cleaned = cleanHtml(html);
    const hotels: HotelResult[] = [];

    // Look for hotel cards/containers
    // Pattern: hotel name followed by price and rating
    const hotelPattern = /(?:hotel|property|accommodation)[\s:]*([^<\n]{2,100}?)[\s<].*?(?:price|cost|₹|\$)[\s:]*([^\n<]{2,30}?)[\s<].*?(?:rating|⭐|★)[\s:]*([^\n<]{2,20})?/gi;
    
    let match;
    let count = 0;
    
    // Try pattern-based extraction first
    while ((match = hotelPattern.exec(cleaned)) && count < 5) {
      const name = match[1]?.trim() || 'Hotel';
      const price = parsePrice(match[2] || '');
      const rating = parseRating(match[3] || '');
      
      if (name && name.length > 2) {
        hotels.push({
          name,
          price,
          rating,
          location: destination,
          url,
        });
        count++;
      }
    }
    
    // Fallback: look for common hotel data patterns in the HTML
    if (hotels.length === 0) {
      // Extract data-* attributes or class names that contain hotel info
      const dataPattern = /(?:data-hotel|class="[^"]*hotel[^"]*"|name="[^"]*hotel[^"]*")[^>]*>([^<]*)<\/[^>]*>(?:.*?(?:₹|Rs\.|price)[:\s]*([^<]*)<)?/gi;
      
      while ((match = dataPattern.exec(cleaned)) && count < 5) {
        const name = match[1]?.trim() || 'Hotel';
        const price = parsePrice(match[2] || '');
        
        if (name && name.length > 2) {
          hotels.push({
            name,
            price,
            location: destination,
            url,
          });
          count++;
        }
      }
    }
    
    return hotels;
  } catch (error) {
    console.error('Error parsing hotels:', error);
    return [];
  }
};

/**
 * Parse HTML and extract train information using pure regex/HTML parsing
 */
const parseTrains = (html: string, origin: string, destination: string, url: string): TrainResult[] => {
  if (!html || html.length < 50) {
    return [];
  }

  try {
    const cleaned = cleanHtml(html);
    const trains: TrainResult[] = [];

    // Pattern for train listings: train number/name, departure time, arrival time, duration, price
    const trainPattern = /(?:train|railway)[\s:]*([^\n<]{2,50}?)[\s<].*?(?:no\.?|number)[\s:]*(\d+)[\s<].*?(?:depart|from)[\s:]*(\d{1,2}:\d{2})[\s<].*?(?:arrive|to)[\s:]*(\d{1,2}:\d{2})[\s<].*?(?:duration|time)[\s:]*([^\n<]{2,30}?)[\s<].*?(?:price|fare)[\s:]*([^\n<]{2,30}?)\s*[<\n]/gi;
    
    let match;
    let count = 0;
    
    while ((match = trainPattern.exec(cleaned)) && count < 5) {
      const trainName = match[1]?.trim() || 'Train';
      const trainNumber = match[2]?.trim() || '';
      const departure = parseTime(match[3] || '');
      const arrival = parseTime(match[4] || '');
      const duration = parseDuration(match[5] || '');
      const price = parsePrice(match[6] || '');
      
      if (trainName && trainName.length > 2) {
        trains.push({
          trainName,
          trainNumber,
          departure,
          arrival,
          duration,
          price,
          url,
        });
        count++;
      }
    }
    
    return trains;
  } catch (error) {
    console.error('Error parsing trains:', error);
    return [];
  }
};

/**
 * Parse HTML and extract bus information using pure regex/HTML parsing
 */
const parseBuses = (html: string, origin: string, destination: string, url: string): BusResult[] => {
  if (!html || html.length < 50) {
    return [];
  }

  try {
    const cleaned = cleanHtml(html);
    const buses: BusResult[] = [];

    // Pattern for bus listings: bus name, departure time, arrival time, duration, price, seats, rating
    const busPattern = /(?:bus|coach)[\s:]*([^\n<]{2,50}?)[\s<].*?(?:depart|from)[\s:]*(\d{1,2}:\d{2})[\s<].*?(?:arrive|to)[\s:]*(\d{1,2}:\d{2})[\s<].*?(?:duration|time)[\s:]*([^\n<]{2,30}?)[\s<].*?(?:price|fare)[\s:]*([^\n<]{2,30}?)[\s<]/gi;
    
    let match;
    let count = 0;
    
    while ((match = busPattern.exec(cleaned)) && count < 5) {
      const busName = match[1]?.trim() || 'Bus';
      const departure = parseTime(match[2] || '');
      const arrival = parseTime(match[3] || '');
      const duration = parseDuration(match[4] || '');
      const price = parsePrice(match[5] || '');
      
      if (busName && busName.length > 2) {
        buses.push({
          busName,
          departure,
          arrival,
          duration,
          price,
          url,
        });
        count++;
      }
    }
    
    return buses;
  } catch (error) {
    console.error('Error parsing buses:', error);
    return [];
  }
};

/**
 * Parse HTML and extract activity information using pure regex/HTML parsing
 */
const parseActivities = (html: string, destination: string, url: string): ActivityResult[] => {
  if (!html || html.length < 50) {
    return [];
  }

  try {
    const cleaned = cleanHtml(html);
    const activities: ActivityResult[] = [];

    // Pattern for activity listings: activity name, description, price, rating, duration
    const activityPattern = /(?:activity|tour|experience)[\s:]*([^\n<]{2,100}?)[\s<].*?(?:description|details)[\s:]*([^\n<]{2,150}?)[\s<].*?(?:price|cost)[\s:]*([^\n<]{2,30}?)[\s<].*?(?:rating|⭐|★)[\s:]*([^\n<]{2,20})?/gi;
    
    let match;
    let count = 0;
    
    while ((match = activityPattern.exec(cleaned)) && count < 5) {
      const name = match[1]?.trim() || 'Activity';
      const description = match[2]?.trim() || '';
      const price = parsePrice(match[3] || '');
      const rating = parseRating(match[4] || '');
      
      if (name && name.length > 2) {
        activities.push({
          name,
          description,
          price,
          rating,
          url,
        });
        count++;
      }
    }
    
    // Fallback: simpler pattern if above doesn't work
    if (activities.length === 0) {
      const simpleActivityPattern = /([A-Za-z\s]{5,100}?)[\s<].*?(?:₹|\$|Rs\.|price)[\s:]*([^\n<]{2,30}?)\s*[<\n]/gi;
      
      while ((match = simpleActivityPattern.exec(cleaned)) && count < 5) {
        const name = match[1]?.trim() || 'Activity';
        const price = parsePrice(match[2] || '');
        
        if (name && name.length > 5 && !name.includes('</')) {
          activities.push({
            name,
            price,
            url,
          });
          count++;
        }
      }
    }
    
    return activities;
  } catch (error) {
    console.error('Error parsing activities:', error);
    return [];
  }
};

/**
 * Parse HTML and extract car booking information using pure regex/HTML parsing
 */
const parseCarBookings = (html: string, origin: string, destination: string, url: string): CarBookingResult[] => {
  if (!html || html.length < 50) {
    return [];
  }

  try {
    const cleaned = cleanHtml(html);
    const cars: CarBookingResult[] = [];

    // Pattern for car listings: car type, price, capacity, rating
    const carPattern = /(?:car|vehicle|taxi|cab)[\s:]*([^\n<]{2,80}?)[\s<].*?(?:price|fare|cost)[\s:]*([^\n<]{2,30}?)[\s<].*?(?:capacity|seats|passenger)[\s:]*(\d+)[\s<].*?(?:rating|⭐|★)[\s:]*([^\n<]{2,20})?/gi;
    
    let match;
    let count = 0;
    
    while ((match = carPattern.exec(cleaned)) && count < 5) {
      const carType = match[1]?.trim() || 'Car';
      const price = parsePrice(match[2] || '');
      const capacity = parseInt(match[3] || '4');
      const rating = parseRating(match[4] || '');
      
      if (carType && carType.length > 2) {
        cars.push({
          carType,
          price,
          capacity: capacity || 4,
          url,
          rating,
        });
        count++;
      }
    }
    
    // Fallback: simpler pattern
    if (cars.length === 0) {
      const simpleCarPattern = /([A-Za-z\s0-9]{3,60}?)[\s<].*?(?:₹|\$|Rs\.|fare)[\s:]*([^\n<]{2,30}?)\s*[<\n]/gi;
      
      while ((match = simpleCarPattern.exec(cleaned)) && count < 5) {
        const carType = match[1]?.trim() || 'Car';
        const price = parsePrice(match[2] || '');
        
        if (carType && carType.length > 3 && !carType.includes('</')) {
          cars.push({
            carType,
            price,
            capacity: 4,
            url,
          });
          count++;
        }
      }
    }
    
    return cars;
  } catch (error) {
    console.error('Error parsing car bookings:', error);
    return [];
  }
};

/**
 * Parse airport car bookings using pure regex/HTML parsing
 */
const parseAirportCarBookings = (html: string, origin: string, url: string): CarBookingResult[] => {
  return parseCarBookings(html, origin, 'Airport', url);
};

/**
 * Main function to fetch all travel booking data
 * This would typically be called from a backend API route
 */
export async function fetchTravelBookings(
  origin: string,
  destination: string,
  date?: string
): Promise<TravelBookingData> {
  const urls = buildTravelUrls(origin, destination, date);
  const errors: string[] = [];
  const results: TravelBookingData = {
    hotels: [],
    trains: [],
    buses: [],
    activities: [],
    cars: [],
    airports: [],
    fetchedAt: new Date(),
    errors: [],
  };

  try {
    // Create AbortController for timeout (5 seconds)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 5000);

    try {
      // Fetch all data in parallel
      const [hotelsHtml, trainsHtml, busesHtml, activitiesHtml, carsHtml, airportCarsHtml] = await Promise.allSettled([
        fetch(urls.hotels, { signal: abortController.signal }).then((r) => r.text()),
        fetch(urls.trains, { signal: abortController.signal }).then((r) => r.text()),
        fetch(urls.buses, { signal: abortController.signal }).then((r) => r.text()),
        fetch(urls.activities, { signal: abortController.signal }).then((r) => r.text()),
        fetch(urls.carBooking, { signal: abortController.signal }).then((r) => r.text()),
        fetch(urls.airportCabs, { signal: abortController.signal }).then((r) => r.text()),
      ]);

      clearTimeout(timeoutId);

      // Process results with pure HTML parsing (no Groq)
      if (hotelsHtml.status === 'fulfilled') {
        results.hotels = parseHotels(hotelsHtml.value, destination, urls.hotels);
      } else {
        errors.push('Failed to fetch hotels');
        results.hotels = parseHotels('', destination, urls.hotels);
      }

      if (trainsHtml.status === 'fulfilled') {
        results.trains = parseTrains(trainsHtml.value, origin, destination, urls.trains);
      } else {
        errors.push('Failed to fetch trains');
        results.trains = parseTrains('', origin, destination, urls.trains);
      }

      if (busesHtml.status === 'fulfilled') {
        results.buses = parseBuses(busesHtml.value, origin, destination, urls.buses);
      } else {
        errors.push('Failed to fetch buses');
        results.buses = parseBuses('', origin, destination, urls.buses);
      }

      if (activitiesHtml.status === 'fulfilled') {
        results.activities = parseActivities(activitiesHtml.value, destination, urls.activities);
      } else {
        errors.push('Failed to fetch activities');
        results.activities = parseActivities('', destination, urls.activities);
      }

      if (carsHtml.status === 'fulfilled') {
        results.cars = parseCarBookings(carsHtml.value, origin, destination, urls.carBooking);
      } else {
        errors.push('Failed to fetch car bookings');
        results.cars = parseCarBookings('', origin, destination, urls.carBooking);
      }

      if (airportCarsHtml.status === 'fulfilled') {
        results.airports = parseAirportCarBookings(airportCarsHtml.value, origin, urls.airportCabs);
      } else {
        errors.push('Failed to fetch airport cars');
        results.airports = parseAirportCarBookings('', origin, urls.airportCabs);
      }

      results.errors = errors;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('Error fetching travel bookings:', error);
    results.errors = [error instanceof Error ? error.message : 'Unknown error occurred'];

    // Provide fallback (empty results)
    results.hotels = [];
    results.trains = [];
    results.buses = [];
    results.activities = [];
    results.cars = [];
    results.airports = [];
  }

  return results;
}

/**
 * Utility function to format price for display
 */
export const formatPrice = (price: string | undefined): string => {
  return price || 'Contact for price';
};

/**
 * Utility function to render rating stars
 */
export const renderRating = (rating: number | undefined): string => {
  if (!rating) return 'N/A';
  return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
};
