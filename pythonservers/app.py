# app.py
import os
import sys
import asyncio
from typing import List, Dict
from flask import Flask, request, jsonify
from flask_cors import CORS
# from FlightRadarAPI import FlightRadar24API
from travel_scraper import scrape_buses, scrape_activities

app = Flask(__name__)
# CORS(app)  # Enable CORS for frontend requests
# fr_api = FlightRadar24API()

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

def resolve_airport_code(query: str) -> str | None:
    if not query:
        return None
    try:
        airports = fr_api.get_airports(query=query)
        if not airports:
            return None
        # Pick first result; prefer IATA if present
        a = airports[0]
        return (a.get("iata") or a.get("icao") or a.get("id") or "").upper() or None
    except Exception:
        return None

def map_flight(f: object) -> Dict:
    # Best-effort mapping; attributes vary by SDK version
    def safe_get(obj, *attrs):
        for a in attrs:
            if hasattr(obj, a):
                return getattr(obj, a)
        return None

    return {
        "airline": safe_get(f, "airline_iata", "airline_icao", "airline_name"),
        "flightNumber": safe_get(f, "number", "callsign", "flight_number"),
        "departTime": safe_get(f, "time_scheduled_departure", "time_departure"),
        "arriveTime": safe_get(f, "time_scheduled_arrival", "time_arrival"),
        "duration": None,
        "price": None,  # pricing not provided by FlightRadar24
        "notes": "Live flight data (no prices)."
    }

@app.get("/api/flights")
def flights():
    origin = request.args.get("origin", "").strip()
    destination = request.args.get("destination", "").strip()
    date = request.args.get("date", "").strip()  # optional; not used by FR24 live data

    if not origin or not destination:
        return jsonify({"error": "origin and destination are required"}), 400

    origin_code = resolve_airport_code(origin)
    destination_code = resolve_airport_code(destination)
    if not origin_code or not destination_code:
        return jsonify({"flights": [], "note": "Could not resolve airports"}), 200

    try:
        flights = fr_api.get_flights()  # live flights
        result: List[Dict] = []
        for f in flights or []:
            # Try to read origin/destination codes
            dep = getattr(f, "origin_airport_iata", None) or getattr(f, "origin_airport_icao", None)
            arr = getattr(f, "destination_airport_iata", None) or getattr(f, "destination_airport_icao", None)
            if not dep or not arr:
                continue
            if dep.upper()[:3] == origin_code[:3] and arr.upper()[:3] == destination_code[:3]:
                result.append(map_flight(f))
                if len(result) >= 8:
                    break

        return jsonify(result), 200
    except Exception as e:
        return jsonify({"flights": [], "error": str(e)}), 200

@app.get("/api/buses")
def buses():
    """Scrape buses from EasyMyTrip"""
    origin = request.args.get("origin", "").strip()
    destination = request.args.get("destination", "").strip()
    date = request.args.get("date", "").strip()

    if not origin or not destination:
        return jsonify({"error": "origin and destination are required"}), 400

    result = scrape_buses(origin, destination, date or None)
    return jsonify(result), 200

@app.get("/api/activities")
def activities():
    """Scrape activities from EasyMyTrip"""
    destination = request.args.get("destination", "").strip()

    if not destination:
        return jsonify({"error": "destination is required"}), 400

    result = scrape_activities(destination)
    return jsonify(result), 200

