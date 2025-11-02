# EasyMyTrip API Architecture & Data Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                 │
│              "Plan trip to Goa from Mumbai for 3 days"              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATION LAYER                         │
│              (Google ADK Agent - gemini-2.0-flash)                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
        ┌───────────────────┐   ┌───────────────────┐
        │  input_parser()   │   │  web_search()     │
        │  - Extract: origin,   │  - Fallback search│
        │    destination,       │  - General info   │
        │    date, party_size   │                   │
        └───────────────────┘   └───────────────────┘
                    │
                    │ Detected Intents: hotels, trains, buses, activities, cars
                    │
        ┌───────────┼───────────┬─────────────┬──────────────┐
        │           │           │             │              │
        ▼           ▼           ▼             ▼              ▼
    HOTELS      TRAINS       BUSES      ACTIVITIES        CARS
    API         API           API          API           API/CABS


┌─────────────────────────────────────────────────────────────────────┐
│                  EASEMYTRIP API LAYER (6 Functions)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 1. get_hotels_easemytrip(destination, checkin, checkout)   │   │
│  │    URL: easemytrip.com/hotels/hotels-in-{destination}      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 2. get_trains_easemytrip(origin, destination, date)        │   │
│  │    URL: railways.easemytrip.com/TrainListInfo/...          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 3. get_buses_easemytrip(origin, destination, date)         │   │
│  │    URL: easemytrip.com/bus/{origin}-to-{destination}...    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 4. get_activities_easemytrip(destination)                  │   │
│  │    URL: easemytrip.com/activities/activity-in-{dest}/      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 5. get_car_bookings_easemytrip(origin, destination)        │   │
│  │    URL: easemytrip.com/cabs/{origin}-to-{destination}...   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 6. get_airport_cabs_easemytrip(airport_city)               │   │
│  │    URL: easemytrip.com/cabs/cabs-from-{airport}-airport/   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────┬──────────────────────────────────────┘
                              │ (Each API does):
                              │
                    ┌─────────┴──────────┐
                    │                    │
                    ▼                    ▼
        ┌───────────────────┐  ┌──────────────────┐
        │  HTTP Request     │  │ Fetch HTML       │
        │  (10s timeout)    │  │ Response         │
        └───────────────────┘  └────────┬─────────┘
                                        │
                                        ▼
        ┌───────────────────────────────────────────┐
        │  DATA PROCESSING PIPELINE                 │
        ├───────────────────────────────────────────┤
        │                                           │
        │  ┌──────────────────────────────────────┐ │
        │  │ 1. clean_html()                      │ │
        │  │    - Remove <script> tags            │ │
        │  │    - Remove <style> tags             │ │
        │  │    - Decode HTML entities            │ │
        │  └──────────────────────────────────────┘ │
        │                                           │
        │  ┌──────────────────────────────────────┐ │
        │  │ 2. extract_from_html()               │ │
        │  │    - Apply regex patterns            │ │
        │  │    - Extract hotel names, prices     │ │
        │  │    - Extract train numbers, times    │ │
        │  │    - Extract all relevant data       │ │
        │  └──────────────────────────────────────┘ │
        │                                           │
        │  ┌──────────────────────────────────────┐ │
        │  │ 3. call_perplexity()                 │ │
        │  │    - Send to LLM for analysis        │ │
        │  │    - Get structured JSON             │ │
        │  │    - Assess data quality             │ │
        │  └──────────────────────────────────────┘ │
        │                                           │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  LLM ANALYSIS (Perplexity)                │
        ├───────────────────────────────────────────┤
        │                                           │
        │  Input: Cleaned HTML + Sample Data       │
        │                                           │
        │  Processing:                             │
        │  - Identify data patterns                │
        │  - Extract structured fields             │
        │  - Parse prices, ratings, times          │
        │  - Assess completeness                   │
        │                                           │
        │  Output: JSON Structure                  │
        │  {                                       │
        │    "hotels": [...],                      │
        │    "total_hotels": N,                    │
        │    "price_range": {...},                 │
        │    "data_quality": "complete"            │
        │  }                                       │
        │                                           │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  RESPONSE STRUCTURE                       │
        ├───────────────────────────────────────────┤
        │ {                                         │
        │   "status": "ok",                        │
        │   "url": "https://easemytrip.com/...",   │
        │   "data_found": true,                    │
        │   "html_length": 125000,                 │
        │   "sample_data": [                       │
        │     "Hotel name",                        │
        │     "₹5000",                             │
        │     "4.5 stars"                          │
        │   ],                                     │
        │   "llm_analysis": {                      │
        │     "hotels": [...],                     │
        │     "total_hotels": 50,                  │
        │     "currency": "INR",                   │
        │     "data_quality": "complete"           │
        │   }                                      │
        │ }                                        │
        │                                          │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  AGENT CONSOLIDATION                      │
        │  (Combine results from all APIs)          │
        └───────────────────┬───────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │  FINAL RESPONSE TO USER                   │
        │                                           │
        │  Trip Plan for Mumbai → Goa:             │
        │  ├─ Hotels (50 options)                  │
        │  ├─ Buses (24 options)                   │
        │  ├─ Activities (45 options)              │
        │  └─ Airport Cabs (8 options)             │
        │                                           │
        │  Price Range: ₹800-₹5000 per day         │
        │  Average Rating: 4.3/5                   │
        │                                           │
        └───────────────────────────────────────────┘
