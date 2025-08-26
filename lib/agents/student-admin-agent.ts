import { generateResponse, analyzeIntent } from '@/lib/ai/groq';

// Student Admin Agent for intelligent call handling
export interface CallContext {
  callSid: string;
  callerNumber: string;
  transcription: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  userInfo?: {
    name?: string;
    previousCalls?: number;
    preferredTrack?: string;
    stage?: 'inquiry' | 'application' | 'enrolled';
  };
}

export interface AgentDecision {
  action: 'answer-ai' | 'transfer-human' | 'schedule-callback' | 'escalate' | 'end-call';
  response?: string;
  reason: string;
  confidence: number;
  transferTo?: 'enrollment' | 'technical' | 'financial' | 'general';
  followUp?: {
    scheduleCallback?: boolean;
    sendEmail?: boolean;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export class StudentAdminAgent {
  
  /**
   * Main decision engine for call routing
   */
  async makeCallDecision(context: CallContext): Promise<AgentDecision> {
    try {
      // Analyze the caller's intent
      const intent = await analyzeIntent(context.transcription);
      
      // Check for immediate escalation triggers
      const escalation = this.checkEscalationTriggers(context);
      if (escalation) {
        return escalation;
      }
      
      // Determine if AI can handle this query
      const canHandleWithAI = await this.canHandleWithAI(context, intent);
      
      if (canHandleWithAI.canHandle) {
        // Generate AI response
        const response = await this.generateAIResponse(context, intent);
        
        return {
          action: 'answer-ai',
          response,
          reason: canHandleWithAI.reason,
          confidence: canHandleWithAI.confidence,
          followUp: {
            scheduleCallback: this.shouldOfferCallback(context),
            priority: this.determinePriority(context)
          }
        };
      }
      
      // Route to appropriate human team
      return this.routeToHuman(context, intent);
      
    } catch (error) {
      console.error('Error in Student Admin Agent:', error);
      
      // Safe fallback to human transfer
      return {
        action: 'transfer-human',
        reason: 'Technical error in AI processing',
        confidence: 0.9,
        transferTo: 'general',
        followUp: { priority: 'medium' }
      };
    }
  }
  
  /**
   * Check for immediate escalation triggers
   */
  private checkEscalationTriggers(context: CallContext): AgentDecision | null {
    const text = context.transcription.toLowerCase();
    
    // Crisis/Emergency keywords
    if (this.containsCrisisKeywords(text)) {
      return {
        action: 'escalate',
        reason: 'Crisis or emergency language detected',
        confidence: 0.95,
        transferTo: 'general',
        response: 'I understand this is important. Let me connect you immediately with our senior advisor team.',
        followUp: { priority: 'urgent' }
      };
    }
    
    // Angry/Complaint keywords
    if (this.containsComplaintKeywords(text)) {
      return {
        action: 'transfer-human',
        reason: 'Complaint or dissatisfaction detected',
        confidence: 0.85,
        transferTo: 'general',
        response: 'I understand your concern. Let me connect you directly with our team lead who can address this properly.',
        followUp: { priority: 'high' }
      };
    }
    
    // Legal/Refund requests
    if (this.containsLegalKeywords(text)) {
      return {
        action: 'transfer-human',
        reason: 'Legal or refund request requires human handling',
        confidence: 0.9,
        transferTo: 'financial',
        response: 'For policy and refund matters, I need to connect you with our enrollment team.',
        followUp: { priority: 'high' }
      };
    }
    
    return null;
  }
  
  /**
   * Determine if AI can handle the query
   */
  private async canHandleWithAI(
    context: CallContext, 
    intent: any
  ): Promise<{ canHandle: boolean; confidence: number; reason: string }> {
    
    const text = context.transcription.toLowerCase();
    
    // High confidence AI handling scenarios
    if (this.isBasicInquiry(text, intent)) {
      return {
        canHandle: true,
        confidence: 0.9,
        reason: 'Standard course information inquiry'
      };
    }
    
    if (this.isPricingInquiry(text)) {
      return {
        canHandle: true,
        confidence: 0.95,
        reason: 'Pricing information readily available'
      };
    }
    
    if (this.isScheduleInquiry(text)) {
      return {
        canHandle: true,
        confidence: 0.85,
        reason: 'Schedule information can be provided'
      };
    }
    
    // Medium confidence scenarios
    if (this.isApplicationProcess(text)) {
      return {
        canHandle: true,
        confidence: 0.7,
        reason: 'Can provide initial application guidance'
      };
    }
    
    // Scenarios requiring human intervention
    if (this.requiresPersonalization(context)) {
      return {
        canHandle: false,
        confidence: 0.8,
        reason: 'Requires personalized consultation'
      };
    }
    
    if (this.isComplexTechnicalQuery(text)) {
      return {
        canHandle: false,
        confidence: 0.75,
        reason: 'Technical complexity requires human expertise'
      };
    }
    
    // Default: Can try AI with medium confidence
    return {
      canHandle: true,
      confidence: 0.6,
      reason: 'General inquiry suitable for AI assistance'
    };
  }
  
  /**
   * Generate AI response for calls
   */
  private async generateAIResponse(context: CallContext, intent: any): Promise<string> {
    // Use existing search system to get relevant information
    const searchResults = await this.searchRelevantInfo(context.transcription);
    
    // Generate response using the AI system with call-specific prompt
    const systemContext = `
You are a voice assistant for a tech bootcamp. The caller asked: "${context.transcription}"

VOICE RESPONSE RULES:
- Keep responses under 30 seconds (about 60-80 words)
- Speak naturally and conversationally
- Be helpful but concise
- Always offer to connect them with enrollment team for detailed discussions
- Use pauses naturally: "We offer four career tracks... Data & AI, Cybersecurity, Business Analysis, and Full Stack Development."

PROGRAMS INFO:
- 4 tracks: Data & AI ($740), Cybersecurity, Business Analyst, Full Stack Developer  
- 4-week bootcamp or 10-week program with industry project
- No prerequisites required
- Rolling admissions

Give a helpful, natural voice response that directly answers their question.`;

    try {
      const response = await generateResponse(
        context.transcription,
        searchResults,
        intent,
        context.conversationHistory.slice(-3) // Last 3 messages
      );
      
      // Ensure voice-appropriate response
      return this.optimizeForVoice(response);
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.getFallbackResponse(context);
    }
  }
  
  /**
   * Route to appropriate human team
   */
  private routeToHuman(context: CallContext, intent: any): AgentDecision {
    const text = context.transcription.toLowerCase();
    
    // Financial/Payment queries
    if (text.includes('payment') || text.includes('financial') || text.includes('scholarship')) {
      return {
        action: 'transfer-human',
        reason: 'Financial inquiry requires enrollment team',
        confidence: 0.9,
        transferTo: 'financial',
        response: 'For payment options and financial assistance, let me connect you with our enrollment advisor.',
        followUp: { priority: 'medium' }
      };
    }
    
    // Technical curriculum questions
    if (text.includes('technical') || text.includes('curriculum') || text.includes('prerequisite')) {
      return {
        action: 'transfer-human',
        reason: 'Technical curriculum discussion',
        confidence: 0.85,
        transferTo: 'technical',
        response: 'For detailed technical curriculum questions, I\'ll connect you with our program coordinator.',
        followUp: { priority: 'medium' }
      };
    }
    
    // Application/Enrollment
    if (text.includes('apply') || text.includes('enroll') || text.includes('start')) {
      return {
        action: 'transfer-human',
        reason: 'Application process requires enrollment guidance',
        confidence: 0.9,
        transferTo: 'enrollment',
        response: 'I\'ll connect you with our enrollment team to start your application process.',
        followUp: { priority: 'high' }
      };
    }
    
    // Default to general team
    return {
      action: 'transfer-human',
      reason: 'Complex inquiry requires human assistance',
      confidence: 0.7,
      transferTo: 'general',
      response: 'Let me connect you with our student advisor team for personalized assistance.',
      followUp: { priority: 'medium' }
    };
  }
  
  /**
   * Optimize response for voice delivery
   */
  private optimizeForVoice(text: string): string {
    return text
      // Remove markdown and formatting
      .replace(/[*_`]/g, '')
      // Add natural pauses
      .replace(/\. /g, '... ')
      // Spell out common abbreviations
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bIT\b/g, 'I.T.')
      // Keep under ~80 words for 30-second delivery
      .substring(0, 400);
  }
  
  // Helper methods for content analysis
  private containsCrisisKeywords(text: string): boolean {
    const crisisWords = ['suicide', 'kill myself', 'end it all', 'emergency', 'crisis', 'desperate'];
    return crisisWords.some(word => text.includes(word));
  }
  
  private containsComplaintKeywords(text: string): boolean {
    const complaintWords = ['terrible', 'awful', 'worst', 'scam', 'fraud', 'angry', 'furious', 'disappointed'];
    return complaintWords.some(word => text.includes(word));
  }
  
  private containsLegalKeywords(text: string): boolean {
    const legalWords = ['refund', 'lawsuit', 'lawyer', 'legal action', 'consumer rights', 'dispute'];
    return legalWords.some(word => text.includes(word));
  }
  
  private isBasicInquiry(text: string, intent: any): boolean {
    const basicWords = ['what is', 'tell me about', 'information', 'course', 'program', 'bootcamp'];
    return basicWords.some(word => text.includes(word)) && intent.confidence > 0.7;
  }
  
  private isPricingInquiry(text: string): boolean {
    const priceWords = ['cost', 'price', 'fee', 'tuition', 'payment', 'how much'];
    return priceWords.some(word => text.includes(word));
  }
  
  private isScheduleInquiry(text: string): boolean {
    const scheduleWords = ['when', 'schedule', 'start date', 'duration', 'time'];
    return scheduleWords.some(word => text.includes(word));
  }
  
  private isApplicationProcess(text: string): boolean {
    const applicationWords = ['how to apply', 'application', 'requirements', 'eligibility'];
    return applicationWords.some(word => text.includes(word));
  }
  
  private requiresPersonalization(context: CallContext): boolean {
    const text = context.transcription.toLowerCase();
    const personalWords = ['my situation', 'my background', 'my experience', 'personal', 'specific'];
    return personalWords.some(word => text.includes(word));
  }
  
  private isComplexTechnicalQuery(text: string): boolean {
    const complexWords = ['advanced', 'deep dive', 'detailed technical', 'architecture', 'specific technology'];
    return complexWords.some(word => text.includes(word));
  }
  
  private shouldOfferCallback(context: CallContext): boolean {
    // Offer callback for complex queries or when conversation is getting long
    return context.conversationHistory.length > 3 || 
           context.transcription.length > 200;
  }
  
  private determinePriority(context: CallContext): 'low' | 'medium' | 'high' | 'urgent' {
    const text = context.transcription.toLowerCase();
    
    if (text.includes('urgent') || text.includes('asap')) return 'urgent';
    if (text.includes('soon') || text.includes('deadline')) return 'high';
    if (text.includes('when') || text.includes('schedule')) return 'medium';
    return 'low';
  }
  
  private getFallbackResponse(context: CallContext): string {
    return "I'd be happy to help you with information about our tech bootcamp programs. We offer four career tracks with flexible scheduling. Let me connect you with our enrollment team for detailed assistance.";
  }
  
  private async searchRelevantInfo(query: string): Promise<any[]> {
    // This would integrate with your existing search system
    // For now, return basic program info
    return [
      {
        content: "We offer 4 career tracks: Data & AI Analyst ($740 AUD), Full Stack Developer, Cybersecurity, and Business Analyst. Programs are 4 weeks or 10 weeks with industry project.",
        metadata: { type: 'program-info' }
      }
    ];
  }
}

// Export singleton instance
export const studentAdminAgent = new StudentAdminAgent();