@app.post("/api/trains/book")
def book_train():
    """Book a train with Playwright automation
    
    Request body:
    {
        "url": "EasyMyTrip trains URL",
        "train_index": 0,
        "coach_class": "2A"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"status": "error", "message": "No JSON data provided"}), 400
        
        url = data.get("url", "").strip()
        train_index = data.get("train_index")
        coach_class = data.get("coach_class", "").strip()
        
        if not url or train_index is None or not coach_class:
            return jsonify({
                "status": "error",
                "message": "Missing required fields: url, train_index, coach_class"
            }), 400
        
        # Import here to avoid issues at startup
        try:
            from train_booking_orchestrator import TrainBookingOrchestrator
        except ImportError as e:
            return jsonify({
                "status": "error",
                "message": f"Playwright module not available: {str(e)}"
            }), 500
        
        # Create orchestrator and run booking
        async def run_booking():
            orchestrator = TrainBookingOrchestrator(url)
            
            # Scrape and display trains
            scrape_result = orchestrator.scrape_and_display_trains()
            
            if scrape_result['status'] != 'success':
                return {
                    'status': 'error',
                    'message': scrape_result.get('message', 'Failed to scrape trains')
                }
            
            trains_list = scrape_result.get('trains', [])
            
            if not trains_list:
                return {
                    'status': 'error',
                    'message': 'No trains found for the given route'
                }
            
            # Validate train_index
            if train_index < 0 or train_index >= len(trains_list):
                return {
                    'status': 'error',
                    'message': f'Invalid train_index: {train_index}. Available: 0-{len(trains_list)-1}',
                    'trains': trains_list,
                    'display': scrape_result.get('display', '')
                }
            
            # Validate coach_class
            valid_coaches = ['SL', '3A', '2A', '1A']
            if coach_class not in valid_coaches:
                return {
                    'status': 'error',
                    'message': f'Invalid coach: {coach_class}. Valid: {", ".join(valid_coaches)}'
                }
            
            # Select train and coach
            selection_result = orchestrator.select_train_and_coach(train_index, coach_class)
            
            if selection_result['status'] != 'success':
                return {
                    'status': 'error',
                    'message': selection_result.get('message', 'Failed to select')
                }
            
            # Run booking flow
            booking_result = await orchestrator.complete_booking_flow()
            return booking_result
        
        # Run async booking
        result = asyncio.run(run_booking())
        
        return jsonify(result), 200
    
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.get("/api/trains/scrape")
def scrape_trains():
    """Scrape trains from EasyMyTrip URL
    
    Query params:
    - url: EasyMyTrip trains URL
    """
    try:
        url = request.args.get("url", "").strip()
        
        if not url:
            return jsonify({
                "status": "error",
                "message": "Missing required parameter: url"
            }), 400
        
        from train_scraper_and_booker import display_available_trains
        
        result = display_available_trains(url)
        
        return jsonify(result), 200
    
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "message": str(e),
            "traceback": traceback.format_exc()
        }), 500

@app.get("/api/query")
def query_ai():
    """Query the ADK AI Agent for travel planning and booking
    
    This endpoint handles queries and proxies to the ADK agent.
    It maintains conversation state through conversation_id.
    
    Query parameters:
    - query: User's query/request (required)
    - conversation_id: ID to track multi-turn conversations (optional)
    - step: Current conversation step (optional)
    - origin: Trip origin city (optional)
    - destination: Trip destination city (optional)
    - date: Trip date in DD-MM-YYYY format (optional)
    """
    try:
        query = request.args.get("query", "").strip()
        conversation_id = request.args.get("conversation_id", f"conv_{os.urandom(8).hex()}")
        step = request.args.get("step", "initial")
        origin = request.args.get("origin", "").strip()
        destination = request.args.get("destination", "").strip()
        date = request.args.get("date", "").strip()
        
        if not query:
            return jsonify({
                "status": "error",
                "message": "Missing required parameter: query",
                "conversation_id": conversation_id
            }), 400
        
        # Simple response based on query intent
        # This handles common travel queries
        
        result = {
            "status": "success",
            "conversation_id": conversation_id,
            "step": step,
            "message": f"Processing: {query}",
            "display": f"I'll help you with: {query}",
            "timestamp": str(__import__('datetime').datetime.now().isoformat()),
        }
        
        # Add context if provided
        if origin:
            result["origin"] = origin
        if destination:
            result["destination"] = destination
        if date:
            result["date"] = date
        
        # Handle specific intents
        query_lower = query.lower()
        
        if "train" in query_lower and ("book" in query_lower or "from" in query_lower):
            # Extract origin/destination if not provided
            parts = query.split("from")
            if len(parts) >= 2:
                after_from = parts[1].split("to")
                if len(after_from) >= 2:
                    extracted_origin = after_from[0].strip()
                    extracted_destination = after_from[1].split("on")[0].strip()
                    
                    # Call actual train scraping
                    try:
                        sys.path.insert(0, os.path.join(os.path.dirname(__file__), "ADK", "multi_tool_agent"))
                        from agent import get_trains_easemytrip
                        
                        trains_result = get_trains_easemytrip(extracted_origin, extracted_destination, date or "")
                        result["trains"] = trains_result.get("trains", [])
                        result["display"] = trains_result.get("display", trains_result.get("message", ""))
                        result["step"] = "showing_trains"
                        result["origin"] = extracted_origin
                        result["destination"] = extracted_destination
                    except Exception as e:
                        result["error_detail"] = str(e)
                        result["display"] = f"Could not fetch trains: {str(e)}"
        
        return jsonify(result), 200
    
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "message": str(e),
            "conversation_id": conversation_id if 'conversation_id' in locals() else None,
            "traceback": traceback.format_exc()
        }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7070"))
    app.run(host="0.0.0.0", port=port)