```

## Data Flow Detail - Single API Call

```
get_hotels_easemytrip(destination='Goa')
│
├─ Step 1: Build URL
│  └─ https://www.easemytrip.com/hotels/hotels-in-goa
│
├─ Step 2: Fetch HTML
│  └─ response.text → 125KB of HTML
│
├─ Step 3: Clean HTML
│  Input:  <script>...</script><div class="hotel">...</div>...
│  Output: <div class="hotel">...</div>...
│
├─ Step 4: Extract with Regex
│  Pattern: /hotel|property[\s:]*([^<\n]{2,100})/gi
│  Output:  ["The Leela Goa", "Taj Holiday", "ITC Grand Goa", ...]
│
├─ Step 5: Call LLM (Perplexity)
│  Input: "Analyze this hotel data: ..."
│  Output: 
│  {
│    "hotels": [
│      {"name": "The Leela Goa", "price": "₹8000", "rating": 4.8},
│      {"name": "Taj Holiday", "price": "₹6500", "rating": 4.6},
│      ...
│    ],
│    "total_hotels": 52,
│    "price_range": {"min": "₹2000", "max": "₹15000"}
│  }
│
└─ Step 6: Return Structured Response
   {
     "status": "ok",
     "destination": "Goa",
     "data_found": true,
     "html_length": 125000,
     "llm_analysis": { ... }
   }
```

## Parallel API Execution

```
User Request: "Plan trip: Mumbai→Goa, need: hotels, buses, activities"
                                 │
                 ┌───────────────┼───────────────┐
                 │               │               │
                 ▼               ▼               ▼
          get_hotels_      get_buses_      get_activities_
          easemytrip()    easemytrip()     easemytrip()
          │ 5-10s         │ 5-10s          │ 5-10s
          ├─ Fetch HTML   ├─ Fetch HTML    ├─ Fetch HTML
          ├─ Parse        ├─ Parse         ├─ Parse
          ├─ Call LLM     ├─ Call LLM      ├─ Call LLM
          │               │                │
          ▼               ▼                ▼
      Hotels Data    Buses Data       Activities Data
                 │               │               │
                 └───────────────┼───────────────┘
                                 │
                                 ▼
                      Consolidate & Return
                    (Total: ~8-10s, not 30s)
```

## Error Handling Flow

```
API Call
   │
   ├─ Network Error? ────→ Set timeout (10s)
   │                       │
   │                       ├─ Timeout? ──→ Return error + empty array
   │                       │
   │                       └─ Success? ──→ Continue
   │
   ├─ Parse Error? ───────→ Try multiple patterns
   │                       │
   │                       ├─ Match found? ──→ Continue
   │                       │
   │                       └─ No match? ──→ Return partial data
   │
   ├─ LLM Unavailable? ───→ Use sample data only
   │
   └─ Encode Error? ──────→ Use fallback encoding
```

## Performance Metrics

```
Operation               Duration    Notes
─────────────────────────────────────────────
Network Fetch:          2-5s        HTTP request + response
HTML Cleaning:          <100ms      Regex operations
Regex Extraction:       <500ms      Pattern matching
LLM Analysis:           3-5s        Perplexity API call
JSON Formatting:        <100ms      Output serialization
─────────────────────────────────────────────
Total per API:          5-10s       Average time
6 APIs in Parallel:     8-10s       Not 30-60s
```

## Regex Patterns Used

```
Hotels Pattern:
  /(?:hotel|property|accommodation)[\s:]*([^<\n]{2,100}?)[\s<].*?(?:price|cost|₹|\$)[\s:]*([^\n<]{2,30}?)[\s<].*?(?:rating|⭐|★)[\s:]*([^\n<]{2,20})?/gi

Trains Pattern:
  /(?:train|railway)[\s:]*([^\n<]{2,50}?)[\s<].*?(?:no\.?|number)[\s:]*(\d+)[\s<].*?(?:depart|from)[\s:]*(\d{1,2}:\d{2})/gi

Buses Pattern:
  /(?:bus|coach)[\s:]*([^\n<]{2,50}?)[\s<].*?(?:depart|from)[\s:]*(\d{1,2}:\d{2})[\s<].*?(?:price|fare)[:\s]*([^\n<]{2,30}?)/gi

Activities Pattern:
  /(?:activity|tour|experience)[\s:]*([^\n<]{2,100}?)[\s<].*?(?:description|details)[\s:]*([^\n<]{2,150}?)/gi

Cars Pattern:
  /(?:car|vehicle|taxi|cab)[\s:]*([^\n<]{2,80}?)[\s<].*?(?:price|fare)[:\s]*([^\n<]{2,30}?)[\s<].*?(?:capacity|seats)[:\s]*(\d+)/gi
```

## Quality Assessment Levels

```
Data Quality: "complete"
├─ All major fields found
├─ >80% data present
├─ No critical gaps
└─ Ready for display

Data Quality: "partial"
├─ Some fields missing
├─ 50-80% data present
├─ Some gaps acceptable
└─ Show with warnings

Data Quality: "empty"
├─ <50% data present
├─ Critical fields missing
├─ Parsing failed
└─ Show fallback/error
```

---

**Architecture Version**: 1.0  
**Last Updated**: November 2, 2025  
**Status**: Ready for Testing
