"""
Trip Planning Agent with comprehensive tools for flights, hotels, guides,
trains, car rentals, restaurants, hospitals, and nearby attractions.
"""

import os
import re
import requests
from typing import Any, Dict, List, Optional
from google.adk.agents import Agent


# ============================================================================
# Helpers
# ============================================================================

def _get_airport_code(city: str) -> str:
    """Convert city name to IATA airport code (basic mapping, fallback to prefix)."""
    mapping = {
        'new york': 'JFK',
        'los angeles': 'LAX',
        'london': 'LHR',
        'paris': 'CDG',
        'tokyo': 'NRT',
        'delhi': 'DEL',
        'mumbai': 'BOM',
        'bangalore': 'BLR',
        'hyderabad': 'HYD',
        'goa': 'GOI',
        'kolkata': 'CCU',
        'pune': 'PNQ',
        'jaipur': 'JAI',
    }
    key = (city or '').strip().lower()
    return mapping.get(key, (key.replace(' ', '')[:3].upper() or 'XXX'))


def call_perplexity(prompt: str) -> Dict[str, Any]:
    """Call Perplexity API for advanced search/summarization if key is available.

    Args:
        prompt: Query to search and summarize.

    Returns:
        dict with 'status': 'ok' or 'error', and 'result' or 'error_message'.
    """
    api_key = os.environ.get('PERPLEXITY_API_KEY') or os.environ.get('PPLX_API_KEY')
    if not api_key:
        return {'status': 'unavailable', 'error_message': 'Perplexity API key not configured'}

    try:
        # Note: Perplexity API endpoint/structure may vary; adjust as needed
        # This is a placeholder that attempts a basic search endpoint
        url = 'https://api.perplexity.ai/chat/completions'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': 'pplx-7b-online',
            'messages': [
                {'role': 'user', 'content': prompt}
            ],
            'max_tokens': 500,
        }
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        # Extract assistant message
        if 'choices' in data and len(data['choices']) > 0:
            content = data['choices'][0].get('message', {}).get('content', '')
            return {'status': 'ok', 'result': content}
        return {'status': 'ok', 'result': str(data)}
    except Exception as e:
        return {'status': 'error', 'error_message': str(e)}


def duckduckgo_search(query: str) -> Dict[str, Any]:
    """Use DuckDuckGo Instant Answer API as a lightweight fallback for web search.

    Args:
        query: Search query.

    Returns:
        dict with search results (abstract, related topics).
    """
    try:
        params = {
            'q': query,
            'format': 'json',
            'no_html': 1,
            'skip_disambig': 1,
        }
        response = requests.get('https://api.duckduckgo.com/', params=params, timeout=8)
        response.raise_for_status()
        data = response.json()
        return {
            'status': 'ok',
            'query': query,
            'abstract': data.get('AbstractText'),
            'source': data.get('AbstractSource'),
            'related_topics': data.get('RelatedTopics', []),
        }
    except Exception as e:
        return {'status': 'error', 'error_message': str(e)}


# ============================================================================
# Main Tools
# ============================================================================

