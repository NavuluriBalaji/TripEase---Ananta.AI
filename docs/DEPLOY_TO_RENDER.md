# Deploying AIMarg Backend to Render

## 📋 Prerequisites

- GitHub account with your repository
- Render account (free at https://render.com)
- Environment variables ready

## 🚀 Deployment Steps

### Step 1: Prepare Your Repository

Ensure your repository is pushed to GitHub with all files:
```
pythonservers/
├── adk/                          # ADK directory
│   ├── multi_tool_agent/
│   │   └── agent.py              # Main agent file
│   └── requirements.txt            # Python dependencies
├── app.py                         # Flask app (optional proxy)
└── ...
```

### Step 2: Create Render Web Service

1. Go to https://render.com and log in
2. Click **New +** → **Web Service**
3. Select **Connect a GitHub repository**
4. Search and select your GitHub repo
5. Click **Connect**

### Step 3: Configure Service Settings

Fill in the following fields:

| Field | Value |
|-------|-------|
| **Name** | `tripease-backend` (or your choice) |
| **Environment** | `Python 3` |
| **Region** | Select closest to your users |
| **Branch** | `main` |
| **Build Command** | `pip install -r pythonservers/requirements.txt` |
| **Start Command** | `cd pythonservers && adk api_server` |

### Step 4: Add Environment Variables

Click **Environment** in the Render dashboard:

```bash
# Required
GOOGLE_API_KEY=AIzaSyDmWxWXRpc6JOxBZyTceeXK2dg7Nh2goIc

# Optional
PORT=8000
PYTHONUNBUFFERED=1
```

### Step 5: Configure Build Settings

- **Runtime**: Python 3
- **Disk**: 1GB (free tier)
- **Plan**: Free (for testing) or Starter Pro (production)

### Step 6: Deploy

1. Click **Create Web Service**
2. Render will automatically deploy on any git push to `main`
3. Wait 5-10 minutes for build and deployment
4. You'll get a URL like: `https://tripease-backend.onrender.com`

### Step 7: Update Frontend

Update `.env.local` in your Next.js project:

```bash
NEXT_PUBLIC_API_URL=https://tripease-backend.onrender.com
```

Then rebuild and redeploy your Next.js app.

## ✅ Verification

Test your deployment:

```bash
# Test health
curl https://tripease-backend.onrender.com/

# Test API
curl "https://tripease-backend.onrender.com/api/query?query=hello"
```

Expected response:
```json
{
  "status": "success",
  "message": "AI response...",
  "timestamp": "2025-11-02T..."
}
```

## 🔧 Troubleshooting

### Build Fails
- **Check logs**: Click "View Logs" in Render dashboard
- **Python version**: Ensure `requirements.txt` is in correct directory
- **Dependencies**: Verify all imports are in `requirements.txt`

### API Returns 500 Error
- Check backend logs in Render dashboard
- Verify `GOOGLE_API_KEY` is set correctly
- Check that agent.py has no import errors

### Slow Response Time
- Render free tier has limited CPU
- First request after idle takes 30+ seconds (cold start)
- Upgrade to Starter Pro for production

### CORS Errors
- ADK should have CORS enabled by default
- If using alternative setup, ensure CORS headers are set

## 🌍 Frontend Deployment (Next.js)

### Option 1: Deploy to Vercel (Recommended)

1. Connect your GitHub repo to Vercel
2. Set environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://tripease-backend.onrender.com
   ```
3. Deploy

### Option 2: Deploy to Render (Same Service)

1. Create second Render service for Next.js
2. Build Command: `npm run build`
3. Start Command: `npm run start`

## 📊 Monitoring

### In Render Dashboard:
- **Logs**: Real-time server logs
- **Metrics**: CPU, Memory, Bandwidth usage
- **Status**: Service health status
- **Deploys**: Previous deployment history

### Sample Log Output (Healthy):
```
Starting server on port 8000...
ADK Agent initialized with Gemini 2.0 Flash
API Server running at http://0.0.0.0:8000
Waiting for requests...
```

## 💰 Cost Estimation

| Component | Free Tier | Starter Pro |
|-----------|-----------|------------|
| **Compute** | Limited CPU | 0.5 CPU |
| **Memory** | 512 MB | 1 GB |
| **Bandwidth** | 50 GB/month | 250 GB/month |
| **Monthly Cost** | $0 | $7/month |

**Note**: Free tier sleeps after 15 minutes of inactivity (30 sec startup)

## 🔒 Security

1. **Never commit secrets**: Use environment variables
2. **Rotate API keys**: Regularly change `GOOGLE_API_KEY`
3. **Enable backups**: For production tier
4. **Monitor usage**: Check bandwidth and CPU logs

## 📝 Environment Variables Reference

```bash
# Gemini API Key (from Google Cloud Console)
GOOGLE_API_KEY=your_key_here

# Server Port (Render assigns automatically)
PORT=8000

# Prevent Python buffering (recommended)
PYTHONUNBUFFERED=1

# Custom backend URL (if needed)
BACKEND_URL=https://your-backend.onrender.com
```

## 🎯 Production Checklist

- [ ] Repository pushed to GitHub
- [ ] All dependencies in `requirements.txt`
- [ ] `GOOGLE_API_KEY` added to Render environment
- [ ] `.env.local` updated in Next.js with Render URL
- [ ] Build command tested locally
- [ ] Start command tested locally
- [ ] API tested with curl: `GET /api/query?query=test`
- [ ] Frontend environment variable updated
- [ ] Frontend redeployed

## 📞 Support

- **Render Docs**: https://render.com/docs
- **ADK Documentation**: https://ai.google.dev/adk
- **GitHub Issues**: Create issue in your repository

## 🚀 Auto-Deployment

After deployment, Render automatically redeploys when you:
- Push to `main` branch
- Update environment variables
- Change Render configuration

No manual intervention needed!

---

**Your AIMarg backend is now live on the internet! 🌍✨**
