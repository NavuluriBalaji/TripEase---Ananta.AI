"""
Perplexity Search API - Direct Implementation
Uses the dedicated Search API, not chat models
"""

import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

try:
    from perplexity import Perplexity
    PERPLEXITY_AVAILABLE = True
except ImportError:
    PERPLEXITY_AVAILABLE = False
    print("Install with: pip install perplexityai")


class PerplexitySearchAPI:
    """
    Direct Perplexity Search API implementation
    Uses the official Perplexity SDK for web search
    """
    
    def __init__(self):
        self.api_key = "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"
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY not set")
        
        if PERPLEXITY_AVAILABLE:
            self.client = Perplexity(api_key=self.api_key)
        else:
            self.client = None
    
    def search_destinations_by_category(self, category: str, max_results: int = 6) -> List[Dict[str, Any]]:
        """
        Search for travel destinations by category using Perplexity Search API
        
        Example:
            destinations = search_api.search_destinations_by_category('friends')
        """
        if not self.client:
            print("Perplexity client not available")
            return []
        
        # Define search queries for each category
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
            'peace': [
                'peaceful relaxing travel destinations meditation 2024',
                'best yoga retreat destinations',
                'calm serene vacation destinations'
            ],
            'temples': [
                'best temple destinations pilgrimage sites 2024',
                'important temples spiritual travel',
                'famous religious sites worldwide'
            ],
            'adventure': [
                'best adventure travel destinations extreme sports 2024',
                'trekking hiking mountain destinations',
                'adventure sports travel locations'
            ],
            'beach': [
                'best beach resort destinations 2024',
                'tropical island vacation spots',
                'top beach destinations for travel'
            ]
        }
        
        queries = category_queries.get(category.lower(), category_queries['friends'])
        
        try:
            # Use multi-query search
            search = self.client.search.create(
                query=queries,
                max_results=max_results,
                max_tokens_per_page=512  # Balanced for speed and content
            )
            
            destinations = []
            
            # Parse results
            for result in search.results:
                destination = {
                    'title': result.title or 'Travel Destination',
                    'url': result.url or '',
                    'snippet': getattr(result, 'snippet', ''),
                    'date': getattr(result, 'date', ''),
                    'source': result.url.split('/')[2] if result.url else 'Unknown'
                }
                destinations.append(destination)
            
            # Limit to max_results
            return destinations[:max_results]
        
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def search_destination_info(self, destination: str, info_type: str = "attractions") -> List[Dict[str, Any]]:
        """
        Search for specific information about a destination
        
        info_type: 'attractions', 'restaurants', 'hotels', 'transportation', 'best_time'
        """
        if not self.client:
            return []
        
        info_queries = {
            'attractions': [
                f'best attractions things to do in {destination} 2024',
                f'top tourist sites {destination}',
                f'must see places {destination}'
            ],
            'restaurants': [
                f'best restaurants local food in {destination} 2024',
                f'authentic cuisine dining {destination}',
                f'top rated restaurants {destination}'
            ],
            'hotels': [
                f'best hotels accommodations {destination} 2024',
                f'where to stay {destination} recommendations',
                f'top rated hotels {destination}'
            ],
            'transportation': [
                f'how to get around {destination} transportation',
                f'best way to travel in {destination}',
                f'local transport {destination} guide'
            ],
            'best_time': [
                f'best time to visit {destination} weather',
                f'{destination} weather seasons when to go',
                f'ideal season to travel {destination}'
            ]
        }
        
        queries = info_queries.get(info_type, info_queries['attractions'])
        
        try:
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
        
        except Exception as e:
            print(f"Search error: {e}")
            return []
    
    def compile_trip_plan_data(self, destination: str, days: int, category: str) -> Dict[str, Any]:
        """
        Compile comprehensive trip data from multiple Perplexity searches
        """
        if not self.client:
            return {'error': 'Client not available'}
        
        # Multi-query search to get comprehensive trip information
        queries = [
            f'{destination} {days} day itinerary things to do attractions',
            f'best restaurants local food {destination}',
            f'where to stay hotels accommodation {destination}',
            f'how to get around transportation {destination}',
            f'best time to visit weather {destination}',
            f'budget cost expenses {destination} travel 2024',
            f'safety travel tips {destination} customs',
            f'hidden gems local recommendations {destination}'
        ]
        
        try:
            search = self.client.search.create(
                query=queries,
                max_results=3,  # Get top 3 results for each query
                max_tokens_per_page=1024
            )
            
            trip_plan = {
                'destination': destination,
                'days': days,
                'category': category,
                'itinerary': [],
                'research': [],
                'generated_at': 'now'
            }
            
            # Organize results by topic
            result_groups = {
                'attractions': [],
                'restaurants': [],
                'accommodation': [],
                'transportation': [],
                'timing': [],
                'budget': [],
                'safety': [],
                'hidden_gems': []
            }
            
            for i, result in enumerate(search.results):
                # Categorize based on query
                if i < 3:  # Itinerary/attractions
                    result_groups['attractions'].append(result)
                elif i < 6:  # Restaurants
                    result_groups['restaurants'].append(result)
                elif i < 9:  # Hotels
                    result_groups['accommodation'].append(result)
                elif i < 12:  # Transportation
                    result_groups['transportation'].append(result)
                elif i < 15:  # Timing
                    result_groups['timing'].append(result)
                elif i < 18:  # Budget
                    result_groups['budget'].append(result)
                elif i < 21:  # Safety
                    result_groups['safety'].append(result)
                else:  # Hidden gems
                    result_groups['hidden_gems'].append(result)
                
                trip_plan['research'].append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', ''),
                    'date': getattr(result, 'date', '')
                })
            
            # Generate day-by-day itinerary structure
            for day in range(1, days + 1):
                trip_plan['itinerary'].append({
                    'day': day,
                    'title': f'Day {day}',
                    'morning': 'Activities TBD',
                    'afternoon': 'Activities TBD',
                    'evening': 'Dinner and exploration',
                    'recommendations': []
                })
            
            return trip_plan
        
        except Exception as e:
            print(f"Error compiling trip plan: {e}")
            return {'error': str(e)}


