# Deploying TripEase ADK Server to Hugging Face Spaces

## Overview
Your ADK server can be deployed to **Hugging Face Spaces** which provides free hosting for Python/Flask applications. This is ideal for your trip planning agent.

## Prerequisites
1. **Hugging Face Account** - Sign up at https://huggingface.co
2. **Git** - For pushing code to Hugging Face
3. **Hugging Face CLI** (optional but recommended)

## Deployment Steps

### Option 1: Deploy via Hugging Face Web UI (Easiest)

1. **Create a new Space**
   - Go to https://huggingface.co/spaces
   - Click "Create new Space"
   - Fill in:
     - **Space name**: `tripease-adk-server`
     - **Space type**: Select "Docker" (for full control) or "Python" (for simplicity)
     - **Visibility**: Public or Private
   - Click "Create Space"

2. **Upload Your Files**
   - Navigate to the Files tab in your new Space
   - Upload the following files:
     - `requirements.txt` - Your Python dependencies
     - `app.py` - Your main Flask application (or `api_server_fixed.py` renamed)
     - `ADK/multi_tool_agent/agent.py` - Your agent implementation
     - Any other supporting files

3. **Add Environment Variables**
   - Go to "Settings" → "Repository secrets"
   - Add your sensitive environment variables:
     - `GOOGLE_API_KEY`
     - `PERPLEXITY_API_KEY` (if using)
     - `ADK_URL`
     - etc.

### Option 2: Deploy via Git Push (Recommended)

#### Step 1: Create requirements.txt for ADK
Create a new file in your ADK directory with all dependencies:

```
google-adk==0.1.0
google-cloud-aiplatform==1.35.0
vertexai==0.42.0
Flask==3.0.3
Flask-CORS==4.0.0
requests==2.31.0
beautifulsoup4==4.12.2
Jinja2==3.1.2
```

#### Step 2: Create app.py wrapper for Hugging Face

Create a wrapper that runs your ADK server on Hugging Face's port (usually 7860):

```python
import os
from flask import Flask
from flask_cors import CORS
from google.adk.agents import Agent
import sys

# Import your agent
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ADK', 'multi_tool_agent'))
from agent import agent

app = Flask(__name__)
CORS(app)

# Port configuration
PORT = int(os.environ.get('PORT', 7860))
HOST = '0.0.0.0'

@app.route('/health', methods=['GET'])
def health():
    return {'status': 'healthy', 'service': 'TripEase ADK Agent'}, 200

@app.route('/api/query', methods=['POST', 'OPTIONS'])
def query():
    # Your existing query handler code
    pass

if __name__ == '__main__':
    app.run(host=HOST, port=PORT, debug=False)
```

#### Step 3: Create Dockerfile (if using Docker space)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose port
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV HOST=0.0.0.0

# Run app
CMD ["python", "app.py"]
```

#### Step 4: Create .gitignore

```
__pycache__/
*.py[cod]
*$py.class
.env
.env.local
.venv/
venv/
.DS_Store
*.pyc
```

#### Step 5: Push to Hugging Face

```bash
# Clone your Space repo
git clone https://huggingface.co/spaces/your-username/tripease-adk-server

# Copy your files
cp -r ADK/ tripease-adk-server/
cp pythonservers/requirements.txt tripease-adk-server/
cp outbox/api_server_fixed.py tripease-adk-server/app.py

# Create other config files (see above)

# Push to Hugging Face
cd tripease-adk-server
git add .
git commit -m "Deploy TripEase ADK Server"
git push
```

## Hugging Face Spaces Benefits

✅ **Free Hosting** - Run 24/7 for free (subject to usage limits)
✅ **Auto-restart** - Automatic recovery from crashes
✅ **Easy Scaling** - Upgrade to paid GPU/CPU if needed
✅ **Public/Private** - Choose visibility level
✅ **Web UI** - Auto-generated web interface
✅ **Persistent Storage** - /tmp directory for data
✅ **Environment Variables** - Secure secret management
✅ **Collaboration** - Easy team access with permissions

## Comparison: Hugging Face vs Alternatives

| Platform | Cost | Ease | Features | Uptime |
|----------|------|------|----------|--------|
| **HF Spaces** | Free | ⭐⭐⭐⭐⭐ | Great | Good |
| Render | $7/mo | ⭐⭐⭐⭐ | Good | Excellent |
| Railway | Pay-as-you-go | ⭐⭐⭐⭐ | Good | Excellent |
| Google Cloud Run | $0.15/mo | ⭐⭐⭐ | Excellent | Excellent |
| Heroku | Paid | ⭐⭐⭐ | Good | Good |

## Important Considerations

### 1. **API Keys & Secrets**
Never commit `.env` files! Use Hugging Face Secrets:
- Go to Settings → Repository secrets
- Add each secret individually
- Reference in your code: `os.environ.get('SECRET_NAME')`

### 2. **File Size Limits**
- Hugging Face Spaces has storage limits
- Your `node_modules` and `.venv` should NOT be committed
- Use `.gitignore` to exclude them

### 3. **Cold Start Performance**
- First request may take 10-30 seconds
- Add health check endpoints for monitoring

### 4. **Resources**
- Free spaces get: 2 CPU cores, 16GB RAM
- Upgrade available for ML accelerators (GPU/TPU)

### 5. **CORS Configuration**
Your existing CORS setup is good - HF Spaces should respect it.

## Testing Your Deployment

Once deployed, test with:

```bash
# Health check
curl https://your-username-tripease-adk-server.hf.space/health

# Send a query
curl -X POST https://your-username-tripease-adk-server.hf.space/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Book a flight from Delhi to Mumbai"}'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| App crashes on startup | Check logs in Hugging Face UI, verify requirements.txt |
| Import errors | Ensure all dependencies are in requirements.txt |
| Port not accessible | Ensure your app uses `PORT` env var and binds to `0.0.0.0` |
| Timeout errors | Increase timeout or optimize code performance |
| Memory issues | Reduce batch sizes, optimize queries |

## Next Steps

1. **Create Hugging Face Account** → https://huggingface.co/join
2. **Create a Space** → https://huggingface.co/spaces
3. **Choose deployment method** (Web UI or Git)
4. **Deploy files** using the methods above
5. **Test endpoints** with curl or Postman
6. **Monitor logs** in Hugging Face dashboard

---

**Questions?**
- HF Spaces Docs: https://huggingface.co/docs/hub/spaces
- Discord: https://huggingface.co/support
