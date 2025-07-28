import { NextRequest } from 'next/server';
import { vectorIndex } from '@/lib/vector';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    // Try direct vector index query
    const results = await vectorIndex.query({
      data: query || "business analyst career switch",
      topK: 5,
      includeMetadata: true,
      includeVectors: false
    });
    
    return Response.json({
      success: true,
      query: query || "business analyst career switch",
      results: results,
      resultsCount: results.length
    });
  } catch (error) {
    console.error('Direct search error:', error);
    return Response.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}