import { db } from '@/lib/db';
import { studentPersonas, personaJourneyQuestions, PersonaConversation } from './persona-schemas';
import { eq, ilike, or, and, desc } from 'drizzle-orm';

interface DetectionSignals {
  visa: string[];
  background: string[];
  emotional: string[];
  technical: string[];
  location: string[];
  urgency: string[];
}

interface PersonaDetectionResult {
  persona: any;
  confidence: number;
  signals: string[];
  journeyStage?: string;
  stageConfidence?: number;
  emotionalNeeds: string[];
}

export class PersonaDetector {
  private readonly detectionPatterns: DetectionSignals = {
    visa: [
      '485', '500', 'student visa', 'working holiday', 'temporary graduate',
      'PR', 'permanent residence', 'citizenship', 'visa expir', 'visa time',
      'points test', 'skilled migration', 'regional nomination'
    ],
    background: [
      'engineer', 'business', 'accounting', 'teaching', 'marketing',
      'no IT', 'no tech', 'non-technical', 'career change', 'career switch',
      'different field', 'new to IT', 'first time', 'beginner'
    ],
    emotional: [
      'worried', 'anxious', 'stressed', 'confused', 'lost', 'overwhelmed',
      'frustrated', 'scared', 'uncertain', 'concerned', 'nervous',
      'hopeful', 'excited', 'motivated', 'determined', 'confident'
    ],
    technical: [
      'never coded', 'no programming', 'basic computer', 'advanced user',
      'some experience', 'self-taught', 'bootcamp graduate', 'degree',
      'expert', 'professional developer'
    ],
    location: [
      'regional', 'rural', 'country', 'small town', 'sydney', 'melbourne',
      'brisbane', 'perth', 'adelaide', 'darwin', 'canberra', 'wollongong',
      'newcastle', 'geelong', 'townsville'
    ],
    urgency: [
      'urgent', 'quickly', 'asap', 'soon', 'deadline', 'running out',
      'time pressure', 'need job', 'unemployed', 'contract ending'
    ]
  };

  private readonly regionalAreas = [
    'wollongong', 'newcastle', 'geelong', 'townsville', 'cairns',
    'darwin', 'hobart', 'ballarat', 'bendigo', 'shepparton',
    'albury', 'wagga wagga', 'orange', 'dubbo', 'tamworth'
  ];

  private readonly journeyStageKeywords = {
    awareness: ['what is', 'tell me about', 'explain', 'overview', 'introduction'],
    research: ['compare', 'vs', 'better', 'best', 'recommend', 'should I'],
    pre_consultation: ['book', 'speak', 'talk', 'consultation', 'advisor'],
    consultation: ['during consultation', 'advisor said', 'was told'],
    decision: ['decide', 'choice', 'option', 'which course', 'enroll'],
    onboarding: ['starting', 'begin', 'first day', 'preparation'],
    bootcamp_start: ['week 1', 'beginning', 'first week', 'orientation'],
    engagement: ['assignment', 'project', 'struggling with', 'help with'],
    delivery: ['final project', 'capstone', 'portfolio', 'presentation'],
    post_completion: ['graduated', 'finished', 'job search', 'next steps']
  };

  async detectPersona(query: string, conversationHistory?: any[]): Promise<PersonaDetectionResult> {
    const queryLower = query.toLowerCase();
    const fullContext = this.buildFullContext(query, conversationHistory);
    
    // Extract signals from query and history
    const detectedSignals = this.extractSignals(fullContext);
    
    // Find matching personas from database
    const candidates = await this.findPersonaCandidates(detectedSignals);
    
    // Score and rank candidates
    const scoredCandidates = candidates.map(candidate => ({
      persona: candidate,
      score: this.calculatePersonaScore(candidate, detectedSignals),
      matchedSignals: this.getMatchedSignals(candidate, detectedSignals)
    }));

    // Get best match
    const bestMatch = scoredCandidates.sort((a, b) => b.score - a.score)[0];
    
    // Detect journey stage
    const journeyDetection = this.detectJourneyStage(queryLower);
    
    // Detect emotional needs
    const emotionalNeeds = this.detectEmotionalNeeds(fullContext);

    // If no good match, use default international student persona
    if (!bestMatch || bestMatch.score < 30) {
      const defaultPersona = await this.getDefaultPersona();
      return {
        persona: defaultPersona,
        confidence: Math.max(bestMatch?.score || 0, 20),
        signals: detectedSignals.flat(),
        journeyStage: journeyDetection.stage,
        stageConfidence: journeyDetection.confidence,
        emotionalNeeds
      };
    }

    return {
      persona: bestMatch.persona,
      confidence: bestMatch.score,
      signals: bestMatch.matchedSignals,
      journeyStage: journeyDetection.stage,
      stageConfidence: journeyDetection.confidence,
      emotionalNeeds
    };
  }

  private buildFullContext(query: string, history?: any[]): string {
    let context = query;
    
    if (history && history.length > 0) {
      // Add last 3 messages for context
      const recentHistory = history.slice(-6) // Last 3 back-and-forth
        .map(msg => msg.content)
        .join(' ');
      context = `${recentHistory} ${query}`;
    }
    
    return context.toLowerCase();
  }

