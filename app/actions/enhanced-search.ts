'use server';

import { z } from 'zod';
import { AgenticRouter } from '@/lib/ai/router';
import { generateResponse } from '@/lib/ai/groq';
import { db } from '@/lib/db';
import { messages, conversations, auditLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const EnhancedSearchSchema = z.object({
  query: z.string().min(1).max(500),
  conversationId: z.string().uuid().optional(),
  useMemory: z.boolean().default(true),
  generateSummary: z.boolean().default(true)
});

export type EnhancedSearchResponse = {
  success: boolean;
  results: any[];
  summary?: string;
  intent?: any;
  conversationId?: string;
  messageId?: string;
  error?: string;
  suggestions?: string[];
};

export async function enhancedSearchAction(formData: FormData): Promise<EnhancedSearchResponse> {
  try {
    const input = EnhancedSearchSchema.parse({
      query: formData.get('query'),
      conversationId: formData.get('conversationId') || undefined,
      useMemory: formData.get('useMemory') !== 'false',
      generateSummary: formData.get('generateSummary') !== 'false'
    });

    let conversationId = input.conversationId;
    if (!conversationId) {
      const [conversation] = await db().insert(conversations).values({
        userId: 'anonymous',
        title: input.query.slice(0, 100),
        metadata: { tags: ['enhanced'] }
      }).returning();
      conversationId = conversation.id;
    }

    let memoryContext: any[] = [];
    if (input.useMemory && conversationId) {
      const recentMessages = await db().query.messages.findMany({
        where: eq(messages.conversationId, conversationId!),
        orderBy: (messages: any, { desc }: any) => [desc(messages.createdAt)],
        limit: 10
      });
      memoryContext = recentMessages.reverse();
    }

    const searchStart = Date.now();
    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'enhanced_search',
      resourceType: 'agentic_router',
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
      metadata: { entities: ['enhanced'] }
    }).returning();

    const router = new AgenticRouter({
      memoryContext,
      resultLimit: 10,
      includeRelated: true
    });

    const routerResponse = await router.route(input.query, conversationId);

    let summary = '';
    if (input.generateSummary && routerResponse.results.length > 0) {
      summary = await generateResponse(
        input.query,
        routerResponse.results,
        routerResponse.intent
      );
    }

    const suggestions = routerResponse.intent.suggestedQueries || [];
    if (routerResponse.intent.clarificationNeeded && suggestions.length === 0) {
      suggestions.push(
        `What are the prerequisites for ${routerResponse.intent.entities[0] || 'this topic'}?`,
        `Show me a learning path for ${routerResponse.intent.entities[0] || 'this topic'}`,
        `What comes after learning ${routerResponse.intent.entities[0] || 'this topic'}?`
      );
    }

    const [assistantMessage] = await db().insert(messages).values({
      conversationId,
      role: 'assistant',
      content: summary || `Found ${routerResponse.results.length} results using ${routerResponse.intent.searchStrategy} search strategy.`,
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
          tags: ['enhanced'],
          satisfaction: routerResponse.intent.confidence
        }
      })
      .where(eq(conversations.id, conversationId!));

    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'enhanced_search_complete',
      resourceType: 'agentic_router',
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
      summary,
      intent: routerResponse.intent,
      conversationId,
      messageId: assistantMessage.id,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };

  } catch (error) {
    console.error('Enhanced search error:', error);
    
    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'enhanced_search_error',
      resourceType: 'agentic_router',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        searchQuery: formData.get('query') as string
      },
      success: false
    });

    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Enhanced search failed'
    };
  }
}

export async function getConversationWithIntents(conversationId: string) {
  try {
    const conversation = await db().query.conversations.findFirst({
      where: eq(conversations.id, conversationId!)
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    const messageHistory = await db().query.messages.findMany({
      where: eq(messages.conversationId, conversationId!),
      orderBy: (messages: any, { asc }: any) => [asc(messages.createdAt)]
    });

    const intentFlow = messageHistory
      .filter((m: any) => m.metadata?.intent)
      .map((m: any) => ({
        intent: m.metadata!.intent!,
        confidence: m.metadata!.confidence || 0.5,
        timestamp: m.createdAt
      }));

    return {
      success: true,
      conversation,
      messages: messageHistory,
      intentFlow
    };
  } catch (error) {
    console.error('Error getting conversation with intents:', error);
    return { success: false, error: 'Failed to load conversation' };
  }
}