# Perplexity AI Integration Guide

## Overview

This document describes the integration of Perplexity AI with the TripEase travel planner application. The system uses Perplexity's real-time search capabilities to provide up-to-date travel recommendations, trip planning, and destination information.

## Features Implemented

### 1. **Real-Time Trip Recommendations by Category**
- **Endpoint**: `/api/trips/by-category?category={categoryId}`
- **Method**: GET
- **Features**:
  - Fetches trending destinations from Perplexity AI with real-time information
  - Automatically falls back to mock data if Perplexity API fails
  - Supports 6 trip categories: Friends, Solo, Peace, Temples, Adventure, Beach
  - Returns 6 destinations per category with complete trip details

#### Categories Available:
```
👥 Friends Trips - Group adventures with friends
🧳 Solo Running Way - Solo travel & self-discovery  
🧘 Peace & Relaxation - Peaceful retreats and calm places
🛕 Temples & Spirituality - Spiritual and religious sites
🏔️ Adventure - Thrilling outdoor experiences
🏖️ Beach Getaways - Coastal escapes and beach resorts
```

#### Response Structure:
```json
{
  "success": true,
  "category": "friends",
  "trips": [
    {
      "id": "friends-perplexity-0",
      "title": "Goa Beach Party Bash with Friends",
      "destination": "Goa, India",
      "duration": "5 Days",
      "budget": "₹20,000 - ₹40,000 per person",
      "rating": 4.7,
      "reviews": 2450,
      "description": "Perfect for group activities, beach parties, and water sports.",
      "category": "friends",
      "activities": ["Beach Activities", "Nightlife", "Water Sports", "Local Food"],
      "image": "https://images.unsplash.com/photo-1552832860...",
      "isPerplexity": true
    }
  ],
  "categories": [ /* all available categories */ ],
  "source": "perplexity"
}
```

### 2. **Perplexity-Powered Trip Planning**
- **Endpoint**: `/api/trips/plan-with-perplexity`
- **Method**: POST
- **Features**:
  - Creates detailed trip itineraries using Perplexity's real-time travel knowledge
  - Provides current information on transportation, weather, costs
  - Includes cultural tips, safety information, and local recommendations
  - Generates JSON-structured detailed plans

#### Request Body:
```json
{
  "tripTitle": "Bali Adventure",
  "destination": "Bali, Indonesia",
  "duration": 7,
  "category": "friends",
  "interests": ["beach", "adventure", "nightlife"],
  "budget": "medium"
}
```

#### Response Structure:
```json
{
  "success": true,
  "itinerary": {
    "title": "Bali Adventure",
    "destination": "Bali, Indonesia",
    "duration": 7,
    "category": "friends",
    "overallTips": "...",
    "bestTimeToVisit": "April-October",
    "currentWeather": "...",
    "estimatedCost": "₹35,000 - ₹60,000 per person per day",
    "safetyTips": "...",
    "whattoPack": [...],
    "cuisine": [...],
    "itinerary": [
      {
        "day": 1,
        "title": "Arrival & Exploration",
        "activities": [...],
        "restaurants": [...],
        "estimatedCost": "₹2,500"
      }
    ],
    "transportationOptions": [...],
    "culturalTips": [...],
    "localRecommendations": [...]
  }
}
```

### 3. **Trip Recommendations by Category**
- **Endpoint**: `/api/trips/recommendations/{category}?limit=10`
- **Method**: GET
- **Features**:
  - Real-time destination research using Perplexity
  - Fetches current travel information and trending spots
  - Customizable number of recommendations

### 4. **Destination Images**
- **Endpoint**: `/api/images/destination-images`
- **Methods**: GET (with query) or POST
- **Features**:
  - Fetches real images from Unsplash, Pixabay, and Pexels
  - Falls back to curated public Unsplash URLs if APIs fail
  - Supports multiple image sources for better coverage

#### Request (GET):
```
/api/images/destination-images?destination=Bali&limit=5
```

#### Request (POST):
```json
{
  "destination": "Bali",
  "limit": 5
}
```

#### Response:
```json
{
  "success": true,
  "destination": "Bali",
  "images": [
    {
      "source": "unsplash",
      "url": "https://images.unsplash.com/...",
      "thumb": "https://images.unsplash.com/...",
      "alt": "Beautiful Bali beach",
      "photographer": "John Doe",
      "attribution": "Photo by John Doe on Unsplash"
    }
  ],
  "count": 5
}
```

## API Configuration

### Environment Variables
Add to `.env`:
```
PERPLEXITY_API_KEY=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
PIXABAY_API_KEY=your_pixabay_key (optional)
PEXELS_API_KEY=your_pexels_key (optional)
```

## Perplexity API Details

### Model Used:
- **Model**: `pplx-7b-online` - Optimized for real-time information
- **Temperature**: 0.8 - Balances creativity with accuracy
- **Max Tokens**: 2000-4000 depending on endpoint
- **Top P**: 0.95 - High diversity in responses

