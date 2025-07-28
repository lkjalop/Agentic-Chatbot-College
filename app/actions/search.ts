'use server';

import { z } from 'zod';
import { searchVectors, searchWithRelationships } from '@/lib/vector';
import { db } from '@/lib/db';
import { messages, conversations, auditLogs, syntheticDataMeta } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const SearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  conversationId: z.string().uuid().optional(),
  searchType: z.enum(['semantic', 'relationship', 'hybrid']).default('hybrid'),
  limit: z.number().min(1).max(50).default(10),
  filters: z.object({
    category: z.string().optional(),
    difficulty: z.string().optional(),
    contentType: z.string().optional()
  }).optional()
});

export type SearchResponse = {
  success: boolean;
  results: Array<{
    id: string;
    content: string;
    metadata: any;
    score: number;
  }>;
  conversationId?: string;
  messageId?: string;
  error?: string;
};

export async function searchAction(formData: FormData): Promise<SearchResponse> {
  try {
    const input = SearchInputSchema.parse({
      query: formData.get('query'),
      conversationId: formData.get('conversationId') || undefined,
      searchType: formData.get('searchType') || 'hybrid',
      limit: Number(formData.get('limit')) || 10,
      filters: formData.get('filters') ? JSON.parse(formData.get('filters') as string) : undefined
    });

    let conversationId = input.conversationId;
    if (!conversationId) {
      const [conversation] = await db().insert(conversations).values({
        userId: 'anonymous',
        title: input.query.slice(0, 100)
      }).returning();
      conversationId = conversation.id;
    }

    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'search',
      resourceType: 'vector_search',
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
        intent: 'basic_search',
        entities: ['search']
      }
    }).returning();

    let searchResults;
    if (input.searchType === 'relationship') {
      searchResults = await searchWithRelationships({
        query: input.query,
        depth: 2,
        limit: input.limit
      });
    } else {
      searchResults = await searchVectors({
        query: input.query,
        limit: input.limit,
        filter: input.filters
      });
    }

    if (!searchResults.results) {
      throw new Error('Search failed');
    }

    const vectorIds = searchResults.results.map(r => r.id);
    await db().update(syntheticDataMeta)
      .set({ 
        usageCount: sql`usage_count + 1`,
        lastAccessed: new Date()
      })
      .where(sql`vector_id = ANY(${vectorIds})`);

    const formattedResults = searchResults.results.map(result => ({
      id: result.id,
      content: result.metadata?.content || '',
      metadata: result.metadata || {},
      score: result.score || 0
    }));

    const [assistantMessage] = await db().insert(messages).values({
      conversationId,
      role: 'assistant',
      content: `Found ${formattedResults.length} results for "${input.query}"`,
      metadata: {
        searchResults: formattedResults,
        intent: 'basic_search'
      }
    }).returning();

    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'search_complete',
      resourceType: 'vector_search',
      resourceId: conversationId,
      metadata: {
        resultCount: formattedResults.length,
        duration: Date.now() - userMessage.createdAt.getTime()
      },
      success: true
    });

    return {
      success: true,
      results: formattedResults,
      conversationId,
      messageId: assistantMessage.id
    };

  } catch (error) {
    console.error('Search error:', error);
    
    await db().insert(auditLogs).values({
      userId: 'anonymous',
      action: 'search_error',
      resourceType: 'vector_search',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        searchQuery: formData.get('query') as string
      },
      success: false
    });

    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}

export async function getConversationHistory(conversationId: string) {
  try {
    const conversation = await db().query.conversations.findFirst({
      where: eq(conversations.id, conversationId!)
    });

    if (!conversation) {
      return { success: false, error: 'Conversation not found' };
    }

    const messageHistory = await db().query.messages.findMany({
      where: eq(messages.conversationId, conversationId!),
      orderBy: [messages.createdAt]
    });

    return {
      success: true,
      conversation,
      messages: messageHistory
    };
  } catch (error) {
    console.error('Error getting conversation history:', error);
    return { success: false, error: 'Failed to load conversation' };
  }
}

export async function getRecentConversations(userId: string = 'anonymous', limit: number = 10) {
  try {
    const recentConversations = await db().query.conversations.findMany({
      where: eq(conversations.userId, userId),
      orderBy: [desc(conversations.updatedAt)],
      limit
    });

    return {
      success: true,
      conversations: recentConversations
    };
  } catch (error) {
    console.error('Error getting recent conversations:', error);
    return { success: false, conversations: [] };
  }
}