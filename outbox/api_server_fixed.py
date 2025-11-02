"""
AIMarg API Gateway - Proxies POST requests to ADK
This is the FIXED version that proxies to running ADK server
Start with: adk api_server (on default port)
This gateway listens on port 8000

KEY FIX: Using before_request AND after_request for robust CORS handling
"""

import os
import json
import uuid
import requests
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)

# Configuration
ADK_URL = os.environ.get('ADK_URL', 'http://127.0.0.1:9090')
GATEWAY_PORT = int(os.environ.get('PORT', 8000))

# Store conversation history
conversations = {}

# CRITICAL: Enable CORS with explicit configuration
CORS(app, 
     resources={
         r"/*": {
             "origins": "*",
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type", "Accept"],
             "expose_headers": ["Content-Type"],
             "max_age": 3600,
             "supports_credentials": False
         }
     })

# Handle OPTIONS requests explicitly BEFORE they hit the route
@app.before_request
def handle_preflight():
    """Handle CORS preflight requests"""
    if request.method == "OPTIONS":
        response = make_response('', 204)
        response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

# Add CORS headers to ALL responses
@app.after_request
def after_request(response):
    """Add CORS headers to every response"""
    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
    response.headers['Access-Control-Max-Age'] = '3600'
    response.headers['Content-Type'] = 'application/json'
    return response


@app.route('/api/query', methods=['POST', 'GET', 'OPTIONS'])
def query():
    """
    Gateway endpoint - forwards to running ADK server
    
    Request:
    POST http://127.0.0.1:8000/api/query
    {
        "query": "Book train from Ongole to Hyderabad on 04-11-2025",
        "conversation_id": "user_123",
        "step": "initial"
    }
    """
    # OPTIONS is handled by before_request, but just in case
    if request.method == "OPTIONS":
        return make_response('', 204)
    
    try:
        # Parse request
        if request.method == 'POST':
            data = request.get_json()
            query_text = data.get('query', '').strip()
            conversation_id = data.get('conversation_id', f"conv_{uuid.uuid4().hex[:8]}")
            step = data.get('step', 'initial')
        else:  # GET
            query_text = request.args.get('query', '').strip()
            conversation_id = request.args.get('conversation_id', f"conv_{uuid.uuid4().hex[:8]}")
            step = request.args.get('step', 'initial')
        
        if not query_text:
            return jsonify({
                "status": "error",
                "message": "Missing 'query' parameter",
                "conversation_id": conversation_id
            }), 400
        
        print(f"\n[GATEWAY] Query received:")
        print(f"  Conversation ID: {conversation_id}")
        print(f"  Query: {query_text}")
        print(f"  Step: {step}")
        
        # Get or create conversation history
        if conversation_id not in conversations:
            conversations[conversation_id] = {
                'history': [],
                'context': {}
            }
        
        conv = conversations[conversation_id]
        conv['history'].append({
            'role': 'user',
            'content': query_text
        })
        
        # Forward to ADK server
        print(f"[GATEWAY] Forwarding to ADK at {ADK_URL}...")
        
        response_text = forward_to_adk(query_text, conversation_id)
        
        # Add to history
        conv['history'].append({
            'role': 'assistant',
            'content': response_text
        })
        
        # Build response
        result = {
            "status": "success",
            "conversation_id": conversation_id,
            "step": step,
            "message": response_text,
            "display": response_text,
            "timestamp": datetime.now().isoformat(),
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        import traceback
        print(f"[GATEWAY] Error: {str(e)}")
        print(traceback.format_exc())
        
        return jsonify({
            "status": "error",
            "message": str(e),
            "error_type": type(e).__name__,
            "conversation_id": conversation_id if 'conversation_id' in locals() else None,
        }), 500


def forward_to_adk(query_text, conversation_id):
    """Forward request to ADK server"""
    try:
        # Test connection
        print(f"[GATEWAY] Testing ADK connection...")
        health_resp = requests.get(f"{ADK_URL}/health", timeout=2)
        
        if health_resp.status_code != 200:
            raise ConnectionError(f"ADK unhealthy: {health_resp.status_code}")
        
        print(f"[GATEWAY] ✓ ADK is healthy")
        
        # Forward request
        payload = {
            "query": query_text,
            "conversation_id": conversation_id
        }
        
        # Try multiple possible ADK endpoints
        endpoints = [
            f"{ADK_URL}/api/query",
            f"{ADK_URL}/api/chat",
            f"{ADK_URL}/chat",
            f"{ADK_URL}/query"
        ]
        
        for endpoint in endpoints:
            try:
                print(f"[GATEWAY] Trying endpoint: {endpoint}")
                resp = requests.post(endpoint, json=payload, timeout=30)
                
                if resp.status_code == 200:
                    result = resp.json()
                    # Extract response text from various formats
                    response_text = (
                        result.get('response') or
                        result.get('message') or
                        result.get('text') or
                        json.dumps(result)
                    )
                    print(f"[GATEWAY] ✓ Got response from {endpoint}")
                    return response_text
            except (requests.Timeout, requests.ConnectionError) as e:
                print(f"[GATEWAY] Endpoint {endpoint} failed: {e}")
                continue
        
        # If no endpoint worked, return helpful message
        return (
            f"Query processed: {query_text}\n\n"
            f"Note: ADK endpoint not found at {ADK_URL}. "
            f"Make sure you started ADK with: adk api_server"
        )
        
    except requests.ConnectionError:
        return (
            f"Error: Cannot reach ADK server at {ADK_URL}\n\n"
            f"To fix:\n"
            f"1. Open another terminal\n"
            f"2. Run: adk api_server\n"
            f"3. Wait for 'Server started on...'\n"
            f"4. Try your request again"
        )
    except requests.Timeout:
        return f"Timeout: ADK server at {ADK_URL} took too long to respond"
    except Exception as e:
        return f"Error: {str(e)}"


@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check"""
    if request.method == "OPTIONS":
        return make_response('', 204)
    
    return jsonify({
        "status": "healthy",
        "service": "AIMarg Gateway",
        "adk_server": ADK_URL,
        "gateway_port": GATEWAY_PORT,
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def index():
    """API documentation"""
    return jsonify({
        "service": "AIMarg ADK API Gateway",
        "version": "1.0",
        "gateway_port": GATEWAY_PORT,
        "adk_server": ADK_URL,
        "endpoints": {
            "POST /api/query": {
                "description": "Send travel query",
                "example": {
                    "query": "Book train from Ongole to Hyderabad on 04-11-2025",
                    "conversation_id": "user_123",
                    "step": "initial"
                }
            },
            "GET /health": "Health check",
            "GET /": "This documentation"
        },
        "setup": {
            "1_start_adk": "adk api_server (terminal 1)",
            "2_start_gateway": "python api_server_fixed.py (terminal 2)",
            "3_test": "POST http://127.0.0.1:8000/api/query"
        }
    }), 200


if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"AIMarg ADK API Gateway (Fixed)")
    print(f"{'='*60}")
    print(f"Gateway: http://0.0.0.0:{GATEWAY_PORT}")
    print(f"ADK Server: {ADK_URL}")
    print(f"\nSetup:")
    print(f"1. Terminal 1: adk api_server")
    print(f"2. Terminal 2: python api_server_fixed.py")
    print(f"3. Terminal 3: npm run dev")
    print(f"\nTest:")
    print(f"curl http://127.0.0.1:{GATEWAY_PORT}/health")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=GATEWAY_PORT, debug=False)
