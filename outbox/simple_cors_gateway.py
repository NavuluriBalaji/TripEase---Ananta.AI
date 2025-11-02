#!/usr/bin/env python3
"""
Simple CORS-enabled HTTP gateway for ADK
No external dependencies - uses Python's built-in http.server
Perfect for development and avoids Flask/dependency issues
"""

import json
import uuid
import requests
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# Configuration
ADK_URL = 'http://127.0.0.1:9090'
GATEWAY_PORT = 8000

# Store conversation history
conversations = {}


class CORSHandler(BaseHTTPRequestHandler):
    """HTTP handler with CORS enabled"""
    
    def do_OPTIONS(self):
        """Handle preflight OPTIONS requests"""
        self.send_response(200, 'OK')
        self._add_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'')
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/health':
            self.handle_health()
        elif self.path == '/' :
            self.handle_index()
        else:
            self.send_error(404)
    
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/query':
            self.handle_query()
        else:
            self.send_error(404)
    
    def handle_query(self):
        """Handle POST /api/query"""
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body) if body else {}
            
            query_text = data.get('query', '').strip()
            conversation_id = data.get('conversation_id', f"conv_{uuid.uuid4().hex[:8]}")
            step = data.get('step', 'initial')
            
            if not query_text:
                self.send_json_response({
                    "status": "error",
                    "message": "Missing 'query' parameter",
                    "conversation_id": conversation_id
                }, 400)
                return
            
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
            
            response_text = self.forward_to_adk(query_text, conversation_id)
            
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
            
            self.send_json_response(result, 200)
            
        except Exception as e:
            import traceback
            print(f"[GATEWAY] Error: {str(e)}")
            print(traceback.format_exc())
            
            self.send_json_response({
                "status": "error",
                "message": str(e),
                "error_type": type(e).__name__,
            }, 500)
    
    def handle_health(self):
        """Handle GET /health"""
        response = {
            "status": "healthy",
            "service": "AIMarg Gateway",
            "adk_server": ADK_URL,
            "gateway_port": GATEWAY_PORT,
            "timestamp": datetime.now().isoformat()
        }
        self.send_json_response(response, 200)
    
    def handle_index(self):
        """Handle GET /"""
        response = {
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
                "2_start_gateway": "python simple_cors_gateway.py (terminal 2)",
                "3_test": "POST http://127.0.0.1:8000/api/query"
            }
        }
        self.send_json_response(response, 200)
    
    def forward_to_adk(self, query_text, conversation_id):
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
    
    def send_json_response(self, data, status_code):
        """Send JSON response with CORS headers"""
        json_response = json.dumps(data).encode('utf-8')
        
        self.send_response(status_code)
        self._add_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(json_response))
        self.end_headers()
        self.wfile.write(json_response)
    
    def _add_cors_headers(self):
        """Add CORS headers to response"""
        origin = self.headers.get('Origin', '*')
        self.send_header('Access-Control-Allow-Origin', origin)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.send_header('Access-Control-Max-Age', '3600')
    
    def log_message(self, format, *args):
        """Override to use custom logging"""
        # Print in our format instead of default
        print(f"[HTTP] {args[0]}")


def run_server():
    """Start the HTTP server"""
    server_address = ('0.0.0.0', GATEWAY_PORT)
    httpd = HTTPServer(server_address, CORSHandler)
    
    print(f"\n{'='*60}")
    print(f"AIMarg ADK API Gateway (Pure Python)")
    print(f"{'='*60}")
    print(f"Gateway: http://0.0.0.0:{GATEWAY_PORT}")
    print(f"ADK Server: {ADK_URL}")
    print(f"\nSetup:")
    print(f"1. Terminal 1: adk api_server")
    print(f"2. Terminal 2: python simple_cors_gateway.py (THIS TERMINAL)")
    print(f"3. Terminal 3: npm run dev")
    print(f"\nTest:")
    print(f"curl http://127.0.0.1:{GATEWAY_PORT}/health")
    print(f"{'='*60}\n")
    
    print(f"[SERVER] Starting on http://0.0.0.0:{GATEWAY_PORT}...")
    print(f"[SERVER] Press Ctrl+C to stop\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n[SERVER] Shutting down...")
        httpd.shutdown()
        print(f"[SERVER] Stopped")


if __name__ == '__main__':
    run_server()
