"""
TripEase ADK Server - Hugging Face Spaces Compatible
Wrapper that integrates the ADK agent with Flask for deployment
"""

import os
import sys
import json
import logging
from pathlib import Path
from typing import Dict, Any

from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all routes
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

# Configuration
HOST = os.environ.get('HOST', '0.0.0.0')
PORT = int(os.environ.get('PORT', 7860))
GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', '')

# Store conversation history
conversations = {}

# Try to import and initialize the ADK agent
try:
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'multi_tool_agent'))
    from agent import agent
    AGENT_AVAILABLE = True
    logger.info("✓ ADK Agent loaded successfully")
except ImportError as e:
    AGENT_AVAILABLE = False
    logger.warning(f"⚠ ADK Agent import failed: {e}")
    logger.warning("  App will run with limited functionality")
except Exception as e:
    AGENT_AVAILABLE = False
    logger.error(f"✗ ADK Agent initialization failed: {e}")


# ============================================================================
# Middleware & CORS Handlers
# ============================================================================

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


@app.after_request
def after_request(response):
    """Add CORS headers to every response"""
    response.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
    response.headers['Access-Control-Max-Age'] = '3600'
    response.headers['Content-Type'] = 'application/json'
    return response


# ============================================================================
# Routes
# ============================================================================

@app.route('/', methods=['GET'])
def index():
    """API Documentation"""
    return jsonify({
        "service": "TripEase ADK Server",
        "version": "2.0",
        "status": "running",
        "environment": {
            "host": HOST,
            "port": PORT,
            "agent_available": AGENT_AVAILABLE
        },
        "endpoints": {
            "GET /": "This documentation",
            "GET /health": "Health check",
            "POST /api/query": "Process a travel query",
            "GET /api/conversations": "List conversations"
        },
        "example_query": {
            "method": "POST",
            "endpoint": "/api/query",
            "body": {
                "query": "Book a train from Delhi to Mumbai on December 1st",
                "conversation_id": "user_123"
            }
        },
        "deployment": "Hugging Face Spaces",
        "docs": "https://huggingface.co/docs/hub/spaces"
    }), 200


@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    """Health check endpoint"""
    if request.method == "OPTIONS":
        return make_response('', 204)
    
    return jsonify({
        "status": "healthy",
        "service": "TripEase ADK Server",
        "agent": "available" if AGENT_AVAILABLE else "unavailable",
        "timestamp": datetime.now().isoformat(),
        "uptime": "running"
    }), 200


@app.route('/api/query', methods=['POST', 'GET', 'OPTIONS'])
def query():
    """
    Main query endpoint - processes travel-related queries
    
    POST body:
    {
        "query": "Book a flight from Delhi to New York",
        "conversation_id": "user_123"
    }
    """
    # Handle OPTIONS
    if request.method == "OPTIONS":
        return make_response('', 204)
    
    try:
        # Parse input
        if request.method == 'POST':
            data = request.get_json() or {}
            query_text = data.get('query', '').strip()
            conversation_id = data.get('conversation_id', f"conv_{datetime.now().timestamp()}")
        else:  # GET
            query_text = request.args.get('query', '').strip()
            conversation_id = request.args.get('conversation_id', f"conv_{datetime.now().timestamp()}")
        
        if not query_text:
            return jsonify({
                "status": "error",
                "message": "Missing 'query' parameter",
                "conversation_id": conversation_id
            }), 400
        
        logger.info(f"Query received: {query_text[:100]}")
        
        # Initialize conversation if new
        if conversation_id not in conversations:
            conversations[conversation_id] = {
                'history': [],
                'created_at': datetime.now().isoformat()
            }
        
        # Store user query
        conversations[conversation_id]['history'].append({
            'role': 'user',
            'content': query_text,
            'timestamp': datetime.now().isoformat()
        })
        
        # Process with ADK agent if available
        if AGENT_AVAILABLE:
            try:
                # This is a placeholder - adjust based on your agent's actual interface
                response_text = f"Processed: {query_text}"
                logger.info("Query processed by ADK Agent")
            except Exception as e:
                response_text = f"Agent error: {str(e)}"
                logger.error(f"Agent processing failed: {e}")
        else:
            response_text = f"Agent unavailable. Query received: {query_text}"
        
        # Store assistant response
        conversations[conversation_id]['history'].append({
            'role': 'assistant',
            'content': response_text,
            'timestamp': datetime.now().isoformat()
        })
        
        # Return response
        return jsonify({
            "status": "success",
            "conversation_id": conversation_id,
            "query": query_text,
            "response": response_text,
            "timestamp": datetime.now().isoformat(),
            "agent_available": AGENT_AVAILABLE
        }), 200
        
    except Exception as e:
        logger.error(f"Query processing error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e),
            "error_type": type(e).__name__
        }), 500


@app.route('/api/conversations', methods=['GET'])
def get_conversations():
    """List all active conversations"""
    return jsonify({
        "status": "success",
        "total_conversations": len(conversations),
        "conversation_ids": list(conversations.keys()),
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/api/conversations/<conversation_id>', methods=['GET'])
def get_conversation(conversation_id: str):
    """Get specific conversation history"""
    if conversation_id not in conversations:
        return jsonify({
            "status": "error",
            "message": f"Conversation '{conversation_id}' not found"
        }), 404
    
    return jsonify({
        "status": "success",
        "conversation_id": conversation_id,
        "history": conversations[conversation_id],
        "timestamp": datetime.now().isoformat()
    }), 200


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        "status": "error",
        "message": "Endpoint not found",
        "path": request.path
    }), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal error: {error}")
    return jsonify({
        "status": "error",
        "message": "Internal server error",
        "error_type": type(error).__name__
    }), 500


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == '__main__':
    print("\n" + "="*70)
    print("TripEase ADK Server - Hugging Face Spaces")
    print("="*70)
    print(f"🌐 Host: {HOST}")
    print(f"🔌 Port: {PORT}")
    print(f"✓ Agent: {'Available' if AGENT_AVAILABLE else 'Unavailable'}")
    print(f"📍 URL: http://{HOST}:{PORT}")
    print(f"📚 Docs: http://{HOST}:{PORT}/")
    print("="*70)
    print("\nStarting server...\n")
    
    # Run Flask app
    app.run(
        host=HOST,
        port=PORT,
        debug=False,
        use_reloader=False
    )
