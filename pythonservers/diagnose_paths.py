"""
Diagnostic script to identify path-related issues on Windows
"""
import os
import sys
from pathlib import Path

print("=" * 70)
print("PATH DIAGNOSTIC REPORT")
print("=" * 70)

# Current working directory
print(f"\n1. Current Working Directory:")
print(f"   {os.getcwd()}")

# Python executable
print(f"\n2. Python Executable:")
print(f"   {sys.executable}")

# Check if key directories exist
print(f"\n3. Directory Existence Checks:")
pythonservers_dir = Path(__file__).parent
adk_dir = pythonservers_dir / "ADK"
agent_dir = adk_dir / "multi_tool_agent"
agent_file = agent_dir / "agent.py"

dirs_to_check = [
    ("PythonServers", pythonservers_dir),
    ("ADK", adk_dir),
    ("multi_tool_agent", agent_dir),
    ("agent.py", agent_file),
]

for name, path in dirs_to_check:
    exists = path.exists()
    status = "✓ EXISTS" if exists else "✗ MISSING"
    print(f"   {name:25} {status:15} {path}")

# Check sys.path
print(f"\n4. Python sys.path:")
for i, path in enumerate(sys.path, 1):
    print(f"   [{i}] {path}")

# Environment variables
print(f"\n5. Relevant Environment Variables:")
env_vars = ['PATH', 'PYTHONPATH', 'GOOGLE_APPLICATION_CREDENTIALS', 'ADK_URL']
for var in env_vars:
    value = os.environ.get(var, "[NOT SET]")
    if len(value) > 80:
        value = value[:77] + "..."
    print(f"   {var:30} {value}")

print("\n" + "=" * 70)
print("END DIAGNOSTIC REPORT")
print("=" * 70)
