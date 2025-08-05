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

        if (current.metadata?.prerequisites && Array.isArray(current.metadata.prerequisites)) {
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
      if (r.metadata?.prerequisites && Array.isArray(r.metadata.prerequisites)) {
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
      const dbResult = await db().query.syntheticDataMeta.findFirst({
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

/**
 * Option 7: Smart Career Track + Essential Support Agent Router
 * 4 Career Tracks + 2 Essential Support Agents = 6 Total
 * Eliminates voice agent, keeps booking (sophisticated) + cultural (visa critical)
 */

// Feature flags for rollback capability
const FEATURE_FLAGS = {
  USE_CAREER_TRACKS: process.env.FEATURE_CAREER_TRACKS !== 'false', // Default enabled
  ROLLBACK_TO_ORIGINAL: process.env.ROLLBACK_TO_ORIGINAL === 'true',
  CAREER_TRACK_ROLLOUT: parseInt(process.env.CAREER_TRACK_ROLLOUT || '100'), // 0-100%
};

// Legacy agent mapping for rollback
const LEGACY_AGENT_MAPPING = {
  'data_ai': 'knowledge',
  'cybersecurity': 'knowledge', 
  'business_analyst': 'knowledge',
  'fullstack': 'knowledge',
  'booking': 'booking',
  'cultural': 'cultural'
};

/**
 * Route to career track based on query content and intent
 */
function routeToCareerTrack(query: string, intent: Intent): string {
  const q = query.toLowerCase();
  
  // Data & AI Track - data science, analytics, ML, AI
  if (q.includes('data') || q.includes('analytics') || q.includes('python') || 
      q.includes('machine learning') || q.includes('ai') || q.includes('sql') ||
      q.includes('statistics') || q.includes('data science') || q.includes('visualization') ||
      intent.entities.some(e => ['data', 'analytics', 'python', 'ml'].includes(e.toLowerCase()))) {
    return 'data_ai';
  }
  
  // Cybersecurity Track - security, ethical hacking, compliance
  if (q.includes('security') || q.includes('cyber') || q.includes('ethical') ||
      q.includes('penetration') || q.includes('compliance') || q.includes('hacking') ||
      q.includes('firewall') || q.includes('encryption') || q.includes('audit') ||
      intent.entities.some(e => ['security', 'cyber', 'compliance'].includes(e.toLowerCase()))) {
    return 'cybersecurity';
  }
  
  // Full Stack Track - web development, frontend, backend
  if (q.includes('full stack') || q.includes('fullstack') || q.includes('web') ||
      q.includes('frontend') || q.includes('backend') || q.includes('react') ||
      q.includes('javascript') || q.includes('node') || q.includes('html') || q.includes('css') ||
      intent.entities.some(e => ['web', 'react', 'javascript', 'frontend'].includes(e.toLowerCase()))) {
    return 'fullstack';
  }
  
  // Business Analyst Track - requirements, stakeholders, process improvement
  if (q.includes('business analyst') || q.includes('requirements') || 
      q.includes('stakeholder') || q.includes('process') || q.includes('workflow') ||
      q.includes('documentation') || q.includes('analysis') || q.includes('specification') ||
      intent.entities.some(e => ['business', 'requirements', 'analysis'].includes(e.toLowerCase()))) {
    return 'business_analyst';
  }
  
  // Default to Business Analyst (most general track)
  return 'business_analyst';
}

/**
 * Legacy routing function for rollback
 */
function routeToOriginalAgents(query: string, intent: Intent): string {
  const lowercaseQuery = query.toLowerCase();
  
  // Booking agent logic (preserved)
  if (lowercaseQuery.includes('book') || 
      lowercaseQuery.includes('appointment with') ||
      lowercaseQuery.includes('meet with') ||
      lowercaseQuery.includes('advisor') ||
      lowercaseQuery.includes('consultation') ||
      lowercaseQuery.includes('schedule a meeting') ||
      lowercaseQuery.includes('opt application') ||
      lowercaseQuery.includes('opt') ||
      lowercaseQuery.includes('visa help') ||
      lowercaseQuery.includes('need help with') ||
      lowercaseQuery.includes('i need help with') ||
      lowercaseQuery.includes('help with my') ||
      lowercaseQuery.includes('application') ||
      lowercaseQuery.includes('visa application') ||
      lowercaseQuery.includes('immigration help')) {
    return 'booking';
  }
  
  // Cultural agent logic (preserved)
  if (lowercaseQuery.includes('international') ||
      lowercaseQuery.includes('cultural') ||
      lowercaseQuery.includes('visa') ||
      lowercaseQuery.includes('culture') ||
      lowercaseQuery.includes('abroad') ||
      lowercaseQuery.includes('foreign')) {
    return 'cultural';
  }
  
  // Voice agent logic (now handled by career tracks with communication context)
  if (lowercaseQuery.includes('presentation') ||
      lowercaseQuery.includes('speaking') ||
      lowercaseQuery.includes('communication') ||
      lowercaseQuery.includes('voice') ||
      lowercaseQuery.includes('verbal') ||
      lowercaseQuery.includes('interview skills')) {
    return 'voice';
  }
  
  // Default to knowledge
  return 'knowledge';
}

/**
 * Gradual rollout helper - determines if user gets new system
 */
function shouldUseNewSystem(sessionId: string = 'anonymous'): boolean {
  if (FEATURE_FLAGS.ROLLBACK_TO_ORIGINAL) return false;
  if (!FEATURE_FLAGS.USE_CAREER_TRACKS) return false;
  
  const rolloutPercentage = FEATURE_FLAGS.CAREER_TRACK_ROLLOUT;
  if (rolloutPercentage >= 100) return true;
  if (rolloutPercentage <= 0) return false;
  
  // Consistent hash-based rollout
  const hash = sessionId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return Math.abs(hash) % 100 < rolloutPercentage;
}

export async function routeToAgent(query: string, intent: Intent, sessionId?: string): Promise<string> {
  // Check if we should use the new system
  if (!shouldUseNewSystem(sessionId)) {
    console.log('🔄 Using legacy agent routing (rollback/gradual rollout)');
    return routeToOriginalAgents(query, intent);
  }
  
  console.log('🎯 Using Option 7: Smart Career Track + Essential Support routing');
  const lowercaseQuery = query.toLowerCase();
  
  // Essential Support Agents (30% of traffic)
  // Booking agent - preserve sophisticated booking functionality
  if (intent.type === 'booking' || 
      lowercaseQuery.includes('book') || 
      lowercaseQuery.includes('appointment') ||
      lowercaseQuery.includes('meet with') ||
      lowercaseQuery.includes('advisor') ||
      lowercaseQuery.includes('consultation') ||
      lowercaseQuery.includes('schedule a meeting')) {
    return 'booking';
  }
  
  // Cultural agent - critical for visa/international support
  // IMPORTANT: Only route to cultural if it's actually about visa/cultural issues
  if ((intent.type === 'cultural' || intent.type === 'visa_support') ||
      lowercaseQuery.includes('visa') ||
      lowercaseQuery.includes('international') ||
      lowercaseQuery.includes('cultural') ||
      lowercaseQuery.includes('immigration') ||
      lowercaseQuery.includes('work authorization') ||
      lowercaseQuery.includes('opt') || lowercaseQuery.includes('cpt')) {
    // BUT: Don't route career track queries to cultural just because intent says so
    // Check if this is actually a career track query that got misclassified
    if (lowercaseQuery.includes('business analyst') || 
        lowercaseQuery.includes('data') && (lowercaseQuery.includes('analyst') || lowercaseQuery.includes('science')) ||
        lowercaseQuery.includes('cybersecurity') || lowercaseQuery.includes('security') ||
        lowercaseQuery.includes('full stack') || lowercaseQuery.includes('developer') ||
        lowercaseQuery.includes('program options') || lowercaseQuery.includes('course options') ||
        lowercaseQuery.includes('bootcamp') || lowercaseQuery.includes('training')) {
      // This is actually a career track query, route to career tracks instead
      console.log(`🔄 Override: "${query}" misclassified as cultural, routing to career track`);
      return routeToCareerTrack(query, intent);
    }
    return 'cultural';
  }
  
  // Career Track Routing (70% of traffic)
  // Route career guidance queries to specialized tracks
  if (intent.type === 'career_path' || intent.type === 'course_comparison' ||
      intent.type === 'prerequisite' || intent.type === 'recommendation' ||
      intent.type === 'career_guidance' || intent.category === 'educational') {
    return routeToCareerTrack(query, intent);
  }
  
  // Handle communication/voice queries through career tracks with context
  if (lowercaseQuery.includes('presentation') ||
      lowercaseQuery.includes('speaking') ||
      lowercaseQuery.includes('communication') ||
      lowercaseQuery.includes('interview skills')) {
    // Route to most relevant career track but with communication context
    const track = routeToCareerTrack(query, intent);
    console.log(`🎤 Communication query routed to ${track} with voice context`);
    return track;
  }
  
  // Default to career track routing for general queries
  return routeToCareerTrack(query, intent);
}

/**
 * Get agent mapping for monitoring/rollback
 */
export function getAgentMapping(newAgent: string): { new: string; legacy: string } {
  return {
    new: newAgent,
    legacy: LEGACY_AGENT_MAPPING[newAgent as keyof typeof LEGACY_AGENT_MAPPING] || 'knowledge'
  };
}

/**
 * Get feature flag status for monitoring
 */
export function getFeatureFlags() {
  return FEATURE_FLAGS;
}