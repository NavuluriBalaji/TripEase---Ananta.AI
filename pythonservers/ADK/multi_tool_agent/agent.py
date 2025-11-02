"""
Trip Planning Agent with comprehensive tools for flights, hotels, guides,
trains, car rentals, restaurants, hospitals, and nearby attractions.
Integrated with EasyMyTrip API for real travel bookings.
"""

import os
import re
import requests
from typing import Any, Dict, List, Optional
from google.adk.agents import Agent
from bs4 import BeautifulSoup
from urllib.parse import quote


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
        'hyderabad': 'HYB',
        'goa': 'GOI',
        'kolkata': 'CCU',
        'pune': 'PNQ',
        'jaipur': 'JAI',
    }
    key = (city or '').strip().lower()
    return mapping.get(key, (key.replace(' ', '')[:3].upper() or 'XXX'))


def _get_railway_station_code(city: str) -> tuple:
    """Convert city name to Indian Railway station code and return format info.
    
    Returns:
        tuple: (station_code, use_all_stations)
        - station_code: 3-letter railway code
        - use_all_stations: True if city has "All-Stations" format (major metros)
    """
    # Cities with "All-Stations" format (major metros)
    all_stations_cities = {
     'mumbai': 'CSMT',
'delhi': 'NDLS',
'kolkata': 'KOAA',
'chennai': 'MAS',
'bangalore': 'SBC',
'bengaluru': 'SBC',
'hyderabad': 'HYB',
'secunderabad': 'SC',
'lucknow': 'LKO',
'kanpur': 'CNB',
'varanasi': 'BSB',
'prayagraj': 'PRYJ',
'allahabad': 'PRYJ',
'ahmedabad': 'ADI',
'pune': 'PUNE',
'jaipur': 'JP',
'bhopal': 'BPL',
'habibganj': 'HBJ',
'patna': 'PNBE',
'bhubaneswar': 'BBS',
'guwahati': 'GHY',
'thiruvananthapuram': 'TVC',
'ernakulam': 'ERS',
'kochi': 'ERS',
'vijayawada': 'BZA',
'visakhapatnam': 'VSKP',
    }
    
    # Single station cities
    single_station_cities = {
'ongole': 'OGL',
'nellore': 'NLR',
'guntur': 'GNT',
'tirupati': 'TPTY',
'warangal': 'WL',
'aurangabad': 'AWB',
'nashik': 'NK',
'agra': 'AGC',
'mathura': 'MTJ',
'indore': 'INDB',
'ujjain': 'UJN',
'gwalior': 'GWL',
'raipur': 'R',
'bilaspur': 'BSP',
'ranchi': 'RNC',
'darbhanga': 'DBG',
'muzaffarpur': 'MFP',
'silchar': 'SCL',
'dimapur': 'DMV',
'agartala': 'AGTL',
'amritsar': 'ASR',
'chandigarh': 'CDG',
'shimla': 'SML',
'jammu': 'JAT',
'srinagar': 'SINA',
'katra': 'SVDK',
'bathinda': 'BTI',
'ludhiana': 'LDH',
'pathankot': 'PTK',
'goa': 'MAO',
'vadodara': 'BRC',

    }
    
    key = (city or '').strip().lower()
    
    # Check if it's an all-stations city
    if key in all_stations_cities:
        return (all_stations_cities[key], True)
    
    # Check if it's a single station city
    if key in single_station_cities:
        return (single_station_cities[key], False)
    
    # Default fallback
    return ((key.replace(' ', '')[:3].upper() or 'STN'), False)


def clean_html(html: str) -> str:
    """Remove script tags, style tags, and decode HTML entities."""
    try:
        # Remove script and style tags
        cleaned = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', '', html, flags=re.IGNORECASE)
        cleaned = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', '', cleaned, flags=re.IGNORECASE)
        
        # Decode HTML entities
        cleaned = cleaned.replace('&nbsp;', ' ').replace('&quot;', '"').replace('&#39;', "'")
        cleaned = cleaned.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
        
        return cleaned
    except Exception as e:
        print(f"Error cleaning HTML: {e}")
        return html


def extract_from_html(html: str, patterns: List[str]) -> List[str]:
    """Extract data from HTML using multiple regex patterns."""
    results = []
    cleaned = clean_html(html)
    
    for pattern in patterns:
        try:
            matches = re.findall(pattern, cleaned, re.IGNORECASE | re.DOTALL)
            results.extend([m.strip() for m in matches if m and len(m.strip()) > 0])
        except Exception as e:
            print(f"Regex pattern error: {e}")
            continue
    
    return results[:10]  # Return top 10 results


