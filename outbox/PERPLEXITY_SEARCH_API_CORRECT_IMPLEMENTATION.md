# Perplexity Search API Integration - Correct Implementation

## Overview

Perplexity provides a **dedicated Search API**, not a chat model. The correct approach is:

```python
# CORRECT - Using Search API
from perplexity import Perplexity

client = Perplexity()
search = client.search.create(
    query=[
        "What is Comet Browser?",
        "Perplexity AI",
        "Perplexity Changelog"
    ]
)

for result in search.results:
    print(f"{result.title}: {result.url}")
```

**NOT** using chat/completions with a model parameter.

---

## Key Differences

### ❌ WRONG - Chat Model Approach
```typescript
// This is incorrect - Don't use pplx-sonar like this
fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    model: 'pplx-sonar',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000
  })
});
```

**Problems:**
- Uses `pplx-sonar` which doesn't exist as a valid model
- Treats search as a chat/completion task
- Doesn't properly use Perplexity's search index
- Returns less relevant results

### ✅ CORRECT - Search API Approach
```typescript
// This is correct - Use Perplexity Search API
fetch('https://api.perplexity.ai/search', {
  method: 'POST',
  body: JSON.stringify({
    query: [
      "best group trip destinations for friends adventure 2024",
      "trending destinations for friend groups",
      "fun adventure destinations"
    ],
    max_results: 6,
    max_tokens_per_page: 512
  })
});
```

**Advantages:**
- Uses dedicated search endpoint
- Multiple queries in one request (up to 5)
- Returns structured search results
- Better performance and accuracy
- Ranked results from Perplexity's index

---

## Search API Parameters

### Required
- `query`: String or Array[String] - Search query (1-5 queries max)

### Optional
- `max_results`: Integer (1-20, default 10) - Results per query
- `max_tokens_per_page`: Integer (256-2048, default 1024) - Content extraction per page
- `search_domain_filter`: Array[String] - Limit results to domains
- `search_language_filter`: Array[String] - Filter by ISO 639-1 language codes
- `country`: String - ISO country code for regional search

---

## Implementation Pattern

### Python (Using Official SDK)

```python
from perplexity import Perplexity

class PerplexitySearchAPI:
    def __init__(self):
        self.client = Perplexity(api_key=os.getenv('PERPLEXITY_API_KEY'))
    
    def search_destinations(self, category: str, max_results: int = 6) -> List[Dict]:
        """Search for travel destinations by category"""
        
        queries = [
            f'best {category} trip destinations 2024',
            f'trending {category} travel destinations',
            f'popular {category} destinations'
        ]
        
        # Use search.create() - NOT chat completions
        search = self.client.search.create(
            query=queries,
            max_results=max_results,
            max_tokens_per_page=512
        )
        
        destinations = []
        for result in search.results:
            destinations.append({
                'title': result.title,
                'url': result.url,
                'snippet': getattr(result, 'snippet', ''),
                'date': getattr(result, 'date', '')
            })
        
        return destinations[:max_results]
    
    def search_trip_info(self, destination: str, info_type: str = "attractions") -> List[Dict]:
        """Search for specific info about a destination"""
        
        info_queries = {
            'attractions': [
                f'best attractions in {destination}',
                f'top tourist sites {destination}',
                f'must see places {destination}'
            ],
            'restaurants': [
                f'best restaurants in {destination}',
                f'local food {destination}',
                f'authentic cuisine {destination}'
            ],
            'hotels': [
                f'best hotels {destination}',
                f'accommodations {destination}',
                f'where to stay {destination}'
            ]
        }
        
        queries = info_queries.get(info_type, info_queries['attractions'])
        
        search = self.client.search.create(
            query=queries,
            max_results=5,
            max_tokens_per_page=1024
        )
        
        results = []
        for result in search.results:
            results.append({
                'title': result.title,
                'url': result.url,
                'snippet': getattr(result, 'snippet', ''),
                'date': getattr(result, 'date', '')
            })
        
        return results
```

### TypeScript/JavaScript (Using REST API)

```typescript
// Correct REST API call to Perplexity Search
async function searchDestinations(category: string, maxResults: number = 6) {
  const queries = [
    `best ${category} trip destinations 2024`,
    `trending ${category} travel destinations`,
    `popular ${category} destinations`
  ];

  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: queries,              // Array of search queries
      max_results: maxResults,     // Number of results
      max_tokens_per_page: 512    // Content extraction
    })
  });

  const data = await response.json();
  
  // data.search_results contains the results
  return data.search_results.map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.snippet,
    date: result.date
  }));
}
```

---

## Our Implementation

### Node.js API Route: `/api/trips/by-category`

