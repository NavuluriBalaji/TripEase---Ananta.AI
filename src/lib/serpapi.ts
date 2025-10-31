import 'server-only';

const SERPAPI_BASE = 'https://serpapi.com/search.json';

type SearchParams = Record<string, string | number | boolean | undefined>;

type SerpApiResponse<T = unknown> = {
  search_metadata?: unknown;
  search_parameters?: unknown;
  search_information?: unknown;
  error?: string;
} & T;

function buildQuery(params: SearchParams): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    usp.set(key, String(value));
  }
  return usp.toString();
}

async function serpApiFetch<T = unknown>(params: SearchParams): Promise<SerpApiResponse<T>> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error('SERPAPI_API_KEY is not set');
  }
  const gl = process.env.SERPAPI_DEFAULT_GL || 'us';
  const hl = process.env.SERPAPI_DEFAULT_HL || 'en';
  const query = buildQuery({ ...params, api_key: apiKey, gl, hl });
  const url = `${SERPAPI_BASE}?${query}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = (await res.json()) as SerpApiResponse<T>;
  if (!res.ok || (json as any).error) {
    throw new Error((json as any).error || `SerpAPI error: ${res.status}`);
  }
  return json;
}

// Google Flights Airports (structured airports for origin/destination)
export async function flightsAirports(originQuery: string, destinationQuery: string) {
  // The airports engine supports discovering departure/arrival airports for a query
  // We call it twice to resolve origin and destination suggestions
  const [originAirports, destinationAirports] = await Promise.all([
    serpApiFetch({ engine: 'google_flights_airports', q: originQuery }),
    serpApiFetch({ engine: 'google_flights_airports', q: destinationQuery }),
  ]);
  return { originAirports, destinationAirports };
}

// Generic flights search to elicit price snippets
export async function searchFlights(origin: string, destination: string, travelDates?: string) {
  const q = `flights from ${origin} to ${destination} ${travelDates ?? ''} price`;
  return serpApiFetch({ engine: 'google', q });
}

// Google Hotels Properties (structured hotels list)
export async function hotelsProperties(place: string, checkIn: string, checkOut: string, adults?: number) {
  return serpApiFetch({ engine: 'google_hotels_properties', q: place, check_in_date: checkIn, check_out_date: checkOut, adults });
}

export async function searchHotels(place: string, checkIn?: string, checkOut?: string, adults?: number) {
  const partyHint = adults ? ` for ${adults} adults` : '';
  if (checkIn && checkOut) {
    // Prefer structured properties when dates are present; fallback to generic search if unsupported
    try {
      return await hotelsProperties(place, checkIn, checkOut, adults);
    } catch (e) {
      return serpApiFetch({ engine: 'google', q: `best mid-range hotels in ${place}${partyHint} from ${checkIn} to ${checkOut} with prices` });
    }
  }
  return serpApiFetch({ engine: 'google', q: `best mid-range hotels in ${place}${partyHint} with prices` });
}

export async function searchCarRentals(place: string) {
  return serpApiFetch({ engine: 'google', q: `car rentals in ${place} phone price` });
}

export async function searchBikeRentals(place: string) {
  return serpApiFetch({ engine: 'google', q: `bike rentals in ${place} phone price` });
}

export async function searchBarsAndClubs(place: string) {
  return serpApiFetch({ engine: 'google', q: `best bars and clubs in ${place}` });
}

export async function searchAttractions(place: string) {
  return serpApiFetch({ engine: 'google', q: `best places to visit in ${place}` });
}

export async function searchLocalGuides(place: string) {
  return serpApiFetch({ engine: 'google', q: `local tour guides in ${place} phone number` });
}