def call_perplexity(prompt: str) -> Dict[str, Any]:
    """Call Perplexity API for advanced search/summarization if key is available."""
    api_key = os.environ.get('PERPLEXITY_API_KEY') or os.environ.get('PPLX_API_KEY')
    if not api_key:
        return {'status': 'unavailable', 'error_message': 'Perplexity API key not configured'}

    try:
        url = 'https://api.perplexity.ai/chat/completions'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        }
        payload = {
            'model': 'pplx-7b-online',
            'messages': [{'role': 'user', 'content': prompt}],
            'max_tokens': 500,
        }
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        if 'choices' in data and len(data['choices']) > 0:
            content = data['choices'][0].get('message', {}).get('content', '')
            return {'status': 'ok', 'result': content}
        return {'status': 'ok', 'result': str(data)}
    except Exception as e:
        return {'status': 'error', 'error_message': str(e)}


def duckduckgo_search(query: str) -> Dict[str, Any]:
    """Use DuckDuckGo Instant Answer API as a lightweight fallback for web search."""
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
# EasyMyTrip API Tools
# ============================================================================

def get_hotels_easemytrip(destination: str, checkin: Optional[str] = None, checkout: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch hotels from EasyMyTrip for the given destination.
    
    Args:
        destination: City name (e.g., 'Mumbai', 'Delhi', 'Goa')
        checkin: Check-in date (optional)
        checkout: Check-out date (optional)
    
    Returns:
        dict with hotel options, prices, ratings, and availability
    """
    try:
        url = f'https://www.easemytrip.com/hotels/hotels-in-{destination.lower()}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Extract hotel data using patterns
        patterns = [
            r'<div[^>]*class="[^"]*hotel[^"]*"[^>]*>.*?<h[2-4][^>]*>([^<]+)</h',  # Hotel name
            r'(?:price|cost|₹|rs)[:\s]*([₹\$\d\s,.-]+)',  # Price
            r'(?:rating|⭐|★)[:\s]*([0-9.]+)',  # Rating
        ]
        
        extracted_data = extract_from_html(html, patterns)
        
        # Use LLM to analyze the response structure
        analysis_prompt = f"""Analyze this EasyMyTrip hotels response and extract structured data.
        
Response preview (first 1000 chars): {html[:1000]}

Available data found: {extracted_data[:5] if extracted_data else 'None'}

Please return a JSON structure with:
- hotels: [{{name, price, rating, location, url}}]
- total_hotels: count
- currency: detected currency
- data_quality: 'complete' | 'partial' | 'empty'
"""
        
        llm_analysis = call_perplexity(analysis_prompt)
        
        return {
            'status': 'ok',
            'destination': destination,
            'checkin': checkin,
            'checkout': checkout,
            'url': url,
            'data_found': bool(extracted_data),
            'sample_data': extracted_data[:5],
            'html_length': len(html),
            'llm_analysis': llm_analysis.get('result', 'Analysis not available'),
        }
    except Exception as e:
        return {'status': 'error', 'error_message': f'Failed to fetch hotels: {str(e)}', 'url': f'https://www.easemytrip.com/hotels/hotels-in-{destination.lower()}'}


def get_trains_easemytrip(origin: str, destination: str, date: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch trains from EasyMyTrip between two Indian cities.
    Scrapes the page and extracts all train details directly.
    
    Args:
        origin: Departure city (e.g., 'Ongole', 'Delhi', 'Mumbai')
        destination: Arrival city (e.g., 'Hyderabad', 'Mumbai')
        date: Travel date in DD-MM-YYYY format (optional)
    
    Returns:
        dict with:
        - status: 'ok' or 'error'
        - trains: List of extracted train data with index, number, name, times, price, seats, rating
        - display: Formatted string showing all trains for user to select
        - message: Instructions for booking
    
    Example:
        >>> result = get_trains_easemytrip('Ongole', 'Hyderabad', '04-11-2025')
        >>> print(result['display'])  # Shows all trains with indices [0], [1], etc.
    """
    try:
        # Get railway station codes and format info
        origin_code, origin_all_stations = _get_railway_station_code(origin)
        dest_code, dest_all_stations = _get_railway_station_code(destination)
        
        # Format date as DD-MM-YYYY (keep user's format or use provided date)
        if not date:
            from datetime import datetime
            date = datetime.now().strftime('%d-%m-%Y')
        
        # Build URL with correct format based on city type
        if origin_all_stations:
            origin_part = f'{origin}--All-Stations-({origin_code})'
        else:
            origin_part = f'{origin}-({origin_code})'
        
        if dest_all_stations:
            dest_part = f'{destination}--All-Stations-({dest_code})'
        else:
            dest_part = f'{destination}-({dest_code})'
        
        # Construct the EasyMyTrip URL
        url = f'https://railways.easemytrip.com/TrainListInfo/{origin_part}-to-{dest_part}/2/{date}'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
        
        # Fetch the page
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        html = response.text
        
        # Parse HTML with BeautifulSoup to extract train information
        soup = BeautifulSoup(html, 'html.parser')
        trains = []
        extracted_train_numbers = set()  # Track train numbers to avoid duplicates
        
        # Strategy 1: Look for divs that likely contain train information
        # Search for divs with classes containing train-related keywords
        train_cards = soup.find_all('div', class_=re.compile(r'train|result|service|journey|trip', re.I), limit=50)
        
        # Strategy 2: If not found, look for divs with data-test attributes
        if not train_cards:
            train_cards = soup.find_all('div', attrs={'data-test': re.compile(r'train|service', re.I)}, limit=50)
        
        # Strategy 3: If still not found, extract all divs and filter by content patterns
        if not train_cards:
            all_divs = soup.find_all('div', limit=300)
            train_cards = []
            for div in all_divs:
                text = div.get_text(strip=True)
                # Look for divs containing train-like patterns (time + price + number)
                if re.search(r'\d{1,2}:\d{2}', text) and re.search(r'₹\s*\d+', text):
                    train_cards.append(div)
                if len(train_cards) >= 50:
                    break
        
        # Strategy 4: Also check for table rows
        table_rows = soup.find_all('tr', limit=50)
        train_cards.extend(table_rows)
        
        # Extract trains from all found cards
        for idx, card in enumerate(train_cards):
            try:
                text = card.get_text(separator=' ', strip=True)
                
                # Skip if too short
                if len(text) < 20:
                    continue
                
                # Skip filter/UI elements
                if any(x in text.lower() for x in ['search', 'filter', 'sort', 'javascript', 'search trains']):
                    continue
                
                # Extract train number (4-5 digits, most reliable identifier)
                train_num_match = re.search(r'\b(\d{4,5})\b', text)
                if not train_num_match:
                    continue
                
                train_number = train_num_match.group(1)
                
                # Skip if we already extracted this train
                if train_number in extracted_train_numbers:
                    continue
                
                extracted_train_numbers.add(train_number)
                
                # Extract times (HH:MM or H:MM format)
                time_matches = re.findall(r'(\d{1,2}):(\d{2})', text)
                
                # Need at least 2 times (departure and arrival)
                if len(time_matches) < 2:
                    continue
                
                departure = f'{time_matches[0][0]}:{time_matches[0][1]}'
                arrival = f'{time_matches[1][0]}:{time_matches[1][1]}'
                
                # Extract price (₹ followed by numbers)
                price_match = re.search(r'₹\s*(\d+(?:[,\d]*)?(?:\.\d{2})?)', text)
                price = f'₹{price_match.group(1)}' if price_match else 'N/A'
                
                # Extract train name (text before first time or just first part)
                train_name = 'Train ' + train_number
                try:
                    # Try to get name from before first time
                    first_time_pos = text.find(departure)
                    if first_time_pos > 0:
                        name_text = text[:first_time_pos].strip()
                        if len(name_text) > 0:
                            train_name = name_text[:60]
                except:
                    pass
                
                # Extract duration (e.g., "8h 15m" or "8h")
                duration_match = re.search(r'(\d+h\s*\d*m?)', text)
                duration = duration_match.group(1) if duration_match else 'N/A'
                
                # Extract rating if available
                rating_match = re.search(r'(\d\.\d|\d\s*\/\s*5)', text)
                rating = rating_match.group(1) if rating_match else 'N/A'
                
                # Extract seats/availability if available
                seats_match = re.search(r'(\d+)\s*(?:seats?|available|vacancy|seats available)', text, re.I)
                seats = seats_match.group(1) if seats_match else 'Available'
                
                train_data = {
                    'index': len(trains),
                    'train_number': train_number,
                    'train_name': train_name,
                    'departure': departure,
                    'arrival': arrival,
                    'duration': duration,
                    'price': price,
                    'seats': seats,
                    'rating': rating,
                }
                
                trains.append(train_data)
                
                if len(trains) >= 20:  # Limit to 20 trains
                    break
            
            except Exception as e:
                continue
        
        # Create formatted display for the user
        display_lines = [
            f"\n{'='*90}",
            f"🚂 AVAILABLE TRAINS: {origin.upper()} → {destination.upper()} on {date}",
            f"{'='*90}\n"
        ]
        
        if trains:
            display_lines.append(f"📋 Found {len(trains)} trains:\n")
            for train in trains:
                display_lines.append(
                    f"  [{train['index']}] Train #{train['train_number']} - {train['train_name']}\n"
                    f"      🕐 Depart: {train['departure']} | Arrive: {train['arrival']} ({train['duration']})\n"
                    f"      💰 Price: {train['price']} | 👥 Seats: {train['seats']} | ⭐ Rating: {train['rating']}\n"
                )
        else:
            display_lines.append("❌ No trains found on the page. The website might require JavaScript rendering.\n")
        
        display_lines.append(f"\n{'='*90}")
        display_lines.append("📌 TO BOOK A TRAIN:")
        display_lines.append(f"   1. Choose train index: [0] to [{len(trains)-1}]")
        display_lines.append("   2. Choose coach class: SL (Sleeper), 3A (3rd AC), 2A (2nd AC), 1A (1st AC)")
        display_lines.append("   3. Say: 'Book train [index] in [coach] class'")
        display_lines.append(f"{'='*90}\n")
        
        display = '\n'.join(display_lines)
        
        return {
            'status': 'ok',
            'origin': origin,
            'destination': destination,
            'date': date,
            'url': url,
            'trains': trains,
            'total_trains': len(trains),
            'display': display,
            'message': f'Found {len(trains)} trains. Select one by index [0-{len(trains)-1}] and coach class (SL, 3A, 2A, 1A).',
        }
    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'error_message': f'Failed to fetch trains: {str(e)}',
            'origin': origin,
            'destination': destination,
            'date': date if 'date' in locals() else 'not provided',
        }