def get_trending_destinations(category: str, limit: int = 6) -> Dict[str, Any]:
    """
    Get trending destinations for a category
    
    Usage:
        results = get_trending_destinations('friends', limit=6)
    """
    try:
        search_api = PerplexitySearchAPI()
        destinations = search_api.search_destinations_by_category(category, limit)
        
        return {
            'success': True,
            'category': category,
            'count': len(destinations),
            'destinations': destinations,
            'source': 'perplexity_search_api'
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'success': False,
            'error': str(e),
            'category': category,
            'destinations': []
        }


# Example usage
if __name__ == "__main__":
    try:
        print("=== Perplexity Search API Examples ===\n")
        
        search_api = PerplexitySearchAPI()
        
        # Example 1: Search destinations by category
        print("1. Searching for Friends Trip Destinations")
        print("-" * 50)
        destinations = search_api.search_destinations_by_category('friends', max_results=6)
        for dest in destinations:
            print(f"\nTitle: {dest['title']}")
            print(f"URL: {dest['url']}")
            print(f"Snippet: {dest['snippet'][:80]}...")
        
        # Example 2: Search destination info
        print("\n\n2. Searching for Bali Attractions")
        print("-" * 50)
        attractions = search_api.search_destination_info('Bali', 'attractions')
        for attraction in attractions[:3]:
            print(f"\n{attraction['title']}")
            print(f"URL: {attraction['url']}")
        
        # Example 3: Compile trip plan
        print("\n\n3. Compiling Trip Plan for Bali")
        print("-" * 50)
        trip_plan = search_api.compile_trip_plan_data('Bali', 7, 'friends')
        print(f"Destination: {trip_plan['destination']}")
        print(f"Days: {trip_plan['days']}")
        print(f"Category: {trip_plan['category']}")
        print(f"Research items found: {len(trip_plan['research'])}")
        print(f"Itinerary days: {len(trip_plan['itinerary'])}")
        
        # Example 4: Get trending destinations
        print("\n\n4. Getting Trending Destinations for Solo Travel")
        print("-" * 50)
        results = get_trending_destinations('solo', 6)
        print(f"Success: {results['success']}")
        print(f"Count: {results['count']}")
        for dest in results['destinations'][:3]:
            print(f"  - {dest['title']}")
    
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure to install: pip install perplexityai")
        print("And set PERPLEXITY_API_KEY environment variable")
