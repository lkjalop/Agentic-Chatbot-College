import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PersonalizedSearchService } from '@/lib/search/personalized-search';
import { searchVectors } from '@/lib/vector';
import { analyzeIntent } from '@/lib/ai/groq';
import { routeToAgent } from '@/lib/ai/router';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    const body = await request.json();
    
    const { query, agent, filters, limit = 10 } = body;
    
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

    // Analyze intent and route to appropriate agent
    const intent = await analyzeIntent(query);
    const selectedAgent = agent || await routeToAgent(query, intent);
    
    // Perform vector search
    const searchResults = await searchVectors({
      query,
      limit: limit * 2,
      filter: {
        agent: selectedAgent,
        ...filters
      }
    });

    // Apply personalization if user is authenticated
    let finalResults = searchResults;
    if (user) {
      const searchService = new PersonalizedSearchService();
      finalResults = await searchService.searchWithPersonalization(
        query,
        user,
        filters,
        limit
      );
    }

    // Generate response based on search results and selected agent
    const response = await generateAgentResponse(query, selectedAgent, finalResults, user);
    
    return Response.json({
      response,
      agent: selectedAgent,
      intent,
      results: finalResults.results || searchResults.results,
      personalizationApplied: !!user,
      userContext: user ? {
        studentType: user.studentType,
        courseInterest: user.courseInterest
      } : null
    });
  } catch (error) {
    console.error('Error in personalized search:', error);
    return Response.json({ 
      response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function generateAgentResponse(
  query: string, 
  agent: string, 
  searchResults: any, 
  user: any
): Promise<string> {
  const context = searchResults.results?.slice(0, 3).map((r: any) => r.content).join('\n') || '';
  
  const agentPrompts = {
    knowledge: `You are a Knowledge Agent specializing in career advice and industry insights. Based on this query: "${query}" and relevant information: "${context}", provide helpful career guidance.`,
    schedule: `You are a Scheduling Agent helping with interview preparation and timeline management. For the query: "${query}", provide scheduling and time management advice.`,
    cultural: `You are a Cultural Intelligence Agent helping international students. For the query: "${query}" with context: "${context}", provide culturally-aware career guidance.`,
    voice: `You are a Voice Interaction Agent focused on communication skills. For the query: "${query}", provide advice on verbal communication and presentation skills.`
  };

  const prompt = agentPrompts[agent as keyof typeof agentPrompts] || agentPrompts.knowledge;
  
  // Add user context if available
  const userContext = user ? `User is a ${user.studentType} student interested in ${user.courseInterest}.` : '';
  
  try {
    // Use the existing Groq service to generate response
    const { generateResponse } = await import('@/lib/ai/groq');
    const response = await generateResponse(`${prompt} ${userContext}`, query);
    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    return getFallbackResponse(query, agent);
  }
}

function getFallbackResponse(query: string, agent: string): string {
  const fallbacks = {
    knowledge: "Based on current market trends, I recommend focusing on developing skills that align with your career goals. Would you like me to help you create a personalized learning plan?",
    schedule: "I can help you create a structured approach to your career preparation. Let's start by identifying your key milestones and deadlines.",
    cultural: "I understand the unique challenges you face as an international student. Let me provide some culturally-aware guidance for your career development.",
    voice: "Communication skills are crucial for career success. I'd be happy to help you practice and improve your verbal presentation abilities."
  };
  
  return fallbacks[agent as keyof typeof fallbacks] || fallbacks.knowledge;
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