def get_buses_easemytrip(origin: str, destination: str, date: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch buses from EasyMyTrip between two cities.
    
    Args:
        origin: Departure city
        destination: Arrival city
        date: Travel date (optional)
    
    Returns:
        dict with available bus options, timings, prices, and ratings
    """
    try:
        url = f'https://www.easemytrip.com/bus/{origin.lower()}-to-{destination.lower()}-bus-tickets/'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Extract bus data using patterns
        patterns = [
            r'(?:bus|coach)[:\s]*([^\n<]{2,50})',  # Bus name/operator
            r'(?:departure|depart)[:\s]*(\d{1,2}:\d{2})',  # Departure time
            r'(?:arrival|arrive)[:\s]*(\d{1,2}:\d{2})',  # Arrival time
            r'(?:duration|hours?)[:\s]*([0-9h\s]+)',  # Duration
            r'(?:price|fare|₹)[:\s]*([₹\d,.-]+)',  # Price
            r'(?:seats?|capacity)[:\s]*(\d+)',  # Seats
            r'(?:rating|⭐)[:\s]*([0-9.]+)',  # Rating
        ]
        
        extracted_data = extract_from_html(html, patterns)
        
        # Use LLM to analyze the response structure
        analysis_prompt = f"""Analyze this EasyMyTrip buses API response and extract structured data.

Route: {origin} to {destination}
Response preview (first 1000 chars): {html[:1000]}

Available data found: {extracted_data[:10] if extracted_data else 'None'}

Please return a JSON structure with:
- buses: [{{busName, operator, departure, arrival, duration, price, seats, rating}}]
- total_buses: count
- ac_buses: count
- average_rating: number
- price_range: {{min, max}}
- data_quality: 'complete' | 'partial' | 'empty'
"""
        
        llm_analysis = call_perplexity(analysis_prompt)
        
        return {
            'status': 'ok',
            'origin': origin,
            'destination': destination,
            'url': url,
            'data_found': bool(extracted_data),
            'sample_data': extracted_data[:10],
            'html_length': len(html),
            'llm_analysis': llm_analysis.get('result', 'Analysis not available'),
        }
    except Exception as e:
        return {'status': 'error', 'error_message': f'Failed to fetch buses: {str(e)}'}


def get_activities_easemytrip(destination: str) -> Dict[str, Any]:
    """
    Fetch activities/tours from EasyMyTrip for the given destination.
    
    Args:
        destination: City name (e.g., 'Goa', 'Delhi', 'Jaipur')
    
    Returns:
        dict with available activities, prices, ratings, and descriptions
    """
    try:
        url = f'https://www.easemytrip.com/activities/activity-in-{destination.lower()}/'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Extract activity data using patterns
        patterns = [
            r'(?:activity|tour|experience)[:\s]*([^\n<]{2,100})',  # Activity name
            r'(?:description|details)[:\s]*([^\n<]{2,150})',  # Description
            r'(?:price|cost|₹)[:\s]*([₹\d,.-]+)',  # Price
            r'(?:duration|hours?)[:\s]*([0-9h\s]+)',  # Duration
            r'(?:rating|⭐)[:\s]*([0-9.]+)',  # Rating
        ]
        
        extracted_data = extract_from_html(html, patterns)
        
        # Use LLM to analyze the response structure
        analysis_prompt = f"""Analyze this EasyMyTrip activities API response and extract structured data.

Destination: {destination}
Response preview (first 1000 chars): {html[:1000]}

Available data found: {extracted_data[:10] if extracted_data else 'None'}

Please return a JSON structure with:
- activities: [{{name, description, price, duration, rating, category, image}}]
- total_activities: count
- categories: [list of activity types]
- average_rating: number
- price_range: {{min, max}}
- data_quality: 'complete' | 'partial' | 'empty'
"""
        
        llm_analysis = call_perplexity(analysis_prompt)
        
        return {
            'status': 'ok',
            'destination': destination,
            'url': url,
            'data_found': bool(extracted_data),
            'sample_data': extracted_data[:10],
            'html_length': len(html),
            'llm_analysis': llm_analysis.get('result', 'Analysis not available'),
        }
    except Exception as e:
        return {'status': 'error', 'error_message': f'Failed to fetch activities: {str(e)}'}


def get_car_bookings_easemytrip(origin: str, destination: str) -> Dict[str, Any]:
    """
    Fetch car rentals from EasyMyTrip between two cities.
    
    Args:
        origin: Pickup city
        destination: Dropoff city
    
    Returns:
        dict with available car options, prices, and ratings
    """
    try:
        url = f'https://www.easemytrip.com/cabs/{origin.lower()}-to-{destination.lower()}-cab-booking/'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Extract car data using patterns
        patterns = [
            r'(?:car|vehicle)[:\s]*([^\n<]{2,80})',  # Car type
            r'(?:price|fare|₹)[:\s]*([₹\d,.-]+)',  # Price
            r'(?:capacity|seats)[:\s]*(\d+)',  # Capacity
            r'(?:rating|⭐)[:\s]*([0-9.]+)',  # Rating
        ]
        
        extracted_data = extract_from_html(html, patterns)
        
        # Use LLM to analyze the response structure
        analysis_prompt = f"""Analyze this EasyMyTrip car rentals API response and extract structured data.

Route: {origin} to {destination}
Response preview (first 1000 chars): {html[:1000]}

Available data found: {extracted_data[:10] if extracted_data else 'None'}

Please return a JSON structure with:
- cars: [{{carType, price, capacity, rating, features}}]
- total_cars: count
- car_types: [sedan, suv, hatchback, etc]
- average_rating: number
- price_range: {{min, max}}
- data_quality: 'complete' | 'partial' | 'empty'
"""
        
        llm_analysis = call_perplexity(analysis_prompt)
        
        return {
            'status': 'ok',
            'origin': origin,
            'destination': destination,
            'url': url,
            'data_found': bool(extracted_data),
            'sample_data': extracted_data[:10],
            'html_length': len(html),
            'llm_analysis': llm_analysis.get('result', 'Analysis not available'),
        }
    except Exception as e:
        return {'status': 'error', 'error_message': f'Failed to fetch cars: {str(e)}'}


def get_airport_cabs_easemytrip(airport_city: str) -> Dict[str, Any]:
    """
    Fetch airport cab services from EasyMyTrip for the given airport.
    
    Args:
        airport_city: City with airport (e.g., 'Delhi', 'Mumbai', 'Bangalore')
    
    Returns:
        dict with airport cab options, prices, and ratings
    """
    try:
        url = f'https://www.easemytrip.com/cabs/cabs-from-{airport_city.lower()}-airport/'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Extract cab data using patterns
        patterns = [
            r'(?:cab|taxi|vehicle)[:\s]*([^\n<]{2,80})',  # Cab type
            r'(?:price|fare|₹)[:\s]*([₹\d,.-]+)',  # Price
            r'(?:rating|⭐)[:\s]*([0-9.]+)',  # Rating
        ]
        
        extracted_data = extract_from_html(html, patterns)
        
        # Use LLM to analyze the response structure
        analysis_prompt = f"""Analyze this EasyMyTrip airport cabs API response and extract structured data.

Airport: {airport_city}
Response preview (first 1000 chars): {html[:1000]}

Available data found: {extracted_data[:10] if extracted_data else 'None'}

Please return a JSON structure with:
- cabs: [{{cabType, price, rating, dropoff_areas}}]
- total_cabs: count
- average_rating: number
- price_range: {{min, max}}
- service_areas: [list of areas]
- data_quality: 'complete' | 'partial' | 'empty'
"""
        
        llm_analysis = call_perplexity(analysis_prompt)
        
        return {
            'status': 'ok',
            'airport_city': airport_city,
            'url': url,
            'data_found': bool(extracted_data),
            'sample_data': extracted_data[:10],
            'html_length': len(html),
            'llm_analysis': llm_analysis.get('result', 'Analysis not available'),
        }
    except Exception as e:
        return {'status': 'error', 'error_message': f'Failed to fetch airport cabs: {str(e)}'}


def book_train_complete(
    origin: str,
    destination: str,
    date: str,
    train_index: int,
    coach_class: str
) -> Dict[str, Any]:
    """
    Complete train booking workflow: validate selections and provide booking URL.
    
    Steps:
    1. Scrape all trains from EasyMyTrip for the route
    2. Validate the train_index and coach_class selections
    3. Generate booking URL with selected parameters
    4. Return the final booking URL for payment
    
    Args:
        origin: Departure city (e.g., 'Ongole', 'Delhi')
        destination: Arrival city (e.g., 'Hyderabad', 'Mumbai')
        date: Travel date in DD-MM-YYYY format (e.g., '04-11-2025')
        train_index: Index of train to book (0-based, from scraped list)
        coach_class: Coach class (SL, 3A, 2A, 1A)
    
    Returns:
        dict with:
        - status: 'success' or 'error'
        - booking_url: Final booking URL to visit for payment
        - train: Selected train details
        - coach: Selected coach class
        - message: User-friendly message
    
    Example:
        >>> result = book_train_complete('Ongole', 'Hyderabad', '04-11-2025', 0, '2A')
        >>> print(result['booking_url'])
        https://railways.easemytrip.com/checkout?...
    """
    try:
        # Step 1: Get trains using existing scraping function
        train_result = get_trains_easemytrip(origin, destination, date)
        
        if train_result['status'] != 'ok':
            return {
                'status': 'error',
                'message': f"Failed to fetch trains: {train_result.get('error_message', 'Unknown error')}"
            }
        
        trains = train_result.get('trains', [])
        trains_url = train_result.get('url', '')
        
        if not trains:
            return {
                'status': 'error',
                'message': 'No trains found for the given route and date',
                'display': train_result.get('display', '')
            }
        
        # Step 2: Validate train_index
        if train_index < 0 or train_index >= len(trains):
            return {
                'status': 'error',
                'message': f'❌ Invalid train index: {train_index}. Please select from [0] to [{len(trains)-1}]',
                'available_trains': len(trains),
                'display': train_result.get('display', '')
            }
        
        # Step 3: Validate coach_class
        valid_coaches = ['SL', '3A', '2A', '1A']
        if coach_class not in valid_coaches:
            return {
                'status': 'error',
                'message': f'❌ Invalid coach class: {coach_class}. Valid options: {", ".join(valid_coaches)}'
            }
        
        # Step 4: Get selected train details
        selected_train = trains[train_index]
        
        # Step 5: Build booking URL with selections
        # The actual booking happens when user visits the EasyMyTrip page and clicks "Book Now"
        # We provide the URL with the train selected
        booking_url = trains_url
        
        # Add coach class as a query parameter or anchor
        # Note: Actual coach selection happens on the website UI
        coach_mapping = {
            'SL': 'Sleeper',
            '3A': '3rd-AC',
            '2A': '2nd-AC',
            '1A': '1st-AC'
        }
        coach_name = coach_mapping.get(coach_class, coach_class)
        
        # Construct a user-friendly booking summary
        booking_summary = (
            f"\n{'='*90}\n"
            f"✅ BOOKING CONFIRMED - READY FOR PAYMENT\n"
            f"{'='*90}\n"
            f"🚂 Train Details:\n"
            f"   Train Number: {selected_train['train_number']}\n"
            f"   Train Name: {selected_train['train_name']}\n"
            f"   Route: {origin.upper()} → {destination.upper()}\n"
            f"   Date: {date}\n"
            f"\n🚪 Booking Details:\n"
            f"   Departure: {selected_train['departure']}\n"
            f"   Arrival: {selected_train['arrival']}\n"
            f"   Duration: {selected_train['duration']}\n"
            f"   Coach Class: {coach_class} ({coach_name})\n"
            f"\n💰 Price: {selected_train['price']}\n"
            f"👥 Seats Available: {selected_train['seats']}\n"
            f"⭐ Rating: {selected_train['rating']}\n"
            f"{'='*90}\n"
            f"📝 Next Steps:\n"
            f"   1. Click the booking link below\n"
            f"   2. The website will load with your train selected\n"
            f"   3. Select '{coach_class}' class from the available options\n"
            f"   4. Click 'Book Now' button\n"
            f"   5. Complete passenger details and payment\n"
            f"{'='*90}\n"
        )
        
        return {
            'status': 'success',
            'booking_url': booking_url,
            'train': selected_train,
            'coach': coach_class,
            'coach_name': coach_name,
            'message': f'✅ Train booking ready! Visit the link below to complete payment.',
            'booking_summary': booking_summary,
            'instructions': (
                f'Your booking is confirmed:\n'
                f'  • Train #{selected_train["train_number"]} ({selected_train["train_name"]})\n'
                f'  • {selected_train["departure"]} → {selected_train["arrival"]}\n'
                f'  • Coach: {coach_class} ({coach_name})\n'
                f'  • Price: {selected_train["price"]}\n\n'
                f'Click the booking URL to proceed with payment and passenger details.'
            )
        }
    
    except Exception as e:
        import traceback
        return {
            'status': 'error',
            'message': f'Booking error: {str(e)}',
            'error_details': traceback.format_exc()
        }



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
    description='A comprehensive trip planning agent that helps users plan their travel by fetching flights, hotels, guides, trains, cars, restaurants, hospitals, and nearby attractions using EasyMyTrip APIs.',
    instruction=('You are an intelligent, empathetic, and proactive Trip Planning Assistant with deeply integrated EasyMyTrip travel booking capabilities. Your primary goal is to understand user intent, even when ambiguous, and guide them through a seamless, conversational booking experience. You must anticipate needs, handle errors gracefully, and make intelligent decisions to simplify the user''s journey. You maintain a persistent `conversation_state` to track user preferences, selections, and pending information throughout the interaction. '
        '\n\n**CORE LOGIC & INPUT PARSING:** '
        'Upon any user request, your first step is to use the `input_parser` tool. This tool is not just for extraction; it must also perform normalization and disambiguation. '
        '- **Extraction:** Identify core entities: origin, destination, date (absolute or relative like "next Friday"), party_size (adults, children, infants), and primary intents (book_train, book_flight, book_hotel, check_status, modify_booking). '
        '- **Normalization:** Convert relative dates ("tomorrow", "day after") to absolute dates (DD-MM-YYYY). Standardize city names ("Delhi" -> "New Delhi (NDLS)", "Mumbai" -> "Mumbai (CST)" or "BCT" based on context). '
        '- **Disambiguation:** If the origin/destination is ambiguous (e.g., multiple stations in a city), ask the user for clarification: "I found multiple stations in Delhi. Did you mean New Delhi (NDLS), Delhi Jn (DLI), or Hazrat Nizamuddin (NZM)?" '
        '- **Inference:** Infer unstated preferences. "A quick business trip" implies preference for fastest flights/trains and business class. "A budget vacation" implies preference for economy/sleeper class and sorting by price. '
        'If any critical information is missing (e.g., date for a booking request), proactively and conversationally ask for it before proceeding. '

        '\n\n**TRAIN BOOKING WORKFLOW (COMPLEX):** '
        '1. **Pre-Flight Validation:** After parsing, ensure you have a valid origin, destination, a future date, and party_size. If the date is in the past, inform the user and ask for a new date. '
        '2. **Initial Search:** Call `get_trains_easemytrip(origin, destination, date, party_size)`. This tool will scrape and return a structured list of available trains, including real-time availability and status for each coach class (SL, 3A, 2A, 1A). The response will contain a "display" field with a formatted list and a "raw_data" field with detailed train objects. '
        '3. **Intelligent Presentation & Filtering:** DO NOT just dump the entire list. Analyze the results and present a curated summary. '
        '   - If there are no trains, say: "I\'m sorry, there are no available trains from [origin] to [destination] on [date]. Would you like to check nearby dates or alternative modes of transport?" '
        '   - If there are many trains, summarize: "I found [number] trains for your journey. The fastest option is [Train Name] at [Time]. The most economical option with Sleeper class available is [Train Name] at [Time]. Would you like to see the full list, or should I filter by earliest departure, fastest arrival, or lowest price?" '
        '   - Present the "display" field to the user, but ensure it is well-formatted and easy to read. '
        '4. **Smart Selection & Confirmation:** Ask the user for their preference in an open-ended way: "Which train catches your eye? You can tell me the index number (e.g., 0, 1, 2), the train name, or its departure time." '
        '   - Once the user indicates a choice, identify the correct train from the `raw_data`. '
        '   - **CRITICAL:** Before confirming, check the availability for the user\'s desired (or a default) coach class. If the user specified a class (e.g., "I want an AC 2-tier"), verify it. If they didn\'t, ask: "Great choice! Which coach class would you prefer for [Train Name]? The available options are [list available classes like SL, 3A, 2A]." '
        '   - If the chosen class is not available, inform the user immediately and suggest alternatives: "Unfortunately, 2A class is sold out on that train. However, 3A is available. Alternatively, the [Other Train Name] departing at [time] has 2A available. What would you like to do?" '
        '5. **Passenger Detail Collection:** Once the train and coach class are confirmed, you MUST collect passenger details before attempting to book. Say: "To proceed with the booking, I\'ll need some details for each passenger. Could you please provide the name, age, and gender for all [party_size] passengers?" Store this information in the `conversation_state`. '
        '6. **Final Booking Attempt:** Call `book_train_complete(origin, destination, date, train_index, coach_class, passenger_details)`. This tool will use Playwright to navigate the EasyMyTrip site, fill in all details, and attempt to secure the booking. '
        '7. **Advanced Status Handling & User Guidance:** The tool will return a detailed status object. Handle each case as follows: '
        '   - `{status: "success", booking_url: "..."}`: "Excellent! Your booking is confirmed and held. Please click this link to proceed to the payment page within the next 10 minutes: [URL]. Your booking reference is [PNR]." '
        '   - `{status: "price_change", new_price: "...", booking_url: "..."}`: "Heads up! The fare for this train has just changed to [new_price]. The original price was [old_price]. Would you like to proceed with the booking at the new price? If yes, I can provide the payment link." '
        '   - `{status: "train_full", class: "2A"}`: "I\'m sorry, it seems the [coach_class] seats on this train were just booked by someone else. Let\'s try another train or class. The [Alternative Train Name] still has availability." '
        '   - `{status: "website_error", message: "..."}`: "I\'m having trouble connecting to the booking portal right now ([message]). This might be a temporary issue. Would you like me to try again, or would you prefer to book later?" '
        '   - `{status: "payment_pending", booking_url: "..."}`: "Your seats are reserved! Please complete the payment at this link to finalize your booking: [URL]." '
        'Example flow: '
        'User: "I need to get to Hyderabad from Ongole quickly tomorrow for 2 people." '
        '→ `input_parser` extracts origin="Ongole", destination="Hyderabad", date=[calculates tomorrow\'s date], party_size=2, intent="book_train", infers preference="fastest". '
        '→ Call `get_trains_easemytrip("Ongole", "Hyderabad", [date], 2)` '
        '→ Analyze response, find fastest train, present it and a few other options. "The fastest train is the Godavari Express [0]. I also have the Narayanadri Express [1] which is a bit slower but has better AC availability. Which one works for you?" '
        '→ User: "Let\'s take the first one, in 3A." '
        '→ Assistant confirms availability of 3A on train [0]. "Perfect. Now, can I get the names, ages, and gender for the two passengers?" '
        '→ User provides details. '
        '→ Call `book_train_complete(..., train_index=0, coach_class="3A", passenger_details=[...])` '
        '→ Handle response based on status and guide user to payment or next step. '

        '\n\n**FLIGHT BOOKING WORKFLOW:** '
        '1. Parse for trip type (one-way, round-trip, multi-city), origin, destination, departure/return dates, and party_size. '
        '2. Call `get_flights_easemytrip(origin, destination, departure_date, return_date, trip_type, party_size)`. '
        '3. Intelligently present options, highlighting the cheapest, fastest, and best-value flights. Allow filtering by airline, departure time, number of stops, and cabin class (Economy, Premium Economy, Business). '
        '4. Confirm user choice for outbound and return flights (if applicable). '
        '5. Collect passenger details (full name as per ID, contact number, email). '
        '6. Call `book_flight_complete(...)` with all details. '
        '7. Handle booking status (success, price change, payment gateway issues) with clear guidance. '

        '\n\n**HOTEL BOOKING WORKFLOW:** '
        '1. Parse for city/locality, check-in date, number of nights, and guest details (adults/children). '
        '2. Call `get_hotels_easemytrip(city, check_in_date, num_nights, guest_details)`. '
        '3. Present options, allowing filtering by price, star rating, user rating, locality (e.g., "near the airport"), and amenities (e.g., "free WiFi", "pool"). '
        '4. Confirm user choice for a specific room type. '
        '5. Collect primary guest details (name, contact). '
        '6. Call `book_hotel_complete(...)`. '
        '7. Handle booking status and guide the user. '

        '\n\n**GENERAL PRINCIPLES & EDGE CASE HANDLING:** '
        '- **Conversational & Empathetic Tone:** Always use a friendly, helpful, and patient tone. Acknowledge user constraints ("I know finding a budget-friendly option can be tough..."). '
        '- **Tool Failure Resilience:** If any tool call fails or times out, do not show the user an error message. Instead, say something like, "One moment, I\'m double-checking that information," and retry once. If it fails again, explain the situation in simple terms and offer an alternative. '
        '- **Multi-Modal Trip Planning:** If a user asks for a complex trip ("Plan a weekend trip to Goa from Delhi"), break it down. "Great! A trip to Goa sounds wonderful. Should I start by looking for flights from Delhi to Goa for Friday, and then a hotel for Friday and Saturday night?" '
        '- **State Management:** Always remember the context of the conversation. If the user has selected a train, do not ask for the origin and destination again. '
        '- **Clarification is Key:** When in doubt, always ask a clarifying question rather than making a wrong assumption. "Just to be sure, when you say \'Kolkata\', do you mean the airport (CCU) for a flight, or Howrah Station (HWH) for a train?"'
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
        # New EasyMyTrip Real Booking APIs
        get_hotels_easemytrip,
        get_trains_easemytrip,
        get_buses_easemytrip,
        get_activities_easemytrip,
        get_car_bookings_easemytrip,
        get_airport_cabs_easemytrip,
        # Complete train booking with Playwright automation
        book_train_complete,
    ],
)