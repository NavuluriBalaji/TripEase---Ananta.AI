# app.py
import os
from typing import List, Dict
from flask import Flask, request, jsonify
from FlightRadarAPI import FlightRadar24API

app = Flask(__name__)
fr_api = FlightRadar24API()

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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "7070"))
    app.run(host="0.0.0.0", port=port)