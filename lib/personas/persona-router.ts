import { searchVectors, searchWithRelationships } from '@/lib/vector';
import { analyzeIntent, enhanceQuery, Intent } from '@/lib/ai/groq';
import { generateEmpatheticResponse } from '@/lib/ai/empathetic-response';
import { PersonaDetector, PersonaDetectionResult } from './persona-detector';
import { db } from '@/lib/db';
import { personaConversations } from './persona-schemas';

export interface PersonaRouterConfig {
  maxDepth?: number;
  resultLimit?: number;
  includeRelated?: boolean;
  memoryContext?: any[];
  enablePersonaDetection?: boolean;
}

export interface PersonaRouterResponse {
  intent: Intent;
  query: string;
  results: any[];
  summary?: string;
  personaDetection?: PersonaDetectionResult;
  metadata: {
    strategy: string;
    confidence: number;
    entities: string[];
    personaConfidence?: number;
    emotionalSupport?: string[];
  };
}

export class PersonaAwareRouter {
  private config: Required<PersonaRouterConfig>;
  private personaDetector: PersonaDetector;

  constructor(config: PersonaRouterConfig = {}) {
    this.config = {
      maxDepth: config.maxDepth ?? 3,
      resultLimit: config.resultLimit ?? 10,
      includeRelated: config.includeRelated ?? true,
      memoryContext: config.memoryContext ?? [],
      enablePersonaDetection: config.enablePersonaDetection ?? true
    };
    
    this.personaDetector = new PersonaDetector();
  }

  async route(query: string, conversationId?: string): Promise<PersonaRouterResponse> {
    try {
      // Step 1: Detect persona if enabled
      let personaDetection: PersonaDetectionResult | undefined;
      
      if (this.config.enablePersonaDetection) {
        personaDetection = await this.personaDetector.detectPersona(
          query, 
          this.config.memoryContext
        );
        
        // Log persona detection if we have a conversation ID
        if (conversationId && personaDetection.confidence > 30) {
          await this.logPersonaDetection(conversationId, personaDetection);
        }
      }

      // Step 2: Analyze intent (enhanced with persona context)
      const intent = await this.analyzeIntentWithPersona(query, personaDetection);
      
      // Step 3: Enhance query based on persona and intent
      const enhancedQuery = await this.enhanceQueryWithPersona(query, intent, personaDetection);
      
      // Step 4: Search with persona-aware strategy
      const results = await this.searchWithPersonaContext(enhancedQuery, intent, personaDetection);
      
      // Step 5: Generate empathetic response if persona detected
      let summary: string | undefined;
      if (personaDetection && personaDetection.confidence > 40) {
        summary = await generateEmpatheticResponse({
          query,
          personaDetection,
          searchResults: results,
          conversationHistory: this.config.memoryContext
        });
      }

      return {
        intent,
        query: enhancedQuery,
        results,
        summary,
        personaDetection,
        metadata: {
          strategy: intent.searchStrategy,
          confidence: intent.confidence,
          entities: intent.entities,
          personaConfidence: personaDetection?.confidence,
          emotionalSupport: personaDetection?.emotionalNeeds
        }
      };

    } catch (error) {
      console.error('PersonaAwareRouter error:', error);
      
      // Fallback to basic routing
      const intent = await analyzeIntent(query);
      const enhancedQuery = await enhanceQuery(query, intent);
      const basicResults = await searchVectors({ query: enhancedQuery, limit: this.config.resultLimit });
      
      return {
        intent,
        query: enhancedQuery,
        results: basicResults.results || [],
        metadata: {
          strategy: intent.searchStrategy,
          confidence: intent.confidence,
          entities: intent.entities
        }
      };
    }
  }

  private async analyzeIntentWithPersona(
    query: string, 
    personaDetection?: PersonaDetectionResult
  ): Promise<Intent> {
    // If we have high-confidence persona detection, we can enhance intent analysis
    if (personaDetection && personaDetection.confidence > 60) {
      const persona = personaDetection.persona;
      
      // Add persona context to the query for better intent analysis
      let contextualQuery = query;
      
      if (persona?.visaType) {
        contextualQuery += ` (${persona.visaType} visa holder)`;
      }
      
      if (persona?.previousField && persona.previousField !== 'IT') {
        contextualQuery += ` (transitioning from ${persona.previousField})`;
      }
      
      if (personaDetection.journeyStage) {
        contextualQuery += ` (at ${personaDetection.journeyStage} stage)`;
      }
      
      return analyzeIntent(contextualQuery);
    }
    
    // Standard intent analysis
    return analyzeIntent(query);
  }

