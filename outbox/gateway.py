#!/usr/bin/env python3
"""
Minimal Flask CORS Gateway for ADK - No Complex Configs
Just works!
"""
from flask import Flask, request, jsonify
import requests
import json
from datetime import datetime
import uuid

app = Flask(__name__)

# Simple CORS decorator
def add_cors_headers(f):
    def wrapper(*args, **kwargs):
        response = f(*args, **kwargs)
        if isinstance(response, str):
            response = jsonify({"error": response})
        if isinstance(response, tuple):
            data, code = response
        else:
            data = response
            code = 200
        
        if not isinstance(data, dict):
            data = data.get_json() if hasattr(data, 'get_json') else {}
        
        resp = jsonify(data) if isinstance(data, dict) else data
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,PUT,DELETE'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return resp, code
    wrapper.__name__ = f.__name__
    return wrapper

# Configuration
ADK_URL = 'http://127.0.0.1:9090'
conversations = {}

@app.route('/api/query', methods=['OPTIONS'])
def query_options():
    """Handle OPTIONS preflight"""
    response = jsonify({})
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response, 200

@app.route('/api/query', methods=['POST'])
@add_cors_headers
def query_post():
    """Handle POST /api/query"""
    try:
        data = request.get_json() or {}
        query_text = data.get('query', '').strip()
        conversation_id = data.get('conversation_id', f"conv_{uuid.uuid4().hex[:8]}")
        step = data.get('step', 'initial')
        
        print(f"\n[GATEWAY] Received query:")
        print(f"  Query: {query_text}")
        print(f"  Conv ID: {conversation_id}")
        
        if not query_text:
            return {"status": "error", "message": "Missing query"}, 400
        
        # Forward to ADK
        try:
            print(f"[GATEWAY] Forwarding to ADK...")
            resp = requests.post(
                f"{ADK_URL}/api/query",
                json={"query": query_text, "conversation_id": conversation_id},
                timeout=10
            )
            if resp.status_code == 200:
                adk_data = resp.json()
                response_text = adk_data.get('response') or adk_data.get('message') or json.dumps(adk_data)
            else:
                response_text = f"ADK returned {resp.status_code}"
        except Exception as e:
            print(f"[GATEWAY] ADK error: {e}")
            response_text = f"Query received: {query_text}. (ADK not responding - that's OK for testing)"
        
        result = {
            "status": "success",
            "conversation_id": conversation_id,
            "message": response_text,
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"[GATEWAY] Sending response")
        return result, 200
        
    except Exception as e:
        print(f"[GATEWAY] Error: {e}")
        return {"status": "error", "message": str(e)}, 500

@app.route('/health', methods=['GET', 'OPTIONS'])
@add_cors_headers
def health():
    """Health check"""
    return {"status": "ok", "service": "AIMarg Gateway", "adk": ADK_URL}, 200

@app.route('/', methods=['GET', 'OPTIONS'])
@add_cors_headers
def index():
    """API docs"""
    return {
        "service": "AIMarg Gateway",
        "endpoint": "POST http://127.0.0.1:8000/api/query",
        "example": {
            "query": "Book train from Ongole to Hyderabad on 04-11-2025",
            "conversation_id": "user_123"
        }
    }, 200

if __name__ == '__main__':
    print("\n" + "="*60)
    print("AIMarg CORS Gateway")
    print("="*60)
    print("Gateway running on http://0.0.0.0:8001")
    print("ADK Server: " + ADK_URL)
    print("="*60 + "\n")
    app.run(host='0.0.0.0', port=8001, debug=False, use_reloader=False)
