"""
Perplexity-based Trip Planner Module
Uses Perplexity AI for intelligent trip planning with real-time search capabilities
"""

import os
import json
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from perplexity import Perplexity
    PERPLEXITY_AVAILABLE = True
except ImportError:
    PERPLEXITY_AVAILABLE = False
    print("Warning: Perplexity SDK not installed. Install with: pip install perplexity-py")


class PerplexityTripPlanner:
    """Trip planning using Perplexity AI"""
    
    def __init__(self):
        self.api_key = os.getenv('PERPLEXITY_API_KEY')
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY environment variable not set")
        
        if PERPLEXITY_AVAILABLE:
            self.client = Perplexity(api_key=self.api_key)
        else:
            self.client = None
    
    def search_destination_info(self, query: str) -> Dict[str, Any]:
        """
        Search for destination information using Perplexity search API
        
        Args:
            query: Search query for destination
            
        Returns:
            Dictionary with search results
        """
        if not self.client:
            return self._fallback_search(query)
        
        try:
            # Create search query
            search = self.client.search.create(
                query=[
                    f"Best things to do in {query}",
                    f"Travel guide to {query}",
                    f"{query} local cuisine and restaurants",
                    f"Best time to visit {query}",
                    f"{query} transportation and getting around"
                ]
            )
            
            # Process results
            results = {
                'success': True,
                'destination': query,
                'search_results': []
            }
            
            for result in search.results:
                results['search_results'].append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', '')
                })
            
            return results
        
        except Exception as e:
            print(f"Perplexity search error: {e}")
            return self._fallback_search(query)
    
    def plan_trip_detailed(
        self, 
        destination: str, 
        duration: int, 
        category: str,
        interests: Optional[List[str]] = None,
        budget: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a detailed trip plan using Perplexity
        
        Args:
            destination: Trip destination
            duration: Number of days
            category: Trip category (Friends, Solo, Peace, Temples, etc.)
            interests: List of interests (optional)
            budget: Budget level (optional)
            
        Returns:
            Detailed trip plan
        """
        if not self.client:
            return self._fallback_plan(destination, duration, category)
        
        try:
            # Prepare search queries for comprehensive trip planning
            queries = [
                f"Complete {duration}-day itinerary for {category.lower()} trip to {destination}",
                f"Best attractions and activities in {destination}",
                f"Local transportation options in {destination}",
                f"Best restaurants and food experiences in {destination}",
                f"Safety and travel tips for {destination}",
                f"Budget breakdown for {destination} trip",
                f"Best neighborhoods to stay in {destination}",
                f"Hidden gems and local recommendations in {destination}"
            ]
            
            # Perform search
            search = self.client.search.create(query=queries)
            
            # Aggregate search results
            plan_data = {
                'success': True,
                'destination': destination,
                'duration': duration,
                'category': category,
                'interests': interests or [],
                'budget': budget or 'medium',
                'itinerary': self._generate_itinerary(duration, category),
                'research': []
            }
            
            # Add research findings
            for result in search.results:
                plan_data['research'].append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', '')
                })
            
            return plan_data
        
        except Exception as e:
            print(f"Trip planning error: {e}")
            return self._fallback_plan(destination, duration, category)
    
    def get_real_time_travel_info(self, query: str) -> Dict[str, Any]:
        """
        Get real-time travel information using Perplexity
        
        Args:
            query: Travel info query
            
        Returns:
            Real-time travel information
        """
        if not self.client:
            return {'error': 'Perplexity client not available'}
        
        try:
            search = self.client.search.create(query=[query])
            
            results = {
                'success': True,
                'query': query,
                'results': []
            }
            
            for result in search.results:
                results['results'].append({
                    'title': result.title,
                    'url': result.url,
                    'snippet': getattr(result, 'snippet', ''),
                    'source': getattr(result, 'source', '')
                })
            
            return results
        
        except Exception as e:
            print(f"Real-time travel info error: {e}")
            return {'error': str(e), 'success': False}
    
    @staticmethod
    def _generate_itinerary(duration: int, category: str) -> List[Dict[str, Any]]:
        """Generate basic itinerary structure"""
        itinerary = []
        
        activity_types = {
            'friends': ['adventure', 'nightlife', 'party', 'adventure sports'],
            'solo': ['exploration', 'cultural sites', 'cafes', 'local markets'],
            'peace': ['meditation', 'nature', 'relaxation', 'spa'],
            'temples': ['religious sites', 'cultural landmarks', 'historical tours'],
            'adventure': ['trekking', 'water sports', 'extreme activities'],
            'family': ['parks', 'museums', 'beaches', 'family-friendly']
        }
        
        activities = activity_types.get(category.lower(), ['exploration', 'sightseeing'])
        
        for day in range(1, duration + 1):
            itinerary.append({
                'day': day,
                'title': f"Day {day}",
                'activities': activities[(day - 1) % len(activities)],
                'morning': 'Breakfast and exploration',
                'afternoon': 'Main activities',
                'evening': 'Dinner and relaxation',
                'recommended_places': [],
                'estimated_cost': '₹1,500-2,500'
            })
        
        return itinerary
    
    @staticmethod
    def _fallback_search(query: str) -> Dict[str, Any]:
        """Fallback search when Perplexity is unavailable"""
        return {
            'success': False,
            'destination': query,
            'message': 'Perplexity SDK not available',
            'search_results': []
        }
    
    @staticmethod
    def _fallback_plan(destination: str, duration: int, category: str) -> Dict[str, Any]:
        """Fallback plan generation when Perplexity is unavailable"""
        return {
            'success': False,
            'destination': destination,
            'duration': duration,
            'category': category,
            'message': 'Perplexity client not available',
            'itinerary': []
        }


def get_trip_recommendations(
    category: str,
    limit: int = 10,
    include_details: bool = True
) -> Dict[str, Any]:
    """
    Get trip recommendations by category
    
    Args:
        category: Trip category (Friends, Solo, Peace, Temples, etc.)
        limit: Number of recommendations
        include_details: Whether to include detailed info
        
    Returns:
        List of recommended trips
    """
    
    category_queries = {
        'friends': "Best group trip destinations for friends adventure and fun",
        'solo': "Best solo travel destinations for backpackers",
        'peace': "Most peaceful and relaxing travel destinations for meditation",
        'temples': "Most important temples and religious pilgrimage sites worldwide",
        'adventure': "Best adventure travel destinations for extreme sports",
        'family': "Best family-friendly travel destinations with kids",
        'luxury': "Best luxury travel destinations for premium experiences",
        'budget': "Best budget travel destinations for backpackers"
    }
    
    query = category_queries.get(category.lower(), f"{category} travel destinations")
    
    try:
        planner = PerplexityTripPlanner()
        info = planner.get_real_time_travel_info(query)
        
        return {
            'success': True,
            'category': category,
            'recommendations': info.get('results', [])[:limit]
        }
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        return {
            'success': False,
            'category': category,
            'error': str(e),
            'recommendations': []
        }


# Example usage
if __name__ == "__main__":
    try:
        planner = PerplexityTripPlanner()
        
        # Search for destination
        print("=== Searching for destination info ===")
        search_results = planner.search_destination_info("Bali Indonesia")
        print(json.dumps(search_results, indent=2))
        
        # Plan a trip
        print("\n=== Planning a trip ===")
        trip_plan = planner.plan_trip_detailed(
            destination="Bali",
            duration=7,
            category="Friends",
            interests=["beach", "nightlife", "adventure"],
            budget="medium"
        )
        print(json.dumps(trip_plan, indent=2))
        
        # Get travel recommendations
        print("\n=== Getting recommendations ===")
        recommendations = get_trip_recommendations("peace", limit=5)
        print(json.dumps(recommendations, indent=2))
        
    except Exception as e:
        print(f"Error: {e}")
