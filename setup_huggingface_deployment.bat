@echo off
REM Quick setup script for Hugging Face deployment

echo.
echo ============================================================
echo TripEase ADK - Hugging Face Deployment Setup
echo ============================================================
echo.

REM Check if we have the required files
if not exist "pythonservers\ADK\requirements.txt" (
    echo ERROR: requirements.txt not found!
    echo Make sure you're running this from the project root.
    pause
    exit /b 1
)

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.11+
    pause
    exit /b 1
)

echo.
echo Step 1: Create Hugging Face Account
echo   Visit: https://huggingface.co/join
echo.

pause

echo.
echo Step 2: Create a new Space
echo   1. Go to: https://huggingface.co/spaces/create
echo   2. Fill in:
echo      - Space name: tripease-adk-server
echo      - Space type: Docker
echo      - Visibility: Public
echo   3. Click "Create Space"
echo.

pause

echo.
echo Step 3: Choose deployment method:
echo.
echo Option A - Web UI (Easiest):
echo   1. Go to your Space page
echo   2. Click "Files" tab
echo   3. Upload these files:
echo      - pythonservers/ADK/requirements.txt
echo      - pythonservers/ADK/app.py
echo      - pythonservers/ADK/multi_tool_agent/ (folder)
echo      - Dockerfile
echo.

echo Option B - Git Push:
echo   1. git clone https://huggingface.co/spaces/YOUR-USERNAME/tripease-adk-server
echo   2. Copy ADK files into the cloned directory
echo   3. Copy Dockerfile
echo   4. git add .
echo   5. git commit -m "Deploy TripEase ADK"
echo   6. git push
echo.

pause

echo.
echo Step 4: Add Environment Variables
echo   1. Go to your Space Settings
echo   2. Click "Repository secrets"
echo   3. Add:
echo      - GOOGLE_API_KEY: [your-api-key]
echo      - PERPLEXITY_API_KEY: [your-api-key]
echo.

pause

echo.
echo Step 5: Wait for deployment
echo   - Check the "Logs" tab in your Space
echo   - Wait for the green "Running" status
echo   - This usually takes 2-5 minutes
echo.

pause

echo.
echo Step 6: Test your API
echo   Run in PowerShell:
echo.
echo   curl -X POST https://YOUR-USERNAME-tripease-adk-server.hf.space/api/query `
echo     -H "Content-Type: application/json" `
echo     -d '{\"query\": \"Book a flight from Delhi to Mumbai\"}'
echo.

echo.
echo ============================================================
echo Setup complete!
echo Your API will be available at:
echo https://YOUR-USERNAME-tripease-adk-server.hf.space
echo ============================================================
echo.

pause
