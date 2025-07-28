import { searchVectors, searchWithRelationships } from '@/lib/vector';
import { analyzeIntent, enhanceQuery, Intent } from './groq';
import { db } from '@/lib/db';
import { syntheticDataMeta } from '@/lib/db/schema';
import { eq, and, arrayContains, sql } from 'drizzle-orm';

export interface RouterConfig {
  maxDepth?: number;
  resultLimit?: number;
  includeRelated?: boolean;
  memoryContext?: any[];
}

export class AgenticRouter {
  private config: Required<RouterConfig>;

  constructor(config: RouterConfig = {}) {
    this.config = {
      maxDepth: config.maxDepth ?? 3,
      resultLimit: config.resultLimit ?? 10,
      includeRelated: config.includeRelated ?? true,
      memoryContext: config.memoryContext ?? []
    };
  }

  async route(query: string, conversationId?: string) {
    const intent = await analyzeIntent(query);
    const enhancedQuery = await enhanceQuery(query, intent);
    
    let results;
    switch (intent.searchStrategy) {
      case 'relationship':
        results = await this.relationshipSearch(enhancedQuery, intent);
        break;
      case 'career':
        results = await this.careerPathSearch(enhancedQuery, intent);
        break;
      case 'hybrid':
        results = await this.hybridSearch(enhancedQuery, intent);
        break;
      default:
        results = await this.semanticSearch(enhancedQuery, intent);
    }

    const processedResults = await this.postProcessResults(results, intent);

    return {
      intent,
      query: enhancedQuery,
      results: processedResults,
      metadata: {
        strategy: intent.searchStrategy,
        confidence: intent.confidence,
        entities: intent.entities
      }
    };
  }

  private async semanticSearch(query: string, intent: Intent) {
    const { results } = await searchVectors({
      query,
      limit: this.config.resultLimit,
      filter: this.buildFilter(intent)
    });
    return results || [];
  }

  private async relationshipSearch(query: string, intent: Intent) {
    if (intent.type === 'prerequisite') {
      const targetResults = await searchVectors({
        query,
        limit: 5
      });

      if (!targetResults.results?.length) return [];

      const prerequisites = new Set<string>();
      const visited = new Set<string>();

      const queue = targetResults.results.map(r => ({
        id: r.id,
        depth: 0,
        metadata: r.metadata
      }));

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(String(current.id))) continue;
        visited.add(String(current.id));

        if (current.metadata?.prerequisites) {
          for (const prereq of current.metadata.prerequisites) {
            prerequisites.add(prereq);
            
            if (current.depth < this.config.maxDepth - 1) {
              const prereqData = await this.fetchByVectorId(prereq);
              if (prereqData) {
                queue.push({
                  id: prereq,
                  depth: current.depth + 1,
                  metadata: prereqData.metadata
                });
              }
            }
          }
        }
      }

      const prereqResults = [];
      for (const prereqId of prerequisites) {
        const data = await this.fetchByVectorId(prereqId);
        if (data) prereqResults.push(data);
      }

