import { Index } from '@upstash/vector';
import { z } from 'zod';

if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
  throw new Error('Upstash Vector environment variables are not defined');
}

export const vectorIndex = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
});

export const VectorMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string(),
  contentType: z.enum(['concept', 'skill', 'career', 'tutorial', 'example']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  prerequisites: z.array(z.string()).default([]),
  leadsTo: z.array(z.string()).default([]),
  relatedConcepts: z.array(z.string()).default([]),
  careerPaths: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  confidenceScore: z.number().min(0).max(1).default(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type VectorMetadata = z.infer<typeof VectorMetadataSchema>;

export async function upsertVector(data: {
  id: string;
  content: string;
  metadata: VectorMetadata;
}) {
  try {
    const result = await vectorIndex.upsert({
      id: data.id,
      data: data.content,
      metadata: data.metadata
    });
    return { success: true, result };
  } catch (error) {
    console.error('Error upserting vector:', error);
    return { success: false, error };
  }
}

export async function batchUpsertVectors(items: Array<{
  id: string;
  content: string;
  metadata: VectorMetadata;
}>) {
  try {
    const vectors = items.map(item => ({
      id: item.id,
      data: item.content,
      metadata: item.metadata
    }));
    
    const batchSize = 100;
    const results = [];
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      const result = await vectorIndex.upsert(batch);
      results.push(result);
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Error batch upserting vectors:', error);
    return { success: false, error };
  }
}

export async function searchVectors({
  query,
  limit = 10,
  filter = {},
  includeVectors = false
}: {
  query: string;
  limit?: number;
  filter?: Record<string, any>;
  includeVectors?: boolean;
}) {
  try {
    const results = await vectorIndex.query({
      data: query,
      topK: limit,
      includeMetadata: true,
      includeVectors,
      filter
    });
    
    return { success: true, results };
  } catch (error) {
    console.error('Error searching vectors:', error);
    return { success: false, error, results: [] };
  }
}

export async function deleteVector(id: string) {
  try {
    const result = await vectorIndex.delete(id);
    return { success: true, result };
  } catch (error) {
    console.error('Error deleting vector:', error);
    return { success: false, error };
  }
}

export async function getVectorStats() {
  try {
    const info = await vectorIndex.info();
    return { success: true, info };
  } catch (error) {
    console.error('Error getting vector stats:', error);
    return { success: false, error };
  }
}

export async function searchWithRelationships({
  query,
  depth = 1,
  limit = 10
}: {
  query: string;
  depth?: number;
  limit?: number;
}) {
  const visited = new Set<string>();
  const results: any[] = [];
  
  const { results: initialResults } = await searchVectors({ query, limit });
  
  if (!initialResults || initialResults.length === 0) {
    return { results: [] };
  }
  
  const queue = initialResults.map(r => ({ ...r, depth: 0 }));
  
  while (queue.length > 0 && results.length < limit * 2) {
    const current = queue.shift()!;
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    results.push(current);
    
    if (current.depth < depth && current.metadata) {
      const related = [
        ...(current.metadata.prerequisites || []),
        ...(current.metadata.leadsTo || []),
        ...(current.metadata.relatedConcepts || [])
      ];
      
      for (const relatedId of related) {
        if (!visited.has(relatedId)) {
          const relatedResult = await vectorIndex.fetch([relatedId], {
            includeMetadata: true
          });
          
          if (relatedResult?.[0]) {
            queue.push({ ...relatedResult[0], depth: current.depth + 1 });
          }
        }
      }
    }
  }
  
  return { results: results.slice(0, limit) };
}