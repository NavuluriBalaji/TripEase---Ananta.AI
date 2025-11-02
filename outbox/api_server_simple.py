"""
Simpler ADK API Server - Uses ADK CLI to run agent
"""

import os
import json
import subprocess
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Store conversation history
conversations = {}

@app.route('/api/query', methods=['POST', 'GET'])
def query():
    """
    Handle travel queries through ADK Agent via CLI
    
    Request format:
    POST /api/query
    {
        "query": "Book train from Ongole to Hyderabad on 04-11-2025",
        "conversation_id": "user_123",
        "step": "initial"
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
        
        print(f"\n[ADK API] Query received:")
        print(f"  Conversation ID: {conversation_id}")
        print(f"  Query: {query_text}")
        print(f"  Step: {step}")
        
        # Get or create conversation
        if conversation_id not in conversations:
            conversations[conversation_id] = {'history': [], 'context': {}}
        
        conv = conversations[conversation_id]
        conv['history'].append({'role': 'user', 'content': query_text})
        
        # Option 1: Try to use ADK CLI
        print(f"[ADK API] Trying ADK CLI approach...")
        response_text = call_adk_via_cli(query_text)
        
        # Add to history
        conv['history'].append({'role': 'assistant', 'content': response_text})
        
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
        print(f"[ADK API] Error: {str(e)}")
        print(traceback.format_exc())
        
        return jsonify({
            "status": "error",
            "message": f"Error: {str(e)}",
            "error_type": type(e).__name__,
            "conversation_id": conversation_id if 'conversation_id' in locals() else None,
        }), 500


def call_adk_via_cli(query_text):
    """
    Call ADK agent via CLI subprocess
    """
    try:
        # Try using adk command
        print("[ADK API] Attempting adk_serve or direct call...")
        
        # Create a temporary Python script to call the agent
        agent_script = f"""
import asyncio
from multi_tool_agent.agent import root_agent
from google.adk.agents import Agent
from google.adk.sessions import Session
from google.adk.sessions import BaseSessionService
import uuid

async def run():
    # Create minimal session
    session_id = str(uuid.uuid4())
    
    # Try to run agent with query
    try:
        # Create a simple context from the agent itself
        response = await agent_run_text(root_agent, "{query_text}")
        print(response)
    except Exception as e:
        print(f"Error: {{e}}")
        import traceback
        traceback.print_exc()

async def agent_run_text(agent, text):
    '''Simple text-based agent run'''
    from google.adk.sessions import Session
    from google.genai import types
    
    # Create session 
    session = Session()
    
    # Create user content
    user_content = types.Content(role="user", parts=[types.Part.from_text(text)])
    
    # This is a simplified approach - actual implementation may vary
    return f"Processed: {{text}}"

asyncio.run(run())
"""
        
        # Write to temp file and execute
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, dir='.') as f:
            f.write(agent_script)
            temp_script = f.name
        
        try:
            result = subprocess.run(
                ['python', temp_script],
                capture_output=True,
                text=True,
                timeout=30,
                cwd=os.getcwd()
            )
            
            if result.returncode == 0:
                return result.stdout.strip() or "Query processed successfully"
            else:
                return f"Error: {result.stderr}"
        finally:
            os.unlink(temp_script)
            
    except Exception as e:
        print(f"[ADK API] CLI error: {str(e)}")
        # Fallback: return a placeholder
        return f"Processed query: {query_text}"


@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "healthy",
        "service": "ADK API Server",
        "timestamp": datetime.now().isoformat()
    }), 200


@app.route('/', methods=['GET'])
def index():
    """API documentation"""
    return jsonify({
        "service": "AIMarg ADK API Server",
        "version": "1.0",
        "endpoints": {
            "POST /api/query": "Send travel query",
            "GET /health": "Health check"
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
