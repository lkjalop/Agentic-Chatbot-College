import { NextRequest } from 'next/server';
import { searchVectors, getVectorStats } from '@/lib/vector';

export async function GET(request: NextRequest) {
  try {
    // Get vector database stats
    const stats = await getVectorStats();
    
    // Test search with a simple query
    const testSearch = await searchVectors({
      query: "Rohan Patel business analyst",
      limit: 5
    });
    
    return Response.json({
      stats: stats,
      testSearch: testSearch,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Vector test error:', error);
    return Response.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}