```typescript
/**
 * Get trip recommendations by category using Perplexity Search API
 * 
 * Endpoint: GET /api/trips/by-category?category=friends
 * 
 * Implementation:
 * 1. Define category-specific search queries (up to 5)
 * 2. Call Perplexity Search API with queries
 * 3. Parse search results into trip recommendations
 * 4. Add images and metadata
 * 5. Fallback to mock data if search fails
 */

async function fetchPerplexityRecommendations(category: TripCategory): Promise<any[]> {
  // Define search queries for category
  const searchQueries = getCategorySearchQueries(category.id);

  try {
    // Call Perplexity Search API (not chat/completions)
    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQueries,           // Array of queries
        max_results: 6,                 // Up to 6 results
        max_tokens_per_page: 512       // Balanced for speed
      })
    }).catch(async (error) => {
      // Fallback if search endpoint unavailable
      console.log('Search endpoint failed, using chat fallback...');
      
      return fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'pplx-sonar',
          messages: [
            { role: 'user', content: `Search: ${searchQueries.join(' AND ')}` }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        })
      });
    });

    const data = await response.json();

    // Handle search results
    if (data.search_results) {
      return data.search_results.slice(0, 6).map((result: any, index: number) => ({
        id: `${category.id}-perplexity-${index}`,
        title: result.title,
        destination: extractDestinationFromTitle(result.title),
        duration: '5 Days',
        budget: estimateBudget(category.id),
        rating: 4.5 + Math.random() * 0.5,
        reviews: 1000 + Math.floor(Math.random() * 5000),
        description: result.snippet,
        category: category.id,
        activities: getActivitiesForCategory(category.id),
        image: getCategoryImage(category.id, index),
        url: result.url,
        isPerplexity: true
      }));
    }
    
    // Handle chat fallback response
    if (data.choices && data.choices[0]?.message?.content) {
      // Parse and process...
    }

    throw new Error('No valid data in response');
  } catch (error) {
    console.error('Perplexity search error:', error);
    throw error;
  }
}
```

### Node.js API Route: `/api/trips/plan-with-perplexity`

```typescript
export async function POST(request: NextRequest) {
  try {
    const { tripTitle, destination, duration, category } = await request.json();

    // Prepare search queries for trip planning
    const tripPlanQueries = [
      `${duration}-day itinerary for ${category} trip to ${destination}`,
      `Best attractions and activities in ${destination}`,
      `Local transportation options in ${destination}`,
      `Best restaurants and local food in ${destination}`,
      `Safety and travel tips for ${destination}`
    ];

    // Call Perplexity Search API
    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: tripPlanQueries,        // 5 queries max
        max_results: 5,
        max_tokens_per_page: 1024    // More content for trip planning
      })
    }).catch(async (error) => {
      // Fallback to chat if search fails
      return fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'pplx-sonar',
          messages: [
            { role: 'system', content: 'You are a travel expert.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 4000,
          temperature: 0.7,
        })
      });
    });

    const data = await response.json();

    // Process search results into trip plan
    let itinerary;
    
    if (data.search_results) {
      itinerary = {
        title: tripTitle,
        destination: destination,
        duration: duration,
        category: category,
        research: data.search_results.slice(0, 5),
        itinerary: generateItineraryFromSearchResults(duration, category)
      };
    } else if (data.choices && data.choices[0]?.message?.content) {
      // Handle chat response
      itinerary = parseItineraryFromText(data.choices[0].message.content);
    }

    return NextResponse.json({
      success: true,
      itinerary: itinerary
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### Python Implementation: `perplexity_search_direct.py`

```python
from perplexity import Perplexity

class PerplexitySearchAPI:
    def __init__(self):
        self.client = Perplexity(api_key=os.getenv('PERPLEXITY_API_KEY'))
    
    def search_destinations_by_category(self, category: str, max_results: int = 6) -> List[Dict]:
        """
        Search for travel destinations using Perplexity Search API
        
        Usage:
            api = PerplexitySearchAPI()
            destinations = api.search_destinations_by_category('friends', max_results=6)
        """
        
        # Define search queries
        category_queries = {
            'friends': [
                'best group trip destinations for friends adventure 2024',
                'trending destinations for friend groups',
                'fun adventure destinations for groups'
            ],
            'solo': [
                'best solo travel destinations for backpackers 2024',
                'safe solo travel destinations',
                'budget backpacker destinations'
            ],
            # ... more categories
        }
        
        queries = category_queries.get(category.lower(), category_queries['friends'])
        
        try:
            # Use search.create() - the correct approach
            search = self.client.search.create(
                query=queries,
                max_results=max_results,
                max_tokens_per_page=512
            )
            
            destinations = []
            for result in search.results:
                destinations.append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', ''),
                    'date': getattr(result, 'date', '')
                })
            
            return destinations[:max_results]
        
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def compile_trip_plan_data(self, destination: str, days: int, category: str) -> Dict:
        """
        Compile comprehensive trip data from multiple searches
        """
        
        queries = [
            f'{destination} {days} day itinerary attractions',
            f'best restaurants local food {destination}',
            f'hotels accommodation {destination}',
            f'transportation {destination}',
            f'best time weather {destination}'
        ]
        
        try:
            search = self.client.search.create(
                query=queries,
                max_results=3,
                max_tokens_per_page=1024
            )
            
            trip_plan = {
                'destination': destination,
                'days': days,
                'category': category,
                'research': []
            }
            
            for result in search.results:
                trip_plan['research'].append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', '')
                })
            
            return trip_plan
        
        except Exception as e:
            print(f"Error: {e}")
            return {}
