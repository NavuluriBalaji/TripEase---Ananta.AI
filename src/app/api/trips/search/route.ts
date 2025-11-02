import { NextRequest, NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "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";

/**
 * Direct Perplexity Search API - No models required
 * Uses Perplexity's search.create functionality through REST API
 */

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'friends';

    // Get search queries for category
    const queries = getCategoryQueries(category);

    // Call Perplexity Search API
    const results = await searchPerplexity(queries);

    // Parse results into trip recommendations
    const destinations = parseDestinationResults(results, category);

    return NextResponse.json({
      success: true,
      category,
      destinations,
      results_count: destinations.length
    });

  } catch (error) {
    console.error('Error fetching from Perplexity:', error);
    return NextResponse.json(
      { error: 'Failed to search destinations', success: false, details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get category-specific search queries
 */
function getCategoryQueries(category: string): string[] {
  const categoryQueries: Record<string, string[]> = {
    'friends': [
      'best group trip destinations for friends adventure 2024',
      'fun destinations for friend groups travel',
      'top trending group travel destinations',
      'adventure destinations for groups of friends'
    ],
    'solo': [
      'best solo travel destinations for backpackers 2024',
      'solo adventure travel destinations trending',
      'safe solo travel destinations for women',
      'budget solo travel destinations worldwide'
    ],
    'peace': [
      'most peaceful relaxing travel destinations meditation 2024',
      'best peaceful vacation spots retreat centers',
      'calm serene travel destinations wellness',
      'meditation yoga retreat destinations'
    ],
    'temples': [
      'most important temples pilgrimage sites worldwide',
      'best temple destinations spiritual travel',
      'famous temples tourist destinations 2024',
      'top pilgrimage sites trending destinations'
    ],
    'adventure': [
      'best adventure travel destinations extreme sports 2024',
      'trekking hiking adventure destinations trending',
      'adventure sports locations world',
      'extreme sports travel destinations'
    ],
    'beach': [
      'best beach destinations vacation resorts 2024',
      'tropical beach travel destinations trending',
      'beach resort destinations popular',
      'island beach getaway destinations'
    ]
  };

  return categoryQueries[category] || categoryQueries['friends'];
}

/**
 * Call Perplexity Search API directly
 * This uses the REST API without specifying a model
 */
async function searchPerplexity(queries: string[]): Promise<any[]> {
  try {
    // Try using the new approach - direct search through REST
    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: queries.join(' '),
        search_focus: 'web'
      })
    }).catch(async (error1) => {
      console.log('First endpoint failed, trying chat completions with search mode...');
      
      // Fallback: Use chat/completions in search mode
      return fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'pplx-sonar', // Using sonar which supports web search
          messages: [
            {
              role: 'user',
              content: `Search and list the top travel destinations for: ${queries.join(', ')}. Return results as a JSON array with title, url, and description for each destination.`
            }
          ],
          max_tokens: 2000,
        })
      });
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Perplexity API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle different response formats
    if (data.search_results) {
      return data.search_results;
    }
    
    if (data.choices && data.choices[0]?.message?.content) {
      // Parse the content if it's chat response
      const content = data.choices[0].message.content;
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed) ? parsed : parsed.results || [];
      } catch {
        return parseSearchResultsFromText(content);
      }
    }

    return [];
  } catch (error) {
    console.error('Perplexity search error:', error);
    throw error;
  }
}

/**
 * Parse search results into destination recommendations
 */
function parseDestinationResults(results: any[], category: string): any[] {
  return results
    .slice(0, 6)
    .map((result, index) => {
      const title = result.title || result.name || 'Destination';
      
      return {
        id: `${category}-perplexity-${index}`,
        title: formatDestinationTitle(title),
        destination: extractDestinationName(title),
        url: result.url || '',
        snippet: result.snippet || result.description || '',
        rating: 4.5 + Math.random() * 0.5, // 4.5 - 5.0
        reviews: 1000 + Math.floor(Math.random() * 5000),
        duration: '5 Days',
        budget: estimateBudget(category),
        description: (result.snippet || result.description || 'Amazing travel experience').substring(0, 100),
        category,
        activities: getActivitiesForCategory(category),
        image: getCategoryImage(category, index),
        isPerplexity: true
      };
    });
}

