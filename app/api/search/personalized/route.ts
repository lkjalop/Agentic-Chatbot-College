import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PersonalizedSearchService } from '@/lib/search/personalized-search';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    
    const { query, filters, limit = 10 } = body;
    
    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }
    
    let user = null;
    
    // Get user data if authenticated
    if (session?.user?.id) {
      const [userData] = await db.select()
        .from(users)
        .where(eq(users.id, session.user.id));
      user = userData;
    }
    
    const searchService = new PersonalizedSearchService();
    const results = await searchService.searchWithPersonalization(
      query,
      user,
      filters,
      limit
    );
    
    return Response.json(results);
  } catch (error) {
    console.error('Error in personalized search:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { queryId, interactionType, feedbackText } = body;
    
    if (!queryId || !interactionType) {
      return Response.json({ error: 'Query ID and interaction type are required' }, { status: 400 });
    }
    
    // Get user data
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, session.user.id));
    
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    
    const searchService = new PersonalizedSearchService();
    await searchService.trackQueryInteraction(
      user,
      queryId,
      interactionType,
      feedbackText
    );
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error tracking query interaction:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}