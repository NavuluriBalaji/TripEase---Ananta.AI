"""
AIMarg API Gateway - Proxies to running ADK server
Start ADK first with: adk api_server
This gateway wraps its output for the frontend
"""

import os
import requests
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Configuration
ADK_SERVER_URL = os.environ.get('ADK_SERVER_URL', 'http://127.0.0.1:9090')  # ADK default port
GATEWAY_PORT = int(os.environ.get('PORT', 8000))

# Conversation history
conversations = {}


@app.route('/api/query', methods=['POST', 'GET'])
def query():
    """
    Gateway endpoint that proxies to ADK server
    
    Request: POST http://127.0.0.1:8000/api/query
    {
        "query": "Book train from Ongole to Hyderabad on 04-11-2025",
        "conversation_id": "user_123",
        "step": "initial"
    }
    
    Response:
    {
        "status": "success",
        "conversation_id": "...",
        "message": "Found 5 trains...",
        ...
    }
    """
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
        
        # Get or create conversation
        if conversation_id not in conversations:
            conversations[conversation_id] = {'history': [], 'context': {}}
        
        conv = conversations[conversation_id]
        conv['history'].append({'role': 'user', 'content': query_text})
        
        # Forward to ADK server
        print(f"[GATEWAY] Forwarding to ADK server at {ADK_SERVER_URL}...")
        
        adk_response = forward_to_adk(query_text, conversation_id, conv['history'])
        
        # Add to history
        conv['history'].append({'role': 'assistant', 'content': adk_response})
        
        # Build response
        result = {
            "status": "success",
            "conversation_id": conversation_id,
            "step": step,
            "message": adk_response,
            "display": adk_response,
            "timestamp": datetime.now().isoformat(),
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        import traceback
        print(f"[GATEWAY] Error: {str(e)}")
        print(traceback.format_exc())
        
        return jsonify({
            "status": "error",
            "message": f"Error: {str(e)}",
            "error_type": type(e).__name__,
            "conversation_id": conversation_id if 'conversation_id' in locals() else None,
        }), 500


def forward_to_adk(query_text, conversation_id, history):
    """Forward request to running ADK server"""
    try:
        # Try to reach ADK server
        check_url = f"{ADK_SERVER_URL}/health"
        print(f"[GATEWAY] Checking ADK server at {check_url}...")
        
        health_response = requests.get(check_url, timeout=2)
        if health_response.status_code != 200:
            raise ConnectionError(f"ADK server not healthy: {health_response.status_code}")
        
        print(f"[GATEWAY] ✓ ADK server is healthy")
        
        # Send query to ADK
        # ADK expects the query in the request body
        payload = {
            "query": query_text,
            "conversation_id": conversation_id,
            "history": history
        }
        
        adk_url = f"{ADK_SERVER_URL}/api/chat"  # or appropriate endpoint
        print(f"[GATEWAY] Sending to {adk_url}...")
        
        response = requests.post(adk_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('response') or result.get('message') or json.dumps(result)
        else:
            return f"ADK server error: {response.status_code} - {response.text}"
            
    except requests.ConnectionError as e:
        return (
            f"Cannot reach ADK server at {ADK_SERVER_URL}. "
            f"Please start it with: adk api_server\n\n"
            f"Error: {str(e)}"
        )
    except requests.Timeout:
        return f"ADK server timeout at {ADK_SERVER_URL}. Server may be slow."
    except Exception as e:
        print(f"[GATEWAY] Forward error: {str(e)}")
        return f"Error communicating with ADK: {str(e)}"


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "healthy",
        "service": "AIMarg Gateway",
        "adk_server": ADK_SERVER_URL,
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def index():
    """API documentation"""
    return jsonify({
        "service": "AIMarg ADK API Gateway",
        "version": "1.0",
        "note": "This gateway proxies requests to ADK server",
        "adk_server": ADK_SERVER_URL,
        "endpoints": {
            "POST /api/query": {
                "description": "Send travel query",
                "example": {
                    "query": "Book train from Ongole to Hyderabad on 04-11-2025",
                    "conversation_id": "user_123",
                    "step": "initial"
                }
            },
            "GET /health": "Health check"
        },
        "setup": {
            "1_start_adk": "adk api_server (in another terminal)",
            "2_start_gateway": "python api_server_gateway.py",
            "3_test": "POST http://127.0.0.1:8000/api/query"
        }
    }), 200


if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"AIMarg ADK API Gateway")
    print(f"{'='*60}")
    print(f"Gateway listening on: http://0.0.0.0:{GATEWAY_PORT}")
    print(f"Proxying to ADK at: {ADK_SERVER_URL}")
    print(f"\nEndpoints:")
    print(f"  POST http://127.0.0.1:{GATEWAY_PORT}/api/query")
    print(f"  GET http://127.0.0.1:{GATEWAY_PORT}/health")
    print(f"\nSetup:")
    print(f"1. Start ADK: adk api_server (terminal 1)")
    print(f"2. This gateway: python api_server_gateway.py (terminal 2)")
    print(f"3. Frontend: npm run dev (terminal 3)")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=GATEWAY_PORT, debug=True)