def input_parser(raw_text: str) -> Dict[str, Any]:
    """Parse free-form trip planning request into structured intents and fields.

    Uses regex heuristics to detect travel intents (flights, hotels, etc.)
    and extract key info (origin, destination, date, party size).
    If Perplexity is available, also attempts LLM-based structured extraction.

    Args:
        raw_text: Free-form user input (e.g., "Plan my 5-day trip to Bali from Delhi on Nov 10").

    Returns:
        dict with parsed intents, destination, origin, date, party_size, and optional llm_parse.
    """
    text = (raw_text or '').strip()
    lower = text.lower()

    # Heuristic regex patterns for intents
    intents = {
        'flights': bool(re.search(r'\b(flight|fly|airline|ticket|air travel)\b', lower)),
        'hotels': bool(re.search(r'\b(hotel|stay|room|accommodation|lodge|resort)\b', lower)),
        'cars': bool(re.search(r'\b(car|rental|taxi|uber|ola|vehicle)\b', lower)),
        'trains': bool(re.search(r'\b(train|rail|express|railway)\b', lower)),
        'guides': bool(re.search(r'\b(guide|tour guide|local guide|tourist guide)\b', lower)),
        'restaurants': bool(re.search(r'\b(restaurant|food|dining|dinner|lunch|breakfast|cafe)\b', lower)),
        'hospitals': bool(re.search(r'\b(hospital|clinic|medical|emergency|health)\b', lower)),
        'places': bool(re.search(r'\b(place|attraction|visit|sightseeing|nearby|landmark)\b', lower)),
    }

    # Extract key information
    dest_match = re.search(r'\bto\s+([A-Za-z\s]+?)(?:\bfrom\b|\bon\b|\bfor\b|,|$)', text, flags=re.I)
    origin_match = re.search(r'\bfrom\s+([A-Za-z\s]+?)(?:\bto\b|\bon\b|\bfor\b|,|$)', text, flags=re.I)
    date_match = re.search(r'(\d{4}-\d{2}-\d{2}|\b\d{1,2}\s+\w+\s+\d{4}\b)', text)
    party_match = re.search(r'(?:party of|family of|group of|for)\s+(\d{1,2})\s+(?:people|persons|adults|travelers)', lower)

    parsed = {
        'original_input': raw_text,
        'detected_intents': [k for k, v in intents.items() if v],
        'destination': dest_match.group(1).strip() if dest_match else None,
        'origin': origin_match.group(1).strip() if origin_match else None,
        'date': date_match.group(1) if date_match else None,
        'party_size': int(party_match.group(1)) if party_match else None,
    }

    # Optionally use Perplexity for richer parsing
    pp_result = call_perplexity(
        f"Parse this trip planning request into JSON: destination, origin, date, party_size, intents. Input: {text}"
    )
    if pp_result.get('status') == 'ok':
        parsed['llm_parse_attempt'] = pp_result.get('result')

    return {'status': 'ok', 'parsed': parsed}


def get_flights(origin: str, destination: str, date: Optional[str] = None) -> Dict[str, Any]:
    """Fetch flight options from the mock flights API.

    Args:
        origin: Origin city name or airport code.
        destination: Destination city name or airport code.
        date: Travel date (YYYY-MM-DD or optional).

    Returns:
        dict with available flight options or error.
    """
    try:
        src_code = _get_airport_code(origin or 'DEL')
        dst_code = _get_airport_code(destination or 'BOM')
        api_url = 'https://parimaladini-flights-mock-api.hf.space/api/flights'
        params = {'source': src_code, 'destination': dst_code}
        if date:
            params['date'] = date

        response = requests.get(api_url, params=params, timeout=10)
        response.raise_for_status()
        flights = response.json()

        return {
            'status': 'ok',
            'source': src_code,
            'destination': dst_code,
            'date': date,
            'flight_count': len(flights) if isinstance(flights, list) else 0,
            'flights': flights,
        }
    except Exception as e:
        return {'status': 'error', 'error_message': f'Failed to fetch flights: {str(e)}'}


def web_search(query: str) -> Dict[str, Any]:
    """High-level web search: prefer Perplexity for rich summaries, fallback to DuckDuckGo.

    Args:
        query: Search query.

    Returns:
        dict with search result and source ('perplexity' or 'duckduckgo').
    """
    # Try Perplexity first for rich, summarized results
    pp_result = call_perplexity(query)
    if pp_result.get('status') == 'ok':
        return {'status': 'ok', 'source': 'perplexity', 'summary': pp_result.get('result')}

    # Fallback to DuckDuckGo
    dd_result = duckduckgo_search(query)
    return {'status': 'ok', 'source': 'duckduckgo', 'result': dd_result}


def hotels_search(
    location: str,
    checkin: Optional[str] = None,
    checkout: Optional[str] = None,
    adults: Optional[int] = None,
) -> Dict[str, Any]:
    """Search for hotels in a location with optional check-in/out dates and party size.

    Args:
        location: City or region.
        checkin: Check-in date (optional).
        checkout: Check-out date (optional).
        adults: Number of adults (optional).

    Returns:
        dict with hotel search results.
    """
    query_parts = [f'hotels in {location}']
    if checkin and checkout:
        query_parts.append(f'from {checkin} to {checkout}')
    if adults:
        query_parts.append(f'for {adults} adults')

    query = ' '.join(query_parts)
    search_result = web_search(query)
    return {'status': 'ok', 'search_query': query, 'result': search_result}


