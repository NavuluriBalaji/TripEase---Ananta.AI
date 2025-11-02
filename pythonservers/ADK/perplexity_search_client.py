"""
Perplexity Search API - Direct search without models
Uses Perplexity's search functionality to fetch real travel information
"""

import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import Perplexity SDK
try:
    from perplexity import Perplexity
    PERPLEXITY_AVAILABLE = True
except ImportError:
    PERPLEXITY_AVAILABLE = False
    print("Warning: Install Perplexity SDK with: pip install perplexity-py")


class PerplexitySearchClient:
    """Direct search using Perplexity API"""
    
    def __init__(self):
        self.api_key = os.getenv('PERPLEXITY_API_KEY')
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY not set")
        
        if PERPLEXITY_AVAILABLE:
            self.client = Perplexity(api_key=self.api_key)
        else:
            self.client = None
    
    def search_destinations(self, category: str) -> List[Dict[str, Any]]:
        """
        Search for travel destinations by category
        Returns real search results from Perplexity
        """
        if not self.client:
            print("Perplexity client not available")
            return []
        
        category_queries = {
            'friends': [
                "Best group trip destinations for friends adventure",
                "Fun destinations for friend groups 2024 2025",
                "Group travel destinations trending now"
            ],
            'solo': [
                "Best solo travel destinations for backpackers",
                "Safe solo travel destinations 2024",
                "Solo adventure travel trending destinations"
            ],
            'peace': [
                "Most peaceful relaxing travel destinations meditation",
                "Best peaceful vacation spots retreat centers",
                "Calm destination travel meditation yoga 2024"
            ],
            'temples': [
                "Most important temples pilgrimage sites worldwide",
                "Best temple destinations spiritual travel",
                "Famous temples tourist destinations 2024"
            ],
            'adventure': [
                "Best adventure travel destinations extreme sports",
                "Trekking hiking adventure destinations trending",
                "Adventure sports travel destinations 2024"
            ],
            'beach': [
                "Best beach destinations vacation resorts",
                "Tropical beach travel destinations trending",
                "Beach resort destinations 2024"
            ]
        }
        
        queries = category_queries.get(category.lower(), category_queries['friends'])
        
        try:
            # Perform search with multiple queries
            search = self.client.search.create(query=queries)
            
            # Process results into destination recommendations
            destinations = []
            
            for i, result in enumerate(search.results):
                if i >= 6:  # Limit to 6 results
                    break
                
                destinations.append({
                    'id': f"{category}-{i}",
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', ''),
                    'source': getattr(result, 'source', ''),
                    'category': category
                })
            
            return destinations
        
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def search_trip_info(self, destination: str, query_type: str = "best places") -> List[Dict[str, Any]]:
        """
        Search for specific trip information about a destination
        
        Args:
            destination: Destination name
            query_type: Type of info (best places, restaurants, hotels, activities, etc.)
        """
        if not self.client:
            return []
        
        queries = [
            f"Best things to do in {destination} 2024",
            f"{destination} travel guide attractions",
            f"{destination} local restaurants dining",
            f"{destination} hotels accommodation 2024",
            f"{destination} transportation travel tips"
        ]
        
        try:
            search = self.client.search.create(query=queries)
            
            results = []
            for result in search.results:
                results.append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', ''),
                    'source': getattr(result, 'source', '')
                })
            
            return results[:10]
        
        except Exception as e:
            print(f"Trip info search error: {e}")
            return []
    
    def search_and_compile_trip_plan(self, destination: str, days: int, category: str) -> Dict[str, Any]:
        """
        Search multiple queries and compile into a trip plan
        """
        if not self.client:
            return {'error': 'Client not available'}
        
        queries = [
            f"{destination} {days} day itinerary things to do",
            f"Best restaurants local food {destination}",
            f"{destination} hotels accommodation options",
            f"How to get around {destination} transportation",
            f"Best time to visit {destination} weather",
            f"Budget cost expenses {destination} travel",
            f"{destination} safety travel tips local customs",
            f"Hidden gems local recommendations {destination}"
        ]
        
        try:
            search = self.client.search.create(query=queries)
            
            trip_info = {
                'destination': destination,
                'days': days,
                'category': category,
                'research': []
            }
            
            # Organize results by topic
            for result in search.results:
                trip_info['research'].append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', ''),
                    'source': getattr(result, 'source', '')
                })
            
            return trip_info
        
        except Exception as e:
            print(f"Trip plan search error: {e}")
            return {'error': str(e)}


# Example usage
if __name__ == "__main__":
    try:
        client = PerplexitySearchClient()
        
        print("=== Searching for Friends Trip Destinations ===")
        destinations = client.search_destinations('friends')
        for dest in destinations:
            print(f"\n{dest['title']}")
            print(f"URL: {dest['url']}")
            print(f"Snippet: {dest['snippet'][:100]}...")
        
        print("\n\n=== Searching Trip Info for Bali ===")
        bali_info = client.search_trip_info('Bali')
        for info in bali_info[:3]:
            print(f"\n{info['title']}")
            print(f"URL: {info['url']}")
        
        print("\n\n=== Compiling Trip Plan for Bali ===")
        trip_plan = client.search_and_compile_trip_plan('Bali', 7, 'friends')
        print(json.dumps(trip_plan, indent=2)[:500])
        
    except Exception as e:
        print(f"Error: {e}")
