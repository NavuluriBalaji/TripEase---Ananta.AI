import { NextRequest, NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || "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";
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';

/**
 * Get trip recommendations by category using Perplexity
 * Fetches real destinations and travel tips
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'friends';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!PERPLEXITY_API_KEY) {
      return NextResponse.json(
        { error: 'Perplexity API key not configured' },
        { status: 500 }
      );
    }

    const categoryPrompts: Record<string, string> = {
      'friends': 'List 10 best destinations for group trips with friends. Include: destination name, why it\'s good for groups, top 3 activities, average budget per person for 5 days, best time to visit. Format as JSON array.',
      'solo': 'List 10 best destinations for solo travelers and backpackers. Include: destination name, why it\'s good for solo travel, safety rating, top activities, average budget for 5 days, best time to visit. Format as JSON array.',
      'peace': 'List 10 most peaceful and relaxing destinations for meditation and retreat. Include: destination name, why it\'s peaceful, meditation/yoga facilities, top relaxation activities, budget, best season. Format as JSON array.',
      'temples': 'List 10 most important temple and pilgrimage destinations worldwide. Include: destination name, main temples/sites, spiritual significance, best time to visit, budget for 5 days, dress code. Format as JSON array.',
      'adventure': 'List 10 best adventure destinations for extreme sports and activities. Include: destination name, top adventure activities, difficulty level, best season, safety info, budget. Format as JSON array.',
      'family': 'List 10 best family-friendly destinations with kids. Include: destination name, kid-friendly attractions, average cost for family of 4, best season, safety rating, accommodation suggestions. Format as JSON array.',
      'luxury': 'List 10 best luxury travel destinations for premium experiences. Include: destination name, luxury hotels, fine dining options, exclusive experiences, estimated budget, best season. Format as JSON array.',
      'budget': 'List 10 most affordable destinations for budget travelers. Include: destination name, average daily cost, cheapest accommodations, street food, free attractions, how long your money lasts. Format as JSON array.'
    };

    const prompt = categoryPrompts[category] || categoryPrompts['friends'];

    const response = await fetch(PERPLEXITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'pplx-sonar', // Web search model
        messages: [
          {
            role: 'system',
            content: 'You are a travel recommendations expert providing real, current information about destinations. Always include specific, factual details about travel costs, timing, and activities.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Perplexity API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const recommendations = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          success: true,
          category,
          recommendations: recommendations.slice(0, limit),
          rawResponse: content
        });
      }
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
    }

    // Return raw content if JSON parsing fails
    return NextResponse.json({
      success: true,
      category,
      recommendations: [],
      rawResponse: content
    });

  } catch (error) {
    console.error('Error getting recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
