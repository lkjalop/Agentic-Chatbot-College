import { Twilio } from 'twilio';
import { validateEnvironment } from '@/lib/config/environment';
import { studentAdminAgent, CallContext } from '@/lib/agents/student-admin-agent';

// Initialize Twilio client
const getTwilioClient = () => {
  const env = validateEnvironment();
  
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.warn('Twilio credentials not configured');
    return null;
  }
  
  return new Twilio(accountSid, authToken);
};

export const twilioClient = getTwilioClient();

// Call management types
export interface CallSession {
  callSid: string;
  from: string;
  to: string;
  status: 'initiated' | 'in-progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  transcription?: string;
  intent?: string;
  routedTo?: 'student-admin' | 'human' | 'voicemail';
}

export interface VoiceResponse {
  message: string;
  action: 'continue' | 'transfer' | 'hangup' | 'collect-input';
  transferTo?: string;
  collectType?: 'speech' | 'dtmf';
  options?: string[];
}

export class TwilioVoiceService {
  private activeCallSessions: Map<string, CallSession> = new Map();
  private callHistories: Map<string, Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date }>> = new Map();

  /**
   * Handle incoming call webhook
   */
  async handleIncomingCall(callSid: string, from: string, to: string): Promise<string> {
    console.log(`📞 Incoming call: ${callSid} from ${from} to ${to}`);
    
    // Create call session
    const session: CallSession = {
      callSid,
      from,
      to,
      status: 'initiated',
      startTime: new Date(),
    };
    
    this.activeCallSessions.set(callSid, session);
    
    // Generate TwiML response for call greeting
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Hello! Welcome to the Digital Career Coach. 
        I'm your AI assistant. How can I help you today?
    </Say>
    <Record maxLength="30" transcribe="true" transcribeCallback="/api/voice/transcribe"/>
    <Say>I didn't hear anything. Let me transfer you to our student admin team.</Say>
    <Dial>+61234567890</Dial>
</Response>`;
    
    return twiml;
  }

  /**
   * Process speech transcription from Twilio using Student Admin Agent
   */
  async processTranscription(callSid: string, transcription: string): Promise<VoiceResponse> {
    const session = this.activeCallSessions.get(callSid);
    if (!session) {
      throw new Error(`Call session not found: ${callSid}`);
    }
    
    // Update session with transcription
    session.transcription = transcription;
    session.status = 'in-progress';
    
    console.log(`🎤 Transcription for ${callSid}: "${transcription}"`);
    
    // Create context for Student Admin Agent
    const callContext: CallContext = {
      callSid,
      callerNumber: session.from,
      transcription,
      conversationHistory: this.getCallHistory(callSid)
    };
    
    // Let Student Admin Agent decide how to handle the call
    const decision = await studentAdminAgent.makeCallDecision(callContext);
    
    console.log(`🎯 Agent Decision: ${decision.action} (${decision.confidence * 100}% confidence) - ${decision.reason}`);
    
    // Store decision in session
    session.routedTo = decision.transferTo as any;
    
    // Convert decision to voice response
    return this.convertDecisionToVoiceResponse(decision);
  }

  /**
   * Analyze caller intent from speech
   */
  private async analyzeCallIntent(transcription: string): Promise<string> {
    const lowerText = transcription.toLowerCase();
    
    // Simple keyword-based intent detection
    if (lowerText.includes('course') || lowerText.includes('bootcamp') || lowerText.includes('program')) {
      return 'course-inquiry';
    }
    
    if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('fee')) {
      return 'pricing-inquiry';
    }
    
    if (lowerText.includes('apply') || lowerText.includes('enroll') || lowerText.includes('start')) {
      return 'application-inquiry';
    }
    
    if (lowerText.includes('job') || lowerText.includes('career') || lowerText.includes('placement')) {
      return 'career-inquiry';
    }
    
    if (lowerText.includes('schedule') || lowerText.includes('time') || lowerText.includes('when')) {
      return 'schedule-inquiry';
    }
    
    if (lowerText.includes('speak') || lowerText.includes('human') || lowerText.includes('person')) {
      return 'human-request';
    }
    
    return 'general-inquiry';
  }

  /**
   * Route call based on intent
   */
  private async routeCall(session: CallSession, intent: string): Promise<VoiceResponse> {
    switch (intent) {
      case 'course-inquiry':
        session.routedTo = 'student-admin';
        return {
          message: 'I can help with course information. We offer 4 career tracks: Data & AI, Cybersecurity, Business Analyst, and Full Stack Development. Which interests you most?',
          action: 'collect-input',
          collectType: 'speech',
          options: ['Data & AI', 'Cybersecurity', 'Business Analyst', 'Full Stack Development']
        };
        
      case 'pricing-inquiry':
        session.routedTo = 'student-admin';
        return {
          message: 'Our 4-week bootcamp is $740 AUD, with weekly payment options available. The complete 10-week program is $1,430. Would you like me to connect you with our enrollment team for details?',
          action: 'collect-input',
          collectType: 'speech'
        };
        
      case 'human-request':
        session.routedTo = 'human';
        return {
          message: 'I\'ll connect you with our student advisor team right away. Please hold.',
          action: 'transfer',
          transferTo: process.env.HUMAN_ADVISOR_NUMBER || '+61234567890'
        };
        
      case 'application-inquiry':
        session.routedTo = 'student-admin';
        return {
          message: 'Great! We have rolling admissions and no prerequisites required. I can help you start the application. Would you like me to schedule a consultation call?',
          action: 'collect-input',
          collectType: 'speech'
        };
        
      default:
        session.routedTo = 'student-admin';
        return {
          message: 'I\'m here to help with our tech bootcamp programs. Could you tell me more specifically what you\'re looking for?',
          action: 'collect-input',
          collectType: 'speech'
        };
    }
  }

  /**
   * Generate TwiML response from VoiceResponse
   */
  generateTwiML(response: VoiceResponse): string {
    let twiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';
    
    // Add the message
    twiml += `    <Say voice="alice">${response.message}</Say>\n`;
    
    switch (response.action) {
      case 'collect-input':
        if (response.collectType === 'speech') {
          twiml += `    <Record maxLength="30" transcribe="true" transcribeCallback="/api/voice/transcribe"/>\n`;
        } else if (response.collectType === 'dtmf') {
          twiml += `    <Gather input="dtmf" numDigits="1" timeout="10" action="/api/voice/process-input">\n`;
          if (response.options) {
            response.options.forEach((option, index) => {
              twiml += `        <Say>Press ${index + 1} for ${option}</Say>\n`;
            });
          }
          twiml += `    </Gather>\n`;
        }
        break;
        
      case 'transfer':
        if (response.transferTo) {
          twiml += `    <Dial>${response.transferTo}</Dial>\n`;
        }
        break;
        
      case 'hangup':
        twiml += `    <Hangup/>\n`;
        break;
    }
    
    twiml += '</Response>';
    return twiml;
  }

  /**
   * End call session
   */
  async endCallSession(callSid: string): Promise<void> {
    const session = this.activeCallSessions.get(callSid);
    if (session) {
      session.status = 'completed';
      session.endTime = new Date();
      
      console.log(`📞 Call ended: ${callSid}, Duration: ${this.getCallDuration(session)}s`);
      
      // Store call log in database (implement as needed)
      await this.logCall(session);
      
      // Clean up session after 1 hour
      setTimeout(() => {
        this.activeCallSessions.delete(callSid);
      }, 3600000);
    }
  }

  /**
   * Get call duration in seconds
   */
  private getCallDuration(session: CallSession): number {
    if (!session.endTime) return 0;
    return Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
  }

  /**
   * Log call to database
   */
  private async logCall(session: CallSession): Promise<void> {
    // TODO: Implement database logging
    console.log('📊 Call log:', {
      callSid: session.callSid,
      from: session.from,
      duration: this.getCallDuration(session),
      intent: session.intent,
      routedTo: session.routedTo,
      transcription: session.transcription?.substring(0, 100)
    });
  }

  /**
   * Convert Agent Decision to Voice Response
   */
  private convertDecisionToVoiceResponse(decision: any): VoiceResponse {
    switch (decision.action) {
      case 'answer-ai':
        return {
          message: decision.response || 'I can help you with that.',
          action: 'collect-input',
          collectType: 'speech'
        };
        
      case 'transfer-human':
        const transferNumbers: Record<string, string> = {
          enrollment: process.env.ENROLLMENT_TEAM_NUMBER || '+61234567891',
          technical: process.env.TECHNICAL_TEAM_NUMBER || '+61234567892',
          financial: process.env.FINANCIAL_TEAM_NUMBER || '+61234567893',
          general: process.env.HUMAN_ADVISOR_NUMBER || '+61234567890'
        };
        
        return {
          message: decision.response || 'Let me connect you with our team.',
          action: 'transfer',
          transferTo: transferNumbers[decision.transferTo || 'general']
        };
        
      case 'schedule-callback':
        return {
          message: decision.response || 'I can schedule a callback for you. What time works best?',
          action: 'collect-input',
          collectType: 'speech'
        };
        
      case 'escalate':
      case 'end-call':
        return {
          message: decision.response || 'Thank you for calling. Have a great day!',
          action: 'hangup'
        };
        
      default:
        return {
          message: 'Let me connect you with our student advisor team.',
          action: 'transfer',
          transferTo: process.env.HUMAN_ADVISOR_NUMBER || '+61234567890'
        };
    }
  }
  
  /**
   * Get conversation history for a call
   */
  private getCallHistory(callSid: string): Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date }> {
    return this.callHistories.get(callSid) || [];
  }
  
  /**
   * Add message to call history
   */
  private addToCallHistory(callSid: string, role: 'user' | 'assistant' | 'system', content: string): void {
    if (!this.callHistories.has(callSid)) {
      this.callHistories.set(callSid, []);
    }
    
    const history = this.callHistories.get(callSid)!;
    history.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Keep only last 10 messages to avoid memory bloat
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  /**
   * Get active call sessions
   */
  getActiveSessions(): CallSession[] {
    return Array.from(this.activeCallSessions.values());
  }

  /**
   * Make outbound call
   */
  async makeOutboundCall(to: string, message: string): Promise<string> {
    if (!twilioClient) {
      throw new Error('Twilio client not configured');
    }

    try {
      const call = await twilioClient.calls.create({
        to,
        from: process.env.TWILIO_PHONE_NUMBER!,
        twiml: `<Response><Say voice="alice">${message}</Say></Response>`
      });
      
      console.log(`📞 Outbound call created: ${call.sid}`);
      return call.sid;
    } catch (error) {
      console.error('Error making outbound call:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const voiceService = new TwilioVoiceService();