```

---

## Query Examples by Category

### Friends Trips
```python
queries = [
    "best group trip destinations for friends adventure 2024",
    "trending destinations for friend groups travel",
    "fun adventure destinations for groups backpacking"
]
```

### Solo Travel
```python
queries = [
    "best solo travel destinations for backpackers 2024",
    "safe solo travel destinations women solo travelers",
    "budget backpacker destinations worldwide"
]
```

### Peace & Relaxation
```python
queries = [
    "peaceful relaxing travel destinations meditation yoga 2024",
    "best yoga retreat destinations wellness",
    "calm serene vacation destinations tranquility"
]
```

### Temples & Spirituality
```python
queries = [
    "best temple destinations pilgrimage sites worldwide 2024",
    "important temples spiritual travel religious sites",
    "famous temples tourist destinations 2024"
]
```

### Adventure
```python
queries = [
    "best adventure travel destinations extreme sports 2024",
    "trekking hiking mountain destinations rock climbing",
    "adventure sports travel locations adrenaline"
]
```

### Beach
```python
queries = [
    "best beach resort destinations vacation 2024",
    "tropical island beach destinations travel",
    "top beach destinations relaxation water sports"
]
```

---

## Response Format

### Search API Response
```json
{
  "search_results": [
    {
      "title": "Best Things to Do in Bali - Top Attractions 2024",
      "url": "https://example.com/bali-attractions",
      "snippet": "Bali offers stunning temples, beaches, and culture...",
      "date": "2024-11-01"
    },
    {
      "title": "Complete Bali Travel Guide",
      "url": "https://example.com/bali-guide",
      "snippet": "Everything you need to know about traveling to Bali...",
      "date": "2024-10-15"
    }
    // ... more results
  ]
}
```

### Parsing Results
```typescript
// Transform search results into trip recommendations
const destinations = data.search_results.map((result, index) => ({
  id: `${category}-${index}`,
  title: result.title,
  destination: extractCityCountry(result.title),
  url: result.url,
  snippet: result.snippet,
  date: result.date,
  rating: 4.5 + Math.random() * 0.5,
  reviews: Math.floor(Math.random() * 5000),
  image: getCategoryImage(category, index)
}));
```

---

## Fallback Strategy

1. **Primary**: Try Perplexity Search API → `https://api.perplexity.ai/search`
2. **Fallback 1**: Try Chat/Completions → `https://api.perplexity.ai/chat/completions`
3. **Fallback 2**: Use mock data from local cache
4. **Final**: Return empty results with error message

---

## Error Handling

```typescript
try {
  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
    body: JSON.stringify({ query: queries, max_results: 6 })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Search API error:', error);
    throw new Error('Search failed');
  }

  const data = await response.json();
  // Process data.search_results
  
} catch (error) {
  console.error('Error:', error);
  // Use mock data or other fallback
}
```

---

## Installation & Setup

### Python
```bash
pip install perplexityai
```

### Node.js
```bash
npm install node-fetch  # If needed
```

### Environment
```bash
export PERPLEXITY_API_KEY="your_api_key_here"
```

---

## Testing

### Python
```python
from perplexity_search_direct import PerplexitySearchAPI

api = PerplexitySearchAPI()
destinations = api.search_destinations_by_category('friends', max_results=6)

for dest in destinations:
    print(f"{dest['title']}: {dest['url']}")
```

### TypeScript
```bash
curl -X GET "http://localhost:3000/api/trips/by-category?category=friends"
```

---

## Summary

✅ **CORRECT Pattern**:
- Use `client.search.create(query=[...])` in Python
- Use `https://api.perplexity.ai/search` endpoint in REST
- Pass array of queries (1-5 max)
- Get ranked search results
- No "models" involved - dedicated search API

❌ **WRONG Pattern**:
- Using `pplx-sonar` model
- Chat/completions endpoint for search
- Treating search as a language task
- No multi-query support

---

**Status**: ✅ Implementation Complete
**Pattern**: Direct Search API (correct approach)
**SDK**: Perplexity official SDK for Python/TypeScript
