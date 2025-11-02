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

export interface GuideResult {
  name: string;
  description?: string;
  price?: string;
  rating?: number;
  url: string;
  image?: string;
  location?: string;
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
  guides?: GuideResult[];
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
  // Helpers: station code mapping and date formatting, adapted from the Python agent
  const normalize = (s: string) => (s || '').trim();
  const toSlug = (s: string) => normalize(s).replace(/\s+/g, '-');

  const getRailwayStationCode = (city: string): { code: string; useAllStations: boolean } => {
    const key = (city || '').trim().toLowerCase();

    const allStations: Record<string, string> = {
      mumbai: 'CSMT',
      delhi: 'NDLS',
      kolkata: 'KOAA',
      chennai: 'MAS',
      bangalore: 'SBC',
      bengaluru: 'SBC',
      hyderabad: 'HYB',
      secunderabad: 'SC',
      lucknow: 'LKO',
      kanpur: 'CNB',
      varanasi: 'BSB',
      prayagraj: 'PRYJ',
      allahabad: 'PRYJ',
      ahmedabad: 'ADI',
      pune: 'PUNE',
      jaipur: 'JP',
      bhopal: 'BPL',
      habibganj: 'HBJ',
      patna: 'PNBE',
      bhubaneswar: 'BBS',
      guwahati: 'GHY',
      thiruvananthapuram: 'TVC',
      ernakulam: 'ERS',
      kochi: 'ERS',
      vijayawada: 'BZA',
      visakhapatnam: 'VSKP',
    };

    const singleStations: Record<string, string> = {
      ongole: 'OGL',
      nellore: 'NLR',
      guntur: 'GNT',
      tirupati: 'TPTY',
      warangal: 'WL',
      aurangabad: 'AWB',
      nashik: 'NK',
      agra: 'AGC',
      mathura: 'MTJ',
      indore: 'INDB',
      ujjain: 'UJN',
      gwalior: 'GWL',
      raipur: 'R',
      bilaspur: 'BSP',
      ranchi: 'RNC',
      darbhanga: 'DBG',
      muzaffarpur: 'MFP',
      silchar: 'SCL',
      dimapur: 'DMV',
      agartala: 'AGTL',
      amritsar: 'ASR',
      chandigarh: 'CDG',
      shimla: 'SML',
      jammu: 'JAT',
      srinagar: 'SINA',
      katra: 'SVDK',
      bathinda: 'BTI',
      ludhiana: 'LDH',
      pathankot: 'PTK',
      goa: 'MAO',
      vadodara: 'BRC',
    };

    if (key in allStations) return { code: allStations[key], useAllStations: true };
    if (key in singleStations) return { code: singleStations[key], useAllStations: false };
    const fallback = (key.replace(/\s+/g, '').slice(0, 3).toUpperCase() || 'STN');
    return { code: fallback, useAllStations: false };
  };

