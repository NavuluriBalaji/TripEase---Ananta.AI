"""
AIMarg API Gateway - Simple proxy to ADK server
This wraps requests/responses for the frontend
"""

import os
import json
import uuid
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Store conversation history for multi-turn support
conversations = {}


@app.route('/api/query', methods=['POST', 'GET'])
def query():
    """
    Handle travel queries through ADK Agent
    
    Request format:
    POST /api/query
    {
        "query": "Book train from Ongole to Hyderabad on 04-11-2025",
        "conversation_id": "user_123_session_abc",
        "step": "initial"
    }
    
    Response:
    {
        "status": "success",
        "conversation_id": "...",
        "message": "Found 5 trains...",
        "display": "Formatted text",
        "trains": [...],
        "step": "showing_trains"
    }
    """
    try:
        # Handle both POST and GET
        if request.method == 'POST':
            data = request.get_json()
            query_text = data.get('query', '').strip()
            conversation_id = data.get('conversation_id', f"conv_{os.urandom(8).hex()}")
            step = data.get('step', 'initial')
        else:  # GET
            query_text = request.args.get('query', '').strip()
            conversation_id = request.args.get('conversation_id', f"conv_{os.urandom(8).hex()}")
            step = request.args.get('step', 'initial')
        
        if not query_text:
            return jsonify({
                "status": "error",
                "message": "Missing 'query' parameter",
                "conversation_id": conversation_id
            }), 400
        
        print(f"\n[ADK API] Query received:")
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
        
        # Add user message to history
        conv['history'].append({
            'role': 'user',
            'content': query_text
        })
        
        # Send to ADK Agent
        print(f"[ADK API] Sending to ADK Agent...")
        
        async def run_agent_async():
            """Run ADK agent and collect response"""
            try:
                # Create invocation context with user input
                if InvocationContext:
                    context = InvocationContext(initial_user_input=query_text)
                else:
                    # Create a simple context-like object
                    class SimpleContext:
                        def __init__(self, user_input):
                            self.initial_user_input = user_input
                    context = SimpleContext(query_text)
                
                # Collect response
                full_response = ""
                event_count = 0
                
                # Run agent asynchronously
                async for event in root_agent.run_async(context):
                    event_count += 1
                    print(f"[ADK API] Event {event_count}: {type(event).__name__}")
                    
                    # Extract text from various event types
                    if hasattr(event, 'text'):
                        full_response += event.text + "\n"
                    elif hasattr(event, 'content'):
                        full_response += str(event.content) + "\n"
                    elif isinstance(event, dict) and 'text' in event:
                        full_response += event['text'] + "\n"
                    else:
                        # Try string conversion
                        full_response += str(event) + "\n"
                
                return full_response.strip() if full_response else "Agent processed query successfully"
            except Exception as e:
                print(f"[ADK API] Async error: {str(e)}")
                import traceback
                print(traceback.format_exc())
                raise
        
        # Run async function
        try:
            response_text = asyncio.run(run_agent_async())
        except RuntimeError as e:
            if "asyncio.run() cannot be called from a running event loop" in str(e):
                # Event loop already running, use different approach
                print("[ADK API] Event loop already running, using alternative approach")
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    response_text = loop.run_until_complete(run_agent_async())
                finally:
                    loop.close()
            else:
                raise
        
        print(f"[ADK API] Response received: {response_text[:100]}...")
        
        # Parse response for special formatting
        trains = []
        display = response_text
        booking_url = None
        
        # Try to extract structured data if present
        if '[0]' in response_text or 'Train' in response_text:
            # Parse train display if present
            display = response_text
        
        # Add assistant response to history
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
            "display": display,
            "timestamp": __import__('datetime').datetime.now().isoformat(),
        }
        
        if trains:
            result['trains'] = trains
        
        return jsonify(result), 200
    
    except Exception as e:
        import traceback
        print(f"[ADK API] Error: {str(e)}")
        print(f"[ADK API] Traceback:\n{traceback.format_exc()}")
        
        return jsonify({
            "status": "error",
            "message": str(e),
            "error_type": type(e).__name__,
            "conversation_id": conversation_id if 'conversation_id' in locals() else None,
            "traceback": traceback.format_exc()
        }), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "ADK API Server",
        "timestamp": __import__('datetime').datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def index():
    """API documentation"""
    return jsonify({
        "service": "AIMarg ADK API Server",
        "version": "1.0",
        "endpoints": {
            "POST /api/query": {
                "description": "Send travel query to ADK Agent",
                "example": {
                    "query": "Book train from Ongole to Hyderabad on 04-11-2025",
                    "conversation_id": "user_123_session_abc",
                    "step": "initial"
                }
            },
            "GET /api/query": {
                "description": "Send travel query (GET alternative)",
                "example": "?query=Book+train&conversation_id=abc&step=initial"
            },
            "GET /health": "Health check",
            "GET /": "API documentation"
        }
    }), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"\n{'='*60}")
    print(f"AIMarg ADK API Server")
    print(f"{'='*60}")
    print(f"Starting on http://0.0.0.0:{port}")
    print(f"Endpoints:")
    print(f"  POST http://127.0.0.1:{port}/api/query")
    print(f"  GET http://127.0.0.1:{port}/health")
    print(f"{'='*60}\n")
    
    app.run(host='0.0.0.0', port=port, debug=True)
