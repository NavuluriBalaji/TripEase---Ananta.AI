#!/usr/bin/env python3
"""
Test ADK Agent directly - verify agent works before API server
"""

import asyncio
from multi_tool_agent.agent import root_agent

async def test_agent():
    """Test the ADK agent with a simple query"""
    print("[TEST] Starting ADK Agent test...")
    
    try:
        # Import InvocationContext
        from google.adk.agents.invocation_context import InvocationContext
        print("[TEST] InvocationContext imported successfully")
        
        # Create context
        query = "Book train from Ongole to Hyderabad on 04-11-2025"
        context = InvocationContext(initial_user_input=query)
        print(f"[TEST] Context created for query: {query}")
        
        # Run agent
        print("[TEST] Running agent...")
        response_parts = []
        event_num = 0
        
        async for event in root_agent.run_async(context):
            event_num += 1
            print(f"[TEST] Event {event_num}: {type(event).__name__}")
            
            # Try to extract text
            if hasattr(event, 'text'):
                print(f"  → text: {event.text[:100]}...")
                response_parts.append(event.text)
            elif hasattr(event, 'content'):
                print(f"  → content: {str(event.content)[:100]}...")
                response_parts.append(str(event.content))
            else:
                print(f"  → raw: {str(event)[:100]}...")
                response_parts.append(str(event))
        
        # Combine response
        full_response = "\n".join(response_parts)
        print(f"\n[TEST] Full response:\n{full_response}")
        print(f"\n[TEST] ✅ Agent test completed successfully!")
        return True
        
    except Exception as e:
        print(f"[TEST] ❌ Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    success = asyncio.run(test_agent())
    exit(0 if success else 1)