/**
 * Parse search results from plain text response
 */
function parseSearchResultsFromText(text: string): any[] {
  const results = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.includes('http') || line.includes('destination')) {
      results.push({
        title: extractTitle(line),
        url: extractUrl(line),
        snippet: extractSnippet(line)
      });
    }
  }
  
  return results;
}

/**
 * Extract title from text
 */
function extractTitle(text: string): string {
  const match = text.match(/[:\-]\s*(.+?)(?:\s*\||$)/);
  return match ? match[1].trim() : text.trim().substring(0, 50);
}

/**
 * Extract URL from text
 */
function extractUrl(text: string): string {
  const match = text.match(/https?:\/\/[^\s)]+/);
  return match ? match[0] : '';
}

/**
 * Extract snippet from text
 */
function extractSnippet(text: string): string {
  return text.substring(0, 150);
}

/**
 * Format destination title into trip title
 */
function formatDestinationTitle(title: string): string {
  if (title.length > 50) {
    return title.substring(0, 47) + '...';
  }
  return title;
}

/**
 * Extract destination name from title
 */
function extractDestinationName(title: string): string {
  // Try to extract city/country from title
  const words = title.split(/[,\s-]/);
  return words.slice(-2).join(', ') || title;
}

/**
 * Estimate budget based on category
 */
function estimateBudget(category: string): string {
  const budgets: Record<string, string> = {
    'friends': '₹25,000 - ₹45,000',
    'solo': '₹15,000 - ₹35,000',
    'peace': '₹20,000 - ₹40,000',
    'temples': '₹20,000 - ₹40,000',
    'adventure': '₹30,000 - ₹60,000',
    'beach': '₹25,000 - ₹50,000'
  };
  return budgets[category] || '₹20,000 - ₹40,000';
}

/**
 * Get activities for category
 */
function getActivitiesForCategory(category: string): string[] {
  const activities: Record<string, string[]> = {
    'friends': ['Group Activities', 'Nightlife', 'Adventure Sports', 'Local Culture'],
    'solo': ['Self-Discovery', 'Local Markets', 'Backpacking', 'Cultural Sites'],
    'peace': ['Meditation', 'Yoga', 'Nature Walks', 'Spa & Wellness'],
    'temples': ['Temple Tours', 'Spiritual Practices', 'Photography', 'Cultural Learning'],
    'adventure': ['Trekking', 'Water Sports', 'Rock Climbing', 'Extreme Activities'],
    'beach': ['Swimming', 'Water Sports', 'Beach Activities', 'Relaxation']
  };
  return activities[category] || ['Sightseeing', 'Local Culture', 'Food Tour', 'Adventure'];
}

/**
 * Get category-specific image
 */
function getCategoryImage(category: string, index: number): string {
  const images: Record<string, string[]> = {
    'friends': [
      'https://images.unsplash.com/photo-1552832860-cfcddc32be86?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551085254-e96b210db58a?w=500&h=400&fit=crop',
    ],
    'solo': [
      'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1501126613377-2b072b97faae?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1488872657612-192a60718cb4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1512757776214-26d36777b513?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1502044695114-a21217c1a57b?w=500&h=400&fit=crop',
    ],
    'peace': [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1495612519256-cd40320b8f85?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1509017776751-fc653f88eade?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1474540412665-1cdae210236f?w=500&h=400&fit=crop',
    ],
    'temples': [
      'https://images.unsplash.com/photo-1548013146-72d440649117?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1586762200536-8e23a3a5a948?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1618654377451-92b57e5db6c0?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1569163139394-de4798aa62b0?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1433086720283-50416fe59761?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
    ],
    'adventure': [
      'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1551085254-e96b210db58a?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1541625602330-2277a4647d6d?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1511497584788-876760111969?w=500&h=400&fit=crop',
    ],
    'beach': [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1528992291531-62f47440d133?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1473590331182-a0aa67b46fe4?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=500&h=400&fit=crop',
      'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=400&fit=crop',
    ]
  };

  const categoryImages = images[category] || images['friends'];
  return categoryImages[index % categoryImages.length];
}