  private extractSignals(text: string): string[] {
    const signals: string[] = [];
    
    Object.entries(this.detectionPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        if (text.includes(pattern.toLowerCase())) {
          signals.push(`${category}:${pattern}`);
        }
      });
    });

    return signals;
  }

  private async findPersonaCandidates(signals: string[]): Promise<any[]> {
    try {
      // Get all personas for now - in production, you'd optimize this
      const allPersonas = await db.select().from(studentPersonas);
      return allPersonas;
    } catch (error) {
      console.error('Error fetching persona candidates:', error);
      return [];
    }
  }

  private calculatePersonaScore(persona: any, signals: string[]): number {
    let score = 0;
    
    // Visa type matching (high weight)
    const visaSignals = signals.filter(s => s.startsWith('visa:'));
    if (visaSignals.some(s => s.includes(persona.visaType?.toLowerCase() || ''))) {
      score += 25;
    }

    // Location matching (medium weight)
    const locationSignals = signals.filter(s => s.startsWith('location:'));
    if (persona.location && locationSignals.some(s => 
        s.includes(persona.location.toLowerCase())
    )) {
      score += 20;
    }

    // Regional status matching
    if (persona.isRegional && signals.some(s => s.includes('regional'))) {
      score += 15;
    }

    // Background field matching (medium weight)
    const backgroundSignals = signals.filter(s => s.startsWith('background:'));
    if (persona.previousField && backgroundSignals.some(s => 
        s.includes(persona.previousField.toLowerCase().split(' ')[0])
    )) {
      score += 15;
    }

    // Emotional state matching (low weight but important)
    const emotionalSignals = signals.filter(s => s.startsWith('emotional:'));
    if (persona.emotionalState && emotionalSignals.some(s => 
        s.includes(persona.emotionalState.toLowerCase())
    )) {
      score += 10;
    }

    // Technical confidence matching
    const techSignals = signals.filter(s => s.startsWith('technical:'));
    if (persona.techConfidence && techSignals.some(s => 
        s.includes(persona.techConfidence.toLowerCase())
    )) {
      score += 10;
    }

    // Urgency matching
    const urgencySignals = signals.filter(s => s.startsWith('urgency:'));
    if (persona.urgencyLevel && urgencySignals.some(s => 
        s.includes('urgent') || s.includes('quickly')
    ) && persona.urgencyLevel === 'high') {
      score += 5;
    }

    return Math.min(score, 100); // Cap at 100%
  }

  private getMatchedSignals(persona: any, signals: string[]): string[] {
    const matched: string[] = [];
    
    // Add specific matches for transparency
    if (persona.visaType && signals.some(s => s.includes(persona.visaType.toLowerCase()))) {
      matched.push(`visa_type:${persona.visaType}`);
    }
    
    if (persona.location && signals.some(s => s.includes(persona.location.toLowerCase()))) {
      matched.push(`location:${persona.location}`);
    }
    
    if (persona.isRegional && signals.some(s => s.includes('regional'))) {
      matched.push('location:regional');
    }
    
    return matched;
  }

  private detectJourneyStage(query: string): { stage: string; confidence: number } {
    let bestMatch = { stage: 'research', confidence: 20 }; // Default
    
    Object.entries(this.journeyStageKeywords).forEach(([stage, keywords]) => {
      const matches = keywords.filter(keyword => query.includes(keyword)).length;
      const confidence = Math.min((matches / keywords.length) * 100, 90);
      
      if (confidence > bestMatch.confidence) {
        bestMatch = { stage, confidence };
      }
    });

    return bestMatch;
  }

  private detectEmotionalNeeds(text: string): string[] {
    const needs: string[] = [];
    
    // Anxiety indicators
    if (/worried|anxious|stressed|scared|nervous/.test(text)) {
      needs.push('reassurance');
    }
    
    // Confusion indicators
    if (/confused|lost|don't understand|unclear/.test(text)) {
      needs.push('clarity');
    }
    
    // Urgency indicators
    if (/urgent|quickly|asap|running out|deadline/.test(text)) {
      needs.push('immediate_action');
    }
    
    // Direction seeking
    if (/should I|what do I|how do I|next step/.test(text)) {
      needs.push('guidance');
    }
    
    // Validation seeking
    if (/right choice|good idea|am I on track/.test(text)) {
      needs.push('validation');
    }

    return needs.length > 0 ? needs : ['general_support'];
  }

  private async getDefaultPersona(): Promise<any> {
    try {
      // Try to get a general international student persona
      const defaultPersona = await db.select()
        .from(studentPersonas)
        .where(eq(studentPersonas.archetypeCode, 'general_international'))
        .limit(1);
      
      if (defaultPersona.length > 0) {
        return defaultPersona[0];
      }
      
      // If no default exists, return a basic template
      return {
        id: 'default',
        archetypeName: 'International Student',
        archetypeCode: 'general_international',
        nationality: 'International',
        communicationStyle: 'supportive',
        emotionalState: 'seeking_guidance',
        primaryMotivation: 'career_development'
      };
    } catch (error) {
      console.error('Error getting default persona:', error);
      return {
        id: 'fallback',
        archetypeName: 'Student',
        archetypeCode: 'fallback',
        communicationStyle: 'helpful'
      };
    }
  }

  // Utility method to analyze a query without database calls (for testing)
  analyzeQuery(query: string): { signals: string[]; stage: string; emotions: string[] } {
    const signals = this.extractSignals(query.toLowerCase());
    const { stage } = this.detectJourneyStage(query.toLowerCase());
    const emotions = this.detectEmotionalNeeds(query.toLowerCase());
    
    return { signals, stage, emotions };
  }
}