### Query Examples:

**Friends Trips:**
```
"Best group trip destinations for friends adventure and fun"
```

**Solo Travel:**
```
"Best solo travel destinations for backpackers"
```

**Peace & Meditation:**
```
"Most peaceful and relaxing travel destinations for meditation"
```

**Temples & Pilgrimage:**
```
"Most important temples and religious pilgrimage sites worldwide"
```

**Adventure:**
```
"Best adventure travel destinations for extreme sports"
```

## Frontend Integration

### React Component Usage:

```tsx
// Fetch trips by category
const fetchTrips = async (categoryId: string) => {
  const response = await fetch(`/api/trips/by-category?category=${categoryId}`);
  const data = await response.json();
  setTrips(data.trips);
};

// Plan a trip
const planTrip = async (trip: any) => {
  const response = await fetch('/api/trips/plan-with-perplexity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tripTitle: trip.title,
      destination: trip.destination,
      duration: 7,
      category: 'friends',
      interests: ['beach', 'adventure'],
      budget: 'medium'
    })
  });
  const plan = await response.json();
  setTripPlan(plan.itinerary);
};

// Get destination images
const fetchImages = async (destination: string) => {
  const response = await fetch(`/api/images/destination-images?destination=${destination}&limit=5`);
  const data = await response.json();
  setImages(data.images);
};
```

## Python Backend Integration

### Install Perplexity SDK:
```bash
pip install perplexity-py
```

### Usage:

```python
from perplexity_trip_planner import PerplexityTripPlanner

# Initialize planner
planner = PerplexityTripPlanner()

# Search for destination
results = planner.search_destination_info("Bali")

# Plan a trip
trip_plan = planner.plan_trip_detailed(
    destination="Bali",
    duration=7,
    category="Friends",
    interests=["beach", "adventure"]
)

# Get travel recommendations
recommendations = get_trip_recommendations("peace", limit=10)
```

### Flask Routes:
- `POST /api/perplexity/search-destination` - Search destination info
- `POST /api/perplexity/plan-trip` - Create trip plan
- `POST /api/perplexity/travel-info` - Get travel info
- `GET /api/perplexity/recommendations/<category>` - Get recommendations
- `GET /api/perplexity/categories` - List available categories

## Error Handling

### Fallback Strategy:
1. **Primary**: Perplexity API for real-time information
2. **Secondary**: Mock data with Unsplash image URLs
3. **Tertiary**: Hardcoded fallback images for offline access

### Common Errors:

**"Perplexity API key not configured"**
- Solution: Add `PERPLEXITY_API_KEY` to `.env` file

**"Failed to fetch recommendations"**
- Solution: Check API key validity, check network connectivity

**"No valid JSON found in response"**
- Solution: Retry request or use mock data fallback

## Performance Optimization

### Caching Strategy:
- Cache category recommendations for 1 hour
- Cache trip plans for session duration
- Cache images for 24 hours

### Request Limits:
- Max 100 requests/minute per API key
- Max 5 concurrent requests recommended
- Batch similar queries to save tokens

## Testing

### Test Real-Time Recommendations:
```bash
# Test Friends category
curl "http://localhost:3000/api/trips/by-category?category=friends"

# Test Solo category  
curl "http://localhost:3000/api/trips/by-category?category=solo"
```

### Test Trip Planning:
```bash
curl -X POST http://localhost:3000/api/trips/plan-with-perplexity \
  -H "Content-Type: application/json" \
  -d '{
    "tripTitle": "Bali Adventure",
    "destination": "Bali",
    "duration": 7,
    "category": "friends"
  }'
```

### Force Mock Data (Bypass Perplexity):
```bash
curl "http://localhost:3000/api/trips/by-category?category=friends&perplexity=false"
```

## Benefits

✅ **Real-Time Information** - Always current travel data
✅ **High Accuracy** - Powered by Perplexity's search capabilities
✅ **Personalized Recommendations** - Category-based suggestions
✅ **Comprehensive Planning** - Day-by-day itineraries with costs
✅ **Beautiful Images** - Real destination photos from public APIs
✅ **Fallback Support** - Mock data if API unavailable
✅ **Multiple Categories** - 6 different trip types to explore
✅ **Cost-Effective** - Uses free tier where possible

## Future Enhancements

- [ ] User preference learning for better recommendations
- [ ] Real-time pricing integration
- [ ] Weather forecast integration
- [ ] Visa requirement checking
- [ ] Travel insurance recommendations
- [ ] Local experience booking integration
- [ ] Multi-language support
- [ ] Travel group matching

## Support

For issues or questions:
1. Check `.env` configuration
2. Verify API keys
3. Check network connectivity
4. Review API logs in console
5. Test with mock data (`perplexity=false`)

---

**Last Updated**: November 2, 2025
**API Version**: 1.0
**Status**: Production Ready ✅