      return prereqResults;
    }

    const { results } = await searchWithRelationships({
      query,
      depth: this.config.maxDepth,
      limit: this.config.resultLimit
    });

    return results || [];
  }

  private async careerPathSearch(query: string, intent: Intent) {
    const careerResults = await searchVectors({
      query,
      limit: this.config.resultLimit,
      filter: {
        contentType: 'career'
      }
    });

    if (!careerResults.results?.length) {
      return this.semanticSearch(query, intent);
    }

    const skills = new Set<string>();
    careerResults.results.forEach(r => {
      if (r.metadata?.prerequisites) {
        r.metadata.prerequisites.forEach((p: string) => skills.add(p));
      }
    });

    const skillResults = [];
    for (const skill of skills) {
      const data = await this.fetchByVectorId(skill);
      if (data) skillResults.push(data);
    }

    return [...careerResults.results, ...skillResults];
  }

  private async hybridSearch(query: string, intent: Intent) {
    const [semantic, relationship] = await Promise.all([
      this.semanticSearch(query, intent),
      this.relationshipSearch(query, intent)
    ]);

    const seen = new Set<string>();
    const merged = [];

    for (const result of [...semantic, ...relationship]) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        merged.push(result);
      }
    }

    return merged.slice(0, this.config.resultLimit);
  }

  private buildFilter(intent: Intent) {
    const filter: Record<string, any> = {};

    switch (intent.type) {
      case 'tutorial':
        filter.contentType = 'tutorial';
        break;
      case 'career_path':
        filter.contentType = 'career';
        break;
      case 'recommendation':
        filter.difficulty = 'beginner';
        break;
    }

    return filter;
  }

  private async postProcessResults(results: any[], intent: Intent) {
    switch (intent.type) {
      case 'prerequisite':
        results.sort((a, b) => {
          const difficultyOrder = { beginner: 0, intermediate: 1, advanced: 2 };
          const aDiff = difficultyOrder[a.metadata?.difficulty as keyof typeof difficultyOrder] ?? 3;
          const bDiff = difficultyOrder[b.metadata?.difficulty as keyof typeof difficultyOrder] ?? 3;
          return aDiff - bDiff;
        });
        break;

      case 'next_steps':
        results.sort((a, b) => {
          const difficultyOrder = { beginner: 2, intermediate: 1, advanced: 0 };
          const aDiff = difficultyOrder[a.metadata?.difficulty as keyof typeof difficultyOrder] ?? 3;
          const bDiff = difficultyOrder[b.metadata?.difficulty as keyof typeof difficultyOrder] ?? 3;
          return aDiff - bDiff;
        });
        break;

      case 'career_path':
        results.sort((a, b) => {
          if (a.metadata?.contentType === 'career' && b.metadata?.contentType !== 'career') return -1;
          if (a.metadata?.contentType !== 'career' && b.metadata?.contentType === 'career') return 1;
          return 0;
        });
        break;
    }

    return results;
  }

  private async fetchByVectorId(vectorId: string) {
    try {
      const dbResult = await db.query.syntheticDataMeta.findFirst({
        where: eq(syntheticDataMeta.vectorId, vectorId)
      });

      if (dbResult) {
        return {
          id: vectorId,
          metadata: {
            title: dbResult.title,
            category: dbResult.category,
            contentType: dbResult.contentType,
            difficulty: dbResult.difficulty,
            prerequisites: dbResult.prerequisites,
            leadsTo: dbResult.leadsTo,
            relatedConcepts: dbResult.relatedConcepts,
            careerPaths: dbResult.careerPaths,
            tags: dbResult.tags
          },
          content: `${dbResult.title} - ${dbResult.category}`,
          score: 0.9
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching vector:', error);
      return null;
    }
  }
}

export async function routeToAgent(query: string, intent: Intent): Promise<string> {
  const lowercaseQuery = query.toLowerCase();
  
  // Schedule agent for time/interview related queries
  if (lowercaseQuery.includes('interview') || 
      lowercaseQuery.includes('schedule') || 
      lowercaseQuery.includes('appointment') ||
      lowercaseQuery.includes('timeline') ||
      lowercaseQuery.includes('when') ||
      lowercaseQuery.includes('time')) {
    return 'schedule';
  }
  
  // Cultural agent for international/cultural queries
  if (lowercaseQuery.includes('international') ||
      lowercaseQuery.includes('cultural') ||
      lowercaseQuery.includes('visa') ||
      lowercaseQuery.includes('culture') ||
      lowercaseQuery.includes('abroad') ||
      lowercaseQuery.includes('foreign')) {
    return 'cultural';
  }
  
  // Voice agent for communication/presentation queries
  if (lowercaseQuery.includes('presentation') ||
      lowercaseQuery.includes('speaking') ||
      lowercaseQuery.includes('communication') ||
      lowercaseQuery.includes('voice') ||
      lowercaseQuery.includes('verbal') ||
      lowercaseQuery.includes('interview skills')) {
    return 'voice';
  }
  
  // Default to knowledge agent for general career queries
  return 'knowledge';
}