"""
Flask API endpoints for Perplexity-based trip planning
"""

from flask import Blueprint, request, jsonify
from perplexity_trip_planner import PerplexityTripPlanner, get_trip_recommendations
import logging

# Create blueprint
perplexity_bp = Blueprint('perplexity', __name__, url_prefix='/api/perplexity')

logger = logging.getLogger(__name__)


@perplexity_bp.route('/search-destination', methods=['POST'])
def search_destination():
    """
    Search for destination information
    
    Request body:
    {
        "destination": "Bali"
    }
    """
    try:
        data = request.json
        destination = data.get('destination')
        
        if not destination:
            return jsonify({'error': 'Destination is required'}), 400
        
        planner = PerplexityTripPlanner()
        results = planner.search_destination_info(destination)
        
        return jsonify(results), 200
    
    except Exception as e:
        logger.error(f"Search destination error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500


@perplexity_bp.route('/plan-trip', methods=['POST'])
def plan_trip():
    """
    Create a detailed trip plan
    
    Request body:
    {
        "destination": "Bali",
        "duration": 7,
        "category": "Friends",
        "interests": ["beach", "adventure"],
        "budget": "medium"
    }
    """
    try:
        data = request.json
        destination = data.get('destination')
        duration = data.get('duration', 5)
        category = data.get('category', 'adventure')
        interests = data.get('interests', [])
        budget = data.get('budget', 'medium')
        
        if not destination:
            return jsonify({'error': 'Destination is required'}), 400
        
        planner = PerplexityTripPlanner()
        trip_plan = planner.plan_trip_detailed(
            destination=destination,
            duration=duration,
            category=category,
            interests=interests,
            budget=budget
        )
        
        return jsonify(trip_plan), 200
    
    except Exception as e:
        logger.error(f"Plan trip error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500


@perplexity_bp.route('/travel-info', methods=['POST'])
def get_travel_info():
    """
    Get real-time travel information
    
    Request body:
    {
        "query": "Best restaurants in Bali"
    }
    """
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        planner = PerplexityTripPlanner()
        info = planner.get_real_time_travel_info(query)
        
        return jsonify(info), 200
    
    except Exception as e:
        logger.error(f"Travel info error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500


@perplexity_bp.route('/recommendations/<category>', methods=['GET'])
def get_recommendations(category):
    """
    Get trip recommendations by category
    
    Query parameters:
    - limit: Number of recommendations (default: 10)
    - include_details: Include detailed info (default: true)
    """
    try:
        limit = request.args.get('limit', 10, type=int)
        include_details = request.args.get('include_details', 'true').lower() == 'true'
        
        recommendations = get_trip_recommendations(
            category=category,
            limit=limit,
            include_details=include_details
        )
        
        return jsonify(recommendations), 200
    
    except Exception as e:
        logger.error(f"Get recommendations error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500


@perplexity_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get available trip categories"""
    categories = [
        {
            'id': 'friends',
            'name': 'Friends Trip',
            'icon': '👥',
            'description': 'Group adventures and fun experiences',
            'query': 'Best group trip destinations for friends adventure and fun'
        },
        {
            'id': 'solo',
            'name': 'Solo Travel',
            'icon': '🧳',
            'description': 'Solo backpacking and exploration',
            'query': 'Best solo travel destinations for backpackers'
        },
        {
            'id': 'peace',
            'name': 'Peace & Relaxation',
            'icon': '🧘',
            'description': 'Peaceful and relaxing destinations',
            'query': 'Most peaceful and relaxing travel destinations for meditation'
        },
        {
            'id': 'temples',
            'name': 'Temples & Pilgrimage',
            'icon': '🛕',
            'description': 'Religious and spiritual destinations',
            'query': 'Most important temples and religious pilgrimage sites worldwide'
        },
        {
            'id': 'adventure',
            'name': 'Adventure',
            'icon': '🏔️',
            'description': 'Extreme sports and adventure activities',
            'query': 'Best adventure travel destinations for extreme sports'
        },
        {
            'id': 'family',
            'name': 'Family Trip',
            'icon': '👨‍👩‍👧‍👦',
            'description': 'Family-friendly destinations with kids',
            'query': 'Best family-friendly travel destinations with kids'
        },
        {
            'id': 'luxury',
            'name': 'Luxury',
            'icon': '✨',
            'description': 'Premium luxury travel experiences',
            'query': 'Best luxury travel destinations for premium experiences'
        },
        {
            'id': 'budget',
            'name': 'Budget Travel',
            'icon': '💰',
            'description': 'Budget-friendly backpacker destinations',
            'query': 'Best budget travel destinations for backpackers'
        }
    ]
    
    return jsonify({
        'success': True,
        'categories': categories
    }), 200


if __name__ == '__main__':
    # For testing
    pass