  const formatDateForEMT = (d?: string) => {
    // EMT railways endpoint accepts DD/MM/YYYY; allow common inputs
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const today = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    if (!d) return today;
    const s = d.trim();
    // YYYY-MM-DD
    const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m1) return `${m1[3]}/${m1[2]}/${m1[1]}`;
    // DD-MM-YYYY
    const m2 = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (m2) return `${m2[1]}/${m2[2]}/${m2[3]}`;
    // DD/MM/YYYY already
    const m3 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m3) return s;
    return today;
  };

  const { code: oCode, useAllStations: oAll } = getRailwayStationCode(origin);
  const { code: dCode, useAllStations: dAll } = getRailwayStationCode(destination);
  const oPart = oAll ? `${toSlug(origin)}--All-Stations-(StationCode)` : oCode;
  const dPart = dAll ? `${toSlug(destination)}--All-Stations-(StationCode)` : dCode;
  const trainDate = formatDateForEMT(date);

  return {
    hotels: `https://www.easemytrip.com/hotels/hotels-in-${destination.toLowerCase()}`,
    trains: `https://railways.easemytrip.com/TrainListInfo/${oPart}-to-${dPart}/2/${trainDate}`,
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
  date?: string,
  opts?: {
    hotelsCity?: string;
    rentalsCity?: string;
    guidesCity?: string;
  }
): Promise<TravelBookingData> {
  const urls = buildTravelUrls(origin, destination, date); // retained for future, but EMT is not used in this booking flow
  const errors: string[] = [];
  const results: TravelBookingData = {
    hotels: [],
    trains: [],
    buses: [],
    activities: [],
    guides: [],
    cars: [],
    airports: [],
    fetchedAt: new Date(),
    errors: [],
  };

  try {
    // Create AbortController for timeout (15 seconds; HF endpoints can be slow)
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 15000);

    try {
      // External API endpoints provided by user
      const isoDateOrToday = (() => {
        if (date && /\d{4}-\d{2}-\d{2}/.test(date)) return date;
        const now = new Date();
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      })();

  const hotelsCity = (opts?.hotelsCity || destination).trim();
  const rentalsCity = (opts?.rentalsCity || origin).trim();
  const guidesCity = (opts?.guidesCity || destination).trim();

  const hotelsApi = `https://parimaladini-flights-mock-api.hf.space/api/hotels?city=${encodeURIComponent(hotelsCity)}&date=${encodeURIComponent(isoDateOrToday)}&count=10`;
  const guidesApi = `https://parimaladini-flights-mock-api.hf.space/api/guides?city=${encodeURIComponent(guidesCity)}&date=${encodeURIComponent(isoDateOrToday)}&count=10`;
  const carsApi = `http://127.0.0.1:8000/api/rentals?city=${encodeURIComponent(rentalsCity)}&date=${encodeURIComponent(isoDateOrToday)}&type=car&count=10`;

      const jsonHeaders: RequestInit = {
        headers: {
          'Accept': 'application/json, text/plain;q=0.9,*/*;q=0.8',
          'User-Agent': 'TripEase/1.0 (+https://github.com/NavuluriBalaji/TripEase---Ananta.AI)'
        },
        signal: abortController.signal,
      };
      // No HTML scraping for booking page; only the provided JSON APIs are used.

      // Fetch all data in parallel using ONLY the provided JSON APIs (no EMT scraping)
      const [
        hotelsJson,
        carsJson,
        guidesJson,
        busesJson,
        eventsJson,
      ] = await Promise.allSettled([
        fetch(hotelsApi, jsonHeaders).then(async (r) => { try { return await r.json(); } catch { throw new Error('Invalid hotels JSON'); } }),
        fetch(carsApi, jsonHeaders).then(async (r) => { try { return await r.json(); } catch { throw new Error('Invalid cars JSON'); } }),
        fetch(guidesApi, jsonHeaders).then(async (r) => { try { return await r.json(); } catch { throw new Error('Invalid guides JSON'); } }),
        // External buses and events (JSON)
        fetch(`https://parimaladini-flights-mock-api.hf.space/api/buses?source=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(isoDateOrToday)}&count=10`, jsonHeaders)
          .then(async (r) => { try { return await r.json(); } catch { throw new Error('Invalid buses JSON'); } }),
        fetch(`https://parimaladini-flights-mock-api.hf.space/api/events?destination=${encodeURIComponent(destination)}&date=${encodeURIComponent(isoDateOrToday)}&count=10`, jsonHeaders)
          .then(async (r) => { try { return await r.json(); } catch { throw new Error('Invalid events JSON'); } }),
      ]);

      clearTimeout(timeoutId);

      // Helper to pick an array from various JSON shapes
      const pickArray = (val: any, keys: string[] = []): any[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        for (const k of [
          'data', 'results', 'items', 'hotels', 'records', 'list', 'payload', 'response',
          ...keys
        ]) {
          const v = val?.[k];
          if (Array.isArray(v)) return v;
        }
        // Try nested data.* arrays
        const data = val?.data;
        if (data) {
          for (const k of ['hotels', 'results', 'items', 'list']) {
            const v = data?.[k];
            if (Array.isArray(v)) return v;
          }
        }
        return [];
      };

      // Ensure a minimum number of items by lightly cloning existing ones
      const ensureAtLeast = <T>(arr: T[], min: number, cloner: (item: T, idx: number) => T): T[] => {
        if (arr.length === 0) return arr;
        const out = [...arr];
        let i = 0;
        while (out.length < min) {
          const base = out[i % arr.length];
          out.push(cloner(base, out.length));
          i++;
        }
        return out;
      };

      // Hotels: external JSON API only
      if (hotelsJson.status === 'fulfilled') {
        const arr = pickArray(hotelsJson.value, ['hotels']);
        if (arr.length) {
          results.hotels = arr.slice(0, 10).map((h: any): HotelResult => ({
          name: String(h.name || h.title || 'Hotel'),
          price: h.price ? String(h.price) : h.amount ? String(h.amount) : undefined,
          rating: typeof h.rating === 'number' ? h.rating : undefined,
            location: String(h.city || destination),
            image: h.image || h.img || h.imageUrl || h.thumbnail || undefined,
            url: h.url || h.link || h.href || '',
          }));
          results.hotels = ensureAtLeast(results.hotels.slice(0, 5), 5, (it, idx) => ({
            ...it,
            name: `${it.name} • option ${idx}`,
            url: it.url ? `${it.url}${it.url.includes('#') ? '' : '#'}alt-${idx}` : ''
          }));
        } else {
          errors.push('Failed to fetch hotels');
        }
      } else {
        errors.push('Failed to fetch hotels');
      }

      // Trains: no external provider specified -> leave empty
      results.trains = [];

      // Buses: external JSON API only
      if (busesJson && busesJson.status === 'fulfilled') {
        const arr = pickArray(busesJson.value, ['buses', 'results', 'items']);
        if (arr.length) {
          results.buses = arr.slice(0, 10).map((b: any): BusResult => ({
            busName: String(b.name || b.title || b.operator || 'Bus'),
            departure: String(b.departure || b.departureTime || b.from_time || ''),
            arrival: String(b.arrival || b.arrivalTime || b.to_time || ''),
            duration: String(b.duration || b.time || ''),
            price: b.price ? String(b.price) : b.amount ? String(b.amount) : undefined,
            seats: typeof b.seats === 'number' ? b.seats : undefined,
            url: b.url || b.link || b.href || '',
            rating: typeof b.rating === 'number' ? b.rating : undefined,
          }));
          results.buses = ensureAtLeast(results.buses.slice(0, 5), 5, (it, idx) => ({
            ...it,
            busName: `${it.busName} • option ${idx}`,
            url: it.url ? `${it.url}${it.url.includes('#') ? '' : '#'}alt-${idx}` : ''
          }));
        } else {
          errors.push('Failed to fetch buses');
        }
      } else {
        errors.push('Failed to fetch buses');
      }

      // Activities: use external events JSON instead of EMT activities
      results.activities = [];
      if (eventsJson && eventsJson.status === 'fulfilled') {
        const ev = pickArray(eventsJson.value, ['events', 'items', 'results']);
        if (ev.length) {
          const extra = ev.slice(0, 10).map((e: any): ActivityResult => ({
            name: String(e.name || e.title || 'Event'),
            description: e.description || e.summary || undefined,
            price: e.price ? String(e.price) : e.amount ? String(e.amount) : undefined,
            rating: typeof e.rating === 'number' ? e.rating : undefined,
            url: e.url || e.link || e.href || '',
            image: e.image || e.img || e.imageUrl || undefined,
            duration: e.duration ? String(e.duration) : undefined,
          }));
          results.activities = ensureAtLeast(extra.slice(0, 5), 5, (it, idx) => ({
            ...it,
            name: `${it.name} • option ${idx}`,
            url: it.url ? `${it.url}${it.url.includes('#') ? '' : '#'}alt-${idx}` : ''
          }));
        } else {
          errors.push('Failed to fetch activities');
        }
      } else {
        errors.push('Failed to fetch activities');
      }

      // Cars: external JSON API only
      if (carsJson.status === 'fulfilled') {
        const arr = pickArray(carsJson.value, ['cars', 'rentals', 'vehicles']);
        if (arr.length) {
          results.cars = arr.slice(0, 10).map((c: any): CarBookingResult => ({
            carType: String(c.carType || c.name || c.model || 'Car'),
            price: c.price ? String(c.price) : c.amount ? String(c.amount) : undefined,
            capacity: typeof c.capacity === 'number' ? c.capacity : (parseInt(String(c.seats || c.capacity)) || 4),
            image: c.image || c.img || c.imageUrl || undefined,
            url: c.url || c.link || c.href || '',
            rating: typeof c.rating === 'number' ? c.rating : undefined,
          }));
          results.cars = ensureAtLeast(results.cars.slice(0, 5), 5, (it, idx) => ({
            ...it,
            carType: `${it.carType} • option ${idx}`,
            url: it.url ? `${it.url}${it.url.includes('#') ? '' : '#'}alt-${idx}` : ''
          }));
        } else {
          errors.push('Failed to fetch car bookings');
        }
      } else {
        errors.push('Failed to fetch car bookings');
      }

      // Airport cabs: no external provider specified -> leave empty
      results.airports = [];

      // Guides: new category via external API (optional for clients)
      if (guidesJson.status === 'fulfilled') {
        const val = guidesJson.value as any;
        const arr = pickArray(val, ['guides', 'experts']);
        results.guides = arr.slice(0, 10).map((g: any): GuideResult => ({
          name: String(g.name || g.title || 'Guide'),
          description: g.description || g.bio || undefined,
          price: g.price ? String(g.price) : undefined,
          rating: typeof g.rating === 'number' ? g.rating : undefined,
          url: g.url || g.link || g.href || '',
          image: g.image || g.img || g.imageUrl || undefined,
          location: g.city || g.location || destination,
        }));
        results.guides = ensureAtLeast(results.guides.slice(0, 5), 5, (it, idx) => ({
          ...it,
          name: `${it.name} • option ${idx}`,
          url: it.url ? `${it.url}${it.url.includes('#') ? '' : '#'}alt-${idx}` : ''
        }));
      } else {
        errors.push('Failed to fetch guides');
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
 * Post-processing sanitization to clean scraped data before sending to clients
 */
export function sanitizeTravelBookingData(data: TravelBookingData): TravelBookingData {
  const cleanText = (s?: string): string | undefined => {
    if (!s) return undefined;
    let t = s;
    // Normalize escape sequences and trim quotes
    t = t.replace(/\\n|\\r|\\t/g, ' ').replace(/\\"/g, '"').replace(/\\'/g, "'");
    t = t.replace(/^\s*["']+|["']+\s*$/g, '');
    // Collapse spaces
    t = t.replace(/\s{2,}/g, ' ').trim();
    // If it looks like an accidentally embedded JSON fragment, cut at first '","'
    if (t.includes('","')) {
      t = t.split('","')[0];
    }
    // Remove dangling JSON-like tail after ", <key>:
    t = t.replace(/",\s*\w+\s*:[\s\S]*$/g, '').trim();
    // Remove control characters
    t = t.replace(/[\x00-\x1F\x7F]/g, '').trim();
    return t;
  };

  const isGarbage = (t?: string): boolean => {
    if (!t) return true;
    const s = t.toLowerCase();
    // Heuristics to drop bad scraps
    if (s.includes('imglst') || s.includes('mview') || s.includes('matrix') || s.includes('aptxt')) return true;
    if (/[{}\[\]]/.test(s)) return true; // JSON-looking
    if (s.includes('":')) return true; // JSON key-value residue
    return s.length < 2;
  };

  const clampRating = (n?: number) => {
    if (typeof n !== 'number' || isNaN(n)) return undefined;
    return Math.max(0, Math.min(5, n));
  };

  const cleanPrice = (p?: string): string | undefined => {
    if (!p) return undefined;
    const t = cleanText(p) || '';
    // Keep reasonable price-like tokens only
    const m = t.match(/(?:₹|rs\.?|\$|€)?\s*\d[\d,]*\s*(?:inr|usd|eur)?/i);
    return m ? m[0].trim() : undefined;
  };

  const safeUrl = (u?: string): string | undefined => {
    if (!u) return undefined;
    try {
      const url = new URL(u, 'https://');
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    } catch {
      // ignore
    }
    return undefined;
  };

  const hotels = (data.hotels || [])
    .map((h) => ({
      ...h,
      name: cleanText(h.name) || 'Hotel',
      location: cleanText(h.location) || '',
      price: cleanPrice(h.price),
      rating: clampRating(h.rating),
      url: safeUrl(h.url) || h.url,
    }))
    .filter((h) => !isGarbage(h.name));

  const activities = (data.activities || [])
    .map((a) => ({
      ...a,
      name: cleanText(a.name) || 'Activity',
      description: cleanText(a.description),
      price: cleanPrice(a.price),
      rating: clampRating(a.rating),
      url: safeUrl(a.url) || a.url,
    }))
    .filter((a) => !isGarbage(a.name));

  const trains = (data.trains || []).map((t) => ({
    ...t,
    trainName: cleanText(t.trainName) || 'Train',
    trainNumber: cleanText(t.trainNumber) || '',
    departure: cleanText(t.departure) || '',
    arrival: cleanText(t.arrival) || '',
    duration: cleanText(t.duration) || '',
    price: cleanPrice(t.price),
    url: safeUrl(t.url) || t.url,
  })).filter((t) => !isGarbage(t.trainName));

  const buses = (data.buses || []).map((b) => ({
    ...b,
    busName: cleanText(b.busName) || 'Bus',
    departure: cleanText(b.departure) || '',
    arrival: cleanText(b.arrival) || '',
    duration: cleanText(b.duration) || '',
    price: cleanPrice(b.price),
    url: safeUrl(b.url) || b.url,
    rating: clampRating(b.rating),
  })).filter((b) => !isGarbage(b.busName));

  const cars = (data.cars || []).map((c) => ({
    ...c,
    carType: cleanText(c.carType) || 'Car',
    price: cleanPrice(c.price),
    url: safeUrl(c.url) || c.url,
    rating: clampRating(c.rating),
    capacity: c.capacity || 4,
  })).filter((c) => !isGarbage(c.carType));

  const airports = (data.airports || []).map((c) => ({
    ...c,
    carType: cleanText(c.carType) || 'Car',
    price: cleanPrice(c.price),
    url: safeUrl(c.url) || c.url,
    rating: clampRating(c.rating),
    capacity: c.capacity || 4,
  })).filter((c) => !isGarbage(c.carType));

  const guides = (data.guides || []).map((g) => ({
    ...g,
    name: cleanText(g.name) || 'Guide',
    description: cleanText(g.description),
    price: cleanPrice(g.price),
    rating: clampRating(g.rating),
    url: safeUrl(g.url) || g.url,
    image: g.image,
    location: cleanText(g.location),
  })).filter((g) => !isGarbage(g.name));

  const uniqueBy = <T, K extends keyof any>(arr: T[], key: (t: T) => K): T[] => {
    const map = new Map<K, T>();
    for (const item of arr) {
      map.set(key(item), item);
    }
    return Array.from(map.values());
  };

  return {
    ...data,
    hotels: uniqueBy(hotels, (h) => `${h.name}|${h.location}`),
    activities: uniqueBy(activities, (a) => `${a.name}|${a.price}`),
    trains: uniqueBy(trains, (t) => `${t.trainNumber}|${t.departure}|${t.arrival}`),
    buses: uniqueBy(buses, (b) => `${b.busName}|${b.departure}|${b.arrival}`),
    cars: uniqueBy(cars, (c) => `${c.carType}|${c.price}`),
    airports: uniqueBy(airports, (c) => `${c.carType}|${c.price}`),
    guides: uniqueBy(guides, (g) => `${g.name}|${g.location || ''}`),
  };
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
