import 'server-only';

export type FlightOption = {
  airline?: string;
  flightNumber?: string;
  departTime?: string;
  arriveTime?: string;
  duration?: string;
  price?: string;
  notes?: string;
};

export async function fetchFlightsFromService(origin: string, destination: string, travelDates?: string): Promise<FlightOption[]> {
  try {
    // Use the provided mock API
    const apiUrl = 'https://parimaladini-flights-mock-api.hf.space/api/flights';
    const url = new URL(apiUrl);
    
    // Convert city names to airport codes (basic mapping)
    const originCode = getAirportCode(origin);
    const destinationCode = getAirportCode(destination);
    
    url.searchParams.set('source', originCode);
    url.searchParams.set('destination', destinationCode);
    
    if (travelDates) {
      url.searchParams.set('date', travelDates);
    }
    
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) return [];
    
    const data = await res.json();
    return Array.isArray(data) ? data as FlightOption[] : [];
  } catch (error) {
    console.error('Error fetching flights from API:', error);
    return [];
  }
}

// Helper function to convert city names to airport codes
function getAirportCode(cityName: string): string {
  const cityToCode: Record<string, string> = {
    // Major cities and their airport codes
    'new york': 'JFK',
    'los angeles': 'LAX',
    'london': 'LHR',
    'paris': 'CDG',
    'tokyo': 'NRT',
    'delhi': 'DEL',
    'delhi ncr': 'DEL',
    'mumbai': 'BOM',
    'bangalore': 'BLR',
    'goa': 'GOI',
    'hyderabad': 'HYD',
    'kolkata': 'CCU',
    'your city': 'DEL', // default
  };
  
  const normalized = cityName.toLowerCase().trim();
  return cityToCode[normalized] || normalized.toUpperCase().substring(0, 3);
}