def fetch_preferred_hotels(
    location: str,
    preferences: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Fetch hotels matching user preferences (e.g., luxury, budget, beachfront).

    Args:
        location: City or region.
        preferences: List of preferences (e.g., ['luxury', 'beachfront', 'family-friendly']).

    Returns:
        dict with preferred hotel recommendations.
    """
    pref_str = ' '.join(preferences) if preferences else 'best'
    query = f'{pref_str} hotels in {location} reviews ratings'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'location': location,
        'preferences': preferences or [],
        'search_query': query,
        'result': search_result,
    }


def get_local_guides(location: str) -> Dict[str, Any]:
    """Find local tour guides in the specified location with contact details.

    Args:
        location: City or region.

    Returns:
        dict with guide information (names, specializations, languages, contact).
    """
    query = f'local tour guides in {location} phone number specialization languages experience'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'location': location,
        'query': query,
        'result': search_result,
    }


def trains_tool(
    origin: str,
    destination: str,
    date: Optional[str] = None,
) -> Dict[str, Any]:
    """Search for train services between two cities.

    Args:
        origin: Departure city.
        destination: Arrival city.
        date: Travel date (optional).

    Returns:
        dict with train options, schedules, and fares.
    """
    date_str = f'on {date}' if date else ''
    query = f'trains from {origin} to {destination} {date_str} schedule fares availability'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'origin': origin,
        'destination': destination,
        'date': date,
        'query': query,
        'result': search_result,
    }


def car_rentals_tool(location: str) -> Dict[str, Any]:
    """Find car rental options in the specified location.

    Args:
        location: City or region.

    Returns:
        dict with car rental companies, daily rates, and requirements.
    """
    query = f'car rentals in {location} daily price requirements age license insurance'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'location': location,
        'query': query,
        'result': search_result,
    }


def restaurants_tool(
    location: str,
    cuisine: Optional[str] = None,
) -> Dict[str, Any]:
    """Find popular restaurants in the location, optionally filtered by cuisine.

    Args:
        location: City or region.
        cuisine: Cuisine type (e.g., 'Indian', 'Italian', optional).

    Returns:
        dict with restaurant recommendations, reviews, and ratings.
    """
    cuisine_str = f'{cuisine}' if cuisine else 'best'
    query = f'{cuisine_str} restaurants in {location} top rated reviews ratings'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'location': location,
        'cuisine': cuisine,
        'query': query,
        'result': search_result,
    }


def hospitals_tool(location: str) -> Dict[str, Any]:
    """Find hospitals and medical facilities near the location.

    Args:
        location: City or region.

    Returns:
        dict with hospital information, emergency contacts, and addresses.
    """
    query = f'hospitals near {location} emergency contact address 24-hour'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'location': location,
        'query': query,
        'result': search_result,
    }


def nearby_places_tool(
    location: str,
    radius_km: int = 100,
) -> Dict[str, Any]:
    """Find attractions and famous places within a radius of the location.

    Args:
        location: City or region.
        radius_km: Search radius in kilometers (default 100).

    Returns:
        dict with nearby attractions, landmarks, and points of interest.
    """
    query = f'attractions and places to visit within {radius_km} km of {location} landmarks must-see'
    search_result = web_search(query)
    return {
        'status': 'ok',
        'location': location,
        'radius_km': radius_km,
        'query': query,
        'result': search_result,
    }


# ============================================================================
# Agent Definition
# ============================================================================

root_agent = Agent(
    name='trip_planner_agent',
    model='gemini-2.0-flash',
    description='A comprehensive trip planning agent that helps users plan their travel by fetching flights, hotels, guides, trains, cars, restaurants, hospitals, and nearby attractions.',
    instruction=(
        'You are a helpful Trip Planning Assistant. When a user arrives with a travel request, '
        'first use the input_parser tool to understand their intent and extract key details (destination, origin, date, party size, intents). '
        'Then, based on detected intents, invoke the appropriate tools: '
        'get_flights for flight options, hotels_search for hotels, get_local_guides for tour guides, '
        'trains_tool for trains, car_rentals_tool for rental cars, restaurants_tool for dining, '
        'hospitals_tool for medical info, and nearby_places_tool for attractions. '
        'Consolidate all results into a clear, organized trip plan.'
    ),
    tools=[
        input_parser,
        get_flights,
        web_search,
        hotels_search,
        fetch_preferred_hotels,
        get_local_guides,
        trains_tool,
        car_rentals_tool,
        restaurants_tool,
        hospitals_tool,
        nearby_places_tool,
    ],
)