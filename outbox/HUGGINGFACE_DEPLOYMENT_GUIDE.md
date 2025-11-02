# 🚀 Deploying TripEase ADK Server to Hugging Face Spaces

## ✅ Quick Answer: YES, You Can Deploy to Hugging Face!

Your ADK server is **perfect for Hugging Face Spaces**. Here's everything you need to know.

---

## 📋 What You Need

1. **Hugging Face Account** (free at https://huggingface.co)
2. **Git** (or use web UI)
3. **Your API Keys** ready (Google, Perplexity, etc.)

---

## 🎯 Option 1: Deploy via Hugging Face Web UI (Easiest - 5 minutes)

### Step 1: Create a Space
```
1. Go to https://huggingface.co/spaces
2. Click "Create new Space"
3. Fill in:
   - Space name: tripease-adk-server
   - Space type: Docker (recommended) or Python
   - Visibility: Public or Private
4. Click "Create Space"
```

### Step 2: Upload Files via Web UI
```
1. Click "Files" tab
2. Upload these files:
   - requirements.txt (from pythonservers/ADK/)
   - app.py (from pythonservers/ADK/)
   - multi_tool_agent/ (entire folder)
```

### Step 3: Add Secrets
```
1. Go to Settings → Repository secrets
2. Add each environment variable:
   - GOOGLE_API_KEY
   - Any other API keys needed
```

### Step 4: Done! ✓
Your Space will auto-start and build. Check the "Logs" tab to monitor.

---

## 🔧 Option 2: Deploy via Git Push (More Control)

### Step 1: Create Hugging Face Space

```bash
# Go to https://huggingface.co/spaces and create a new Space named "tripease-adk-server"
```

### Step 2: Clone Your Space

```bash
git clone https://huggingface.co/spaces/YOUR-USERNAME/tripease-adk-server
cd tripease-adk-server
```

### Step 3: Add Your Files

```bash
# Copy your ADK files
cp -r C:\AI-Space\TripEase---Ananta.AI\pythonservers\ADK\multi_tool_agent .
cp C:\AI-Space\TripEase---Ananta.AI\pythonservers\ADK\requirements.txt .
cp C:\AI-Space\TripEase---Ananta.AI\pythonservers\ADK\app.py .
```

### Step 4: Create Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY multi_tool_agent/ ./multi_tool_agent/
COPY app.py .

EXPOSE 7860
ENV PORT=7860
ENV HOST=0.0.0.0

CMD ["python", "-u", "app.py"]
```

### Step 5: Add .env Template

Create `.env` file:
```bash
GOOGLE_API_KEY=your-key-here
PERPLEXITY_API_KEY=your-key-here
ADK_URL=http://localhost:7860
```

**⚠️ IMPORTANT:** Never commit `.env` with real keys!
Use HF Secrets instead (Settings → Repository secrets)

### Step 6: Push to Hugging Face

```bash
git add .
git commit -m "Deploy TripEase ADK Server"
git push
```

**That's it!** HF Spaces will automatically build and deploy.

---

## 📊 Deployment Comparison Table

| Feature | HF Spaces | Render | Google Cloud | Heroku |
|---------|-----------|--------|--------------|--------|
| **Cost** | FREE ✓ | $7/mo | Pay-as-go | Paid |
| **Uptime** | Good | Excellent | Excellent | Good |
| **Ease** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Resources** | 2 CPU, 16GB RAM | 0.5 CPU, 512MB | Scalable | Limited |
| **Cold Start** | 10-30s | 1-2s | <1s | 5-10s |
| **Best For** | Dev/Demo | Production | Enterprise | Production |

---

## 🔑 Environment Variables to Add

In HF Spaces Settings → Repository secrets:

```
GOOGLE_API_KEY=AIzaSyD...
PERPLEXITY_API_KEY=ppl-...
VERTEX_PROJECT_ID=your-gcp-project
VERTEX_LOCATION=us-central1
ADK_URL=https://your-space.hf.space
```

---

## 🧪 Testing Your Deployment

Once deployed, test these endpoints:

### Health Check
```bash
curl https://your-username-tripease-adk-server.hf.space/health
```

### Send a Query
```bash
curl -X POST https://your-username-tripease-adk-server.hf.space/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Book a flight from Delhi to Mumbai"}'
```

### View Conversations
```bash
curl https://your-username-tripease-adk-server.hf.space/api/conversations
```

---

## 📁 Final File Structure

```
tripease-adk-server/
├── app.py                          # Main Flask app
├── requirements.txt                # Python dependencies
├── Dockerfile                      # Docker configuration
├── multi_tool_agent/
│   ├── agent.py                   # Your ADK agent
│   ├── __init__.py
│   └── .env
├── .gitignore
└── README.md
```

---

## ⚡ Performance Tips

### 1. Optimize Import Time
```python
# Use lazy imports for heavy modules
def process_query():
    from slow_module import function  # Import only when needed
    return function()
```

### 2. Cache Results
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_airport_code(city):
    # Results cached for 100 calls
    return code
```

### 3. Use Connection Pooling
```python
import requests
session = requests.Session()  # Reuse connections
session.get(url)
```

### 4. Reduce Dependencies
Keep `requirements.txt` minimal. HF builds faster with fewer packages.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **App won't start** | Check logs (Logs tab), verify requirements.txt syntax |
| **Import errors** | Ensure all dependencies listed in requirements.txt |
| **Port not accessible** | App must bind to `0.0.0.0` and use `PORT=7860` |
| **Timeout on first request** | Normal (cold start). Add health check. |
| **Out of memory** | Reduce batch sizes, optimize queries |
| **Secrets not working** | Restart Space after adding secrets |

---

## 📚 Useful Links

- **HF Spaces Docs:** https://huggingface.co/docs/hub/spaces
- **Docker Guide:** https://docs.docker.com/get-started/
- **Flask Docs:** https://flask.palletsprojects.com/
- **Hugging Face Community:** https://huggingface.co/support

---

## 🎉 Next Steps

1. **Create Space** → https://huggingface.co/spaces/create
2. **Upload/Push Files** using Option 1 or 2 above
3. **Add Secrets** in Settings
4. **Test Endpoints** with curl
5. **Monitor Logs** in HF dashboard
6. **Share Your Space** with the community!

---

## 💡 Pro Tips

✅ Use **public spaces** to showcase your work  
✅ Add a **README** explaining your API  
✅ Enable **persistent storage** for databases  
✅ Set up **auto-restart** for crashes  
✅ Monitor **resource usage** in the Hub  
✅ Use **GitHub Actions** to auto-deploy updates  

---

**Questions?** Check HF Spaces docs or ask the community: https://huggingface.co/support
