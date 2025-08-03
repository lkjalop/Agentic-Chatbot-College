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

export interface PersonaDetectionResult {
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
      'engineer', 'mechanical engineer', 'business', 'accounting', 'teaching', 'marketing',
      'admin', 'administrative', 'healthcare', 'physiotherapist', 'creative',
      'high school', 'recent graduate', 'just finished', 'university degree',
      'no IT', 'no tech', 'non-technical', 'career change', 'career switch',
      'different field', 'new to IT', 'first time', 'beginner', 'switching to tech',
      'transitioning', 'career transition'
    ],
    emotional: [
      'worried', 'anxious', 'stressed', 'confused', 'lost', 'overwhelmed',
      'frustrated', 'struggling', 'scared', 'uncertain', 'concerned', 'nervous',
      'hopeful', 'excited', 'motivated', 'determined', 'confident', 'failure',
      'feel like a failure', 'wasting', 'too old', 'age', 'family responsibilities'
    ],
    technical: [
      'never coded', 'no programming', 'basic computer', 'advanced user',
      'some experience', 'self-taught', 'bootcamp graduate', 'degree',
      'expert', 'professional developer'
    ],
    location: [
      'regional', 'rural', 'country', 'small town', 'sydney', 'melbourne',
      'brisbane', 'perth', 'adelaide', 'darwin', 'canberra', 'wollongong',
      'newcastle', 'geelong', 'townsville', 'australian', 'local'
    ],
    urgency: [
      'urgent', 'quickly', 'asap', 'soon', 'deadline', 'running out',
      'time pressure', 'need job', 'unemployed', 'contract ending',
      'rejections', 'interviews', 'job hunting'
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
    if (!bestMatch || bestMatch.score < 25) {
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
      patterns.forEach((pattern: string) => {
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
      const allPersonas = await db().select().from(studentPersonas);
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
      score += 30; // Increased from 25
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

    // Background field matching (enhanced with better patterns)
    const backgroundSignals = signals.filter(s => s.startsWith('background:'));
    if (persona.previousField && backgroundSignals.length > 0) {
      const personaField = persona.previousField.toLowerCase();
      const hasMatch = backgroundSignals.some(s => {
        const signal = s.toLowerCase();
        
        // Direct field matching
        if (signal.includes(personaField)) return true;
        
        // Enhanced field matching
        if (personaField.includes('mechanical') && signal.includes('engineer')) return true;
        if (personaField.includes('marketing') && signal.includes('marketing')) return true;
        if (personaField.includes('admin') && signal.includes('admin')) return true;
        if (personaField.includes('healthcare') && signal.includes('healthcare')) return true;
        
        // Career transition signals
        if (signal.includes('career change') || signal.includes('switching') || signal.includes('transitioning')) {
          return true;
        }
        
        return false;
      });
      
      if (hasMatch) {
        score += 20; // Increased from 15
      }
    }

    // Age/Experience level matching (new)
    if (persona.archetypeName?.toLowerCase().includes('tyler') && 
        signals.some(s => s.includes('high school') || s.includes('recent graduate'))) {
      score += 15;
    }
    
    if (persona.archetypeName?.toLowerCase().includes('callum') && 
        signals.some(s => s.includes('australian') || s.includes('admin'))) {
      score += 15;
    }

    // Emotional state matching (enhanced)
    const emotionalSignals = signals.filter(s => s.startsWith('emotional:'));
    if (persona.emotionalState && emotionalSignals.length > 0) {
      const personaEmotion = persona.emotionalState.toLowerCase();
      const hasMatch = emotionalSignals.some(s => {
        const signal = s.toLowerCase();
        
        // Direct match
        if (signal.includes(personaEmotion)) return true;
        
        // Enhanced synonym matching
        if (personaEmotion === 'frustrated' && (
          signal.includes('struggling') || signal.includes('stressed') || 
          signal.includes('failure') || signal.includes('rejections')
        )) return true;
        
        if (personaEmotion === 'anxious' && (
          signal.includes('worried') || signal.includes('concerned') || signal.includes('nervous')
        )) return true;
        
        if (personaEmotion === 'hopeful' && (
          signal.includes('motivated') || signal.includes('determined') || signal.includes('excited')
        )) return true;
        
        if (personaEmotion === 'uncertain' && (
          signal.includes('confused') || signal.includes('lost') || signal.includes('wasting')
        )) return true;
        
        return false;
      });
      
      if (hasMatch) {
        score += 15; // Increased from 10
      }
    }

    // Technical confidence matching
    const techSignals = signals.filter(s => s.startsWith('technical:'));
    if (persona.techConfidence && techSignals.some(s => 
        s.includes(persona.techConfidence.toLowerCase())
    )) {
      score += 10;
    }

    // Urgency matching (enhanced)
    const urgencySignals = signals.filter(s => s.startsWith('urgency:'));
    if (urgencySignals.length > 0) {
      // Give points for any urgency signals that match the persona's likely urgency
      if (persona.visaType === '485' && urgencySignals.some(s => 
        s.includes('job hunting') || s.includes('interviews') || s.includes('rejections')
      )) {
        score += 10;
      }
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
      const defaultPersona = await db().select()
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