  private async enhanceQueryWithPersona(
    query: string, 
    intent: Intent, 
    personaDetection?: PersonaDetectionResult
  ): Promise<string> {
    let enhancedQuery = await enhanceQuery(query, intent);
    
    // Add persona-specific enhancements
    if (personaDetection && personaDetection.confidence > 50) {
      const persona = personaDetection.persona;
      
      // Add context for visa-specific searches
      if (intent.type === 'career_path' && persona?.visaType) {
        enhancedQuery += ` ${persona.visaType} visa career pathway`;
      }
      
      // Add regional context
      if (persona?.isRegional && intent.type !== 'definition') {
        enhancedQuery += ` regional opportunities`;
      }
      
      // Add experience level context
      if (persona?.techConfidence === 'none' && intent.type === 'tutorial') {
        enhancedQuery += ` beginner-friendly complete novice`;
      }
      
      // Add background transition context
      if (persona?.previousField && intent.type === 'prerequisite') {
        enhancedQuery += ` transitioning from ${persona.previousField}`;
      }
    }
    
    return enhancedQuery;
  }

  private async searchWithPersonaContext(
    query: string, 
    intent: Intent, 
    personaDetection?: PersonaDetectionResult
  ): Promise<any[]> {
    // First, try to find persona-specific content
    let personaResults: any[] = [];
    
    if (personaDetection && personaDetection.confidence > 40) {
      const personaFilter = {
        contentType: 'persona_qa',
        personaCode: personaDetection.persona?.archetypeCode
      };
      
      const personaSearch = await searchVectors({
        query,
        limit: Math.floor(this.config.resultLimit / 2),
        filter: personaFilter
      });
      
      if (personaSearch.success && personaSearch.results) {
        personaResults = personaSearch.results;
      }
    }

    // Then get general content based on intent strategy
    let generalResults: any[] = [];
    const generalLimit = this.config.resultLimit - personaResults.length;
    
    if (generalLimit > 0) {
      switch (intent.searchStrategy) {
        case 'relationship':
          const relationshipSearch = await searchWithRelationships({
            query,
            depth: this.config.maxDepth,
            limit: generalLimit
          });
          generalResults = relationshipSearch.results || [];
          break;
          
        case 'career':
          const careerSearch = await searchVectors({
            query,
            limit: generalLimit,
            filter: { contentType: 'career' }
          });
          generalResults = careerSearch.results || [];
          break;
          
        default:
          const semanticSearch = await searchVectors({
            query,
            limit: generalLimit
          });
          generalResults = semanticSearch.results || [];
      }
    }

    // Combine and prioritize results
    return this.combineAndPrioritizeResults(personaResults, generalResults, personaDetection);
  }

  private combineAndPrioritizeResults(
    personaResults: any[], 
    generalResults: any[], 
    personaDetection?: PersonaDetectionResult
  ): any[] {
    // If we have high-confidence persona detection, prioritize persona-specific results
    if (personaDetection && personaDetection.confidence > 60) {
      // Boost persona results scores
      const boostedPersonaResults = personaResults.map(result => ({
        ...result,
        score: Math.min((result.score || 0) * 1.2, 1.0), // 20% boost, capped at 1.0
        isPrioritized: true
      }));
      
      // Combine and sort by score
      const combined = [...boostedPersonaResults, ...generalResults];
      return combined.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    
    // Standard combination
    return [...personaResults, ...generalResults];
  }

  private async logPersonaDetection(
    conversationId: string, 
    detection: PersonaDetectionResult
  ): Promise<void> {
    try {
      await db.insert(personaConversations).values({
        originalConversationId: conversationId,
        detectedPersonaId: detection.persona?.id,
        detectionConfidence: detection.confidence,
        detectionSignals: detection.signals,
        inferredJourneyStage: detection.journeyStage,
        stageConfidence: detection.stageConfidence || 0,
        emotionalNeedsDetected: detection.emotionalNeeds,
        queryResolved: false, // Will be updated later if needed
        followUpNeeded: detection.emotionalNeeds.includes('immediate_action')
      }).onConflictDoNothing(); // Ignore if already exists
    } catch (error) {
      console.error('Error logging persona detection:', error);
      // Don't throw - this is optional logging
    }
  }

  // Utility method for testing persona routing
  async testPersonaDetection(query: string): Promise<{
    persona: any;
    confidence: number;
    signals: string[];
    journeyStage?: string;
    emotionalNeeds: string[];
  }> {
    const detection = await this.personaDetector.detectPersona(query);
    return {
      persona: detection.persona,
      confidence: detection.confidence,
      signals: detection.signals,
      journeyStage: detection.journeyStage,
      emotionalNeeds: detection.emotionalNeeds
    };
  }
}