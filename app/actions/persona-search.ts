'use server';

import { z } from 'zod';
import { PersonaAwareRouter } from '@/lib/personas/persona-router';
import { db } from '@/lib/db';
import { messages, conversations, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const PersonaSearchSchema = z.object({
  query: z.string().min(1).max(500),
  conversationId: z.string().uuid().optional(),
  useMemory: z.boolean().default(true),
  generateSummary: z.boolean().default(true),
  enablePersonaDetection: z.boolean().default(true)
});

export type PersonaSearchResponse = {
  success: boolean;
  results: any[];
  summary?: string;
  intent?: any;
  personaDetection?: {
    persona: any;
    confidence: number;
    signals: string[];
    journeyStage?: string;
    emotionalNeeds: string[];
  };
  conversationId?: string;
  messageId?: string;
  error?: string;
  suggestions?: string[];
};

export async function personaSearchAction(formData: FormData): Promise<PersonaSearchResponse> {
  try {
    const input = PersonaSearchSchema.parse({
      query: formData.get('query'),
      conversationId: formData.get('conversationId') || undefined,
      useMemory: formData.get('useMemory') !== 'false',
      generateSummary: formData.get('generateSummary') !== 'false',
      enablePersonaDetection: formData.get('enablePersonaDetection') !== 'false'
    });

    let conversationId = input.conversationId;
    if (!conversationId) {
      const [conversation] = await db().insert(conversations).values({
        userId: 'anonymous',
        title: input.query.slice(0, 100),
        metadata: { 
          tags: ['enhanced', 'persona-aware'],
          intent: 'persona_search'
        }
      }).returning();
      conversationId = conversation.id;
    }

    let memoryContext: any[] = [];
    if (input.useMemory && conversationId) {
      const recentMessages = await db().query.messages.findMany({
        where: eq(messages.conversationId, conversationId),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
        limit: 10
      });
      memoryContext = recentMessages.reverse();
    }

    const searchStart = Date.now();
    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'persona_search',
      resourceType: 'persona_aware_router',
      resourceId: conversationId,
      metadata: {
        searchQuery: input.query,
        duration: 0,
        resultCount: 0
      }
    });

    const [userMessage] = await db().insert(messages).values({
      conversationId,
      role: 'user',
      content: input.query,
      metadata: { 
        entities: ['persona-aware'],
        intent: 'persona_search'
      }
    }).returning();

    // Use PersonaAwareRouter instead of basic AgenticRouter
    const router = new PersonaAwareRouter({
      memoryContext,
      resultLimit: 10,
      includeRelated: true,
      enablePersonaDetection: input.enablePersonaDetection
    });

    const routerResponse = await router.route(input.query, conversationId);

    // Generate suggestions based on persona and intent
    const suggestions = generatePersonaAwareSuggestions(
      routerResponse.intent,
      routerResponse.personaDetection
    );

    // Save assistant message with persona context
    const assistantContent = routerResponse.summary || 
      `Found ${routerResponse.results.length} results using ${routerResponse.intent.searchStrategy} search strategy.`;

    const [assistantMessage] = await db().insert(messages).values({
      conversationId,
      role: 'assistant',
      content: assistantContent,
      metadata: {
        intent: routerResponse.intent.type,
        entities: routerResponse.intent.entities,
        searchResults: routerResponse.results.slice(0, 3),
        confidence: routerResponse.intent.confidence
      }
    }).returning();

    await db().update(conversations)
      .set({ 
        updatedAt: new Date(),
        metadata: {
          intent: routerResponse.intent.type,
          tags: ['persona-aware'],
          satisfaction: routerResponse.intent.confidence
        }
      })
      .where(eq(conversations.id, conversationId));

    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'persona_search_complete',
      resourceType: 'persona_aware_router',
      resourceId: conversationId,
      metadata: {
        duration: Date.now() - searchStart,
        resultCount: routerResponse.results.length,
        searchQuery: input.query
      },
      success: true
    });

    return {
      success: true,
      results: routerResponse.results,
      summary: routerResponse.summary,
      intent: routerResponse.intent,
      personaDetection: routerResponse.personaDetection ? {
        persona: routerResponse.personaDetection.persona,
        confidence: routerResponse.personaDetection.confidence,
        signals: routerResponse.personaDetection.signals,
        journeyStage: routerResponse.personaDetection.journeyStage,
        emotionalNeeds: routerResponse.personaDetection.emotionalNeeds
      } : undefined,
      conversationId,
      messageId: assistantMessage.id,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };

  } catch (error) {
    console.error('Persona search error:', error);
    
    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'persona_search_error',
      resourceType: 'persona_aware_router',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        searchQuery: formData.get('query') as string
      },
      success: false
    });

    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Persona search failed'
    };
  }
}

function generatePersonaAwareSuggestions(intent: any, personaDetection?: any): string[] {
  const suggestions: string[] = [];
  
  // Base suggestions from intent
  if (intent.suggestedQueries && intent.suggestedQueries.length > 0) {
    suggestions.push(...intent.suggestedQueries);
  }

  // Add persona-specific suggestions
  if (personaDetection && personaDetection.confidence > 50) {
    const persona = personaDetection.persona;
    
    // Visa-specific suggestions
    if (persona?.visaType === '485') {
      suggestions.push(
        "What are the best career paths for 485 visa holders?",
        "How much time do I have on my 485 to build experience?"
      );
    } else if (persona?.visaType === '500') {
      suggestions.push(
        "How can I gain experience while on a student visa?",
        "What work limitations should I know about?"
      );
    }
    
    // Regional-specific suggestions
    if (persona?.isRegional) {
      suggestions.push(
        "What advantages do regional students have?",
        "Are there special pathways for regional areas?"
      );
    }
    
    // Background-specific suggestions
    if (persona?.previousField && persona.previousField !== 'IT') {
      suggestions.push(
        `How do I transition from ${persona.previousField} to tech?`,
        "What transferable skills do I have?"
      );
    }
    
    // Journey stage suggestions
    if (personaDetection.journeyStage === 'awareness') {
      suggestions.push(
        "What are my learning options?",
        "How long does it take to change careers?"
      );
    } else if (personaDetection.journeyStage === 'decision') {
      suggestions.push(
        "How do I choose the right program?",
        "What should I consider before enrolling?"
      );
    }
    
    // Emotional support suggestions
    if (personaDetection.emotionalNeeds.includes('reassurance')) {
      suggestions.push(
        "Can you share some success stories?",
        "What if I'm worried about making the wrong choice?"
      );
    }
  }

  // Remove duplicates and limit to 5
  return [...new Set(suggestions)].slice(0, 5);
}

// Test function for persona detection
export async function testPersonaDetection(query: string) {
  try {
    const router = new PersonaAwareRouter({ enablePersonaDetection: true });
    const detection = await router.testPersonaDetection(query);
    
    return {
      success: true,
      detection
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Test failed'
    };
  }
}