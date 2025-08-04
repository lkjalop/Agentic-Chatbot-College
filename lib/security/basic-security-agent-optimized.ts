/**
 * Optimized Basic Security Agent
 * Performance improvements and reduced redundancy
 */

import { cache } from '@/lib/utils/cache';
import fs from 'fs';
import path from 'path';

// Pre-compiled regex patterns for better performance
const PATTERNS = {
  // Critical PII patterns
  creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/,
  australianTFN: /\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/,
  usSSN: /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/,
  medicareNumber: /\b\d{4}[\s-]?\d{5}[\s-]?\d{1}[\s-]?\d{1}\b/,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/,
  
  // Crisis patterns - combined into single regex for performance
  crisis: /jump off a bridge|end it all|don't want to be here anymore|hurt(?:ing)? myself|kill myself|better off dead|nothing matters|want to disappear|thinking about.*hurt|\bsuicide\b|self.?harm|end my life/i,
  
  // Emotional distress - combined pattern
  distress: /\boverwhelmed\b|stressed out|don't know what to do|everything is hard|can't handle this|too much pressure/i,
  
  // Harassment
  harassment: /\b(hate|racist|sexist|discriminate)\b/i
};

// Pre-defined response templates
const SAFE_RESPONSES = {
  critical_pii_detected: "I noticed you shared sensitive personal information. For your security and privacy, I can't process this type of data. If you need to discuss personal details, I can connect you with a human advisor who can help you securely. Would you like me to arrange a callback?",
  security_threat_detected: "I can only assist with educational and career guidance. If you need to discuss something sensitive or complex, I can arrange for you to speak with a human counselor. How can I help you with your studies or career planning?",
  rate_limit_exceeded: "You're sending messages very quickly. If this is urgent and you need immediate assistance, I can connect you with a human advisor. Otherwise, please wait a moment before continuing.",
  compliance_concern: "I want to make sure I handle your information properly according to privacy laws. For questions involving personal data or complex situations, I can connect you with a human advisor who can assist you directly. Would you like to book a session with one of our counselors?",
  crisis_intervention: "I'm concerned about what you've shared and want to make sure you're safe. Please reach out to someone right now - a trusted friend, family member, or crisis hotline. If you're in immediate danger, please call emergency services or a crisis hotline like 988 (Suicide & Crisis Lifeline) or Lifeline at 13 11 14 in Australia. Please consider speaking with a counselor or mental health professional. Your safety is the most important thing right now.",
  emotional_support_needed: "It sounds like you're going through a challenging time right now. Many students feel this way when considering career changes - you're not alone in feeling overwhelmed. It might be helpful to talk through your concerns with our student success coordinator before making any big decisions. Would you prefer to start with a brief 15-minute check-in call instead of a full consultation?"
};

export class BasicSecurityAgent {
  private logFile: string;
  private logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logsDir, 'security-events.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Optimized quick security scan
   */
  async quickScan(input: {
    content: string;
    channel: 'chat' | 'voice' | 'api';
    sessionId: string;
    userId?: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    safeContent?: string;
    flags: string[];
  }> {
    const flags: string[] = [];
    
    // 1. Rate limit check (fastest)
    const rateLimitResult = await this.checkRateLimit(input.sessionId);
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        safeContent: SAFE_RESPONSES.rate_limit_exceeded,
        flags: ['rate_limited']
      };
    }

    // 2. Combined pattern matching for efficiency
    const detectionResult = this.performCombinedDetection(input.content);
    
    if (detectionResult.blocked) {
      this.logSecurityEvent({
        timestamp: new Date(),
        channel: input.channel,
        sessionId: input.sessionId,
        userId: input.userId,
        blocked: true,
        reason: detectionResult.reason,
        flags: detectionResult.flags,
        humanEscalation: detectionResult.humanEscalation
      });

      return {
        allowed: false,
        reason: detectionResult.reason,
        safeContent: SAFE_RESPONSES[detectionResult.reason as keyof typeof SAFE_RESPONSES] || SAFE_RESPONSES.compliance_concern,
        flags: detectionResult.humanEscalation ? [...detectionResult.flags, 'human_escalation'] : detectionResult.flags
      };
    }

    // Log successful scan
    this.logSecurityEvent({
      timestamp: new Date(),
      channel: input.channel,
      sessionId: input.sessionId,
      userId: input.userId,
      blocked: false,
      reason: '',
      flags: detectionResult.flags,
      humanEscalation: false
    });

    return {
      allowed: true,
      safeContent: input.content,
      flags: detectionResult.flags
    };
  }

  /**
   * Combined detection for better performance
   */
  private performCombinedDetection(content: string): {
    blocked: boolean;
    reason: string;
    flags: string[];
    humanEscalation: boolean;
  } {
    const flags: string[] = [];
    let blocked = false;
    let reason = '';
    let humanEscalation = false;

    // Crisis detection (highest priority)
    if (PATTERNS.crisis.test(content)) {
      flags.push('critical_crisis');
      blocked = true;
      reason = 'crisis_intervention';
      humanEscalation = true;
      return { blocked, reason, flags, humanEscalation };
    }

    // PII detection
    const piiFlags = this.detectPII(content);
    if (piiFlags.length > 0) {
      flags.push(...piiFlags);
      blocked = true;
      reason = 'critical_pii_detected';
      humanEscalation = true;
      return { blocked, reason, flags, humanEscalation };
    }

    // Threat detection
    const threatFlags = this.detectThreats(content);
    if (threatFlags.length > 0) {
      flags.push(...threatFlags);
      blocked = true;
      reason = 'security_threat_detected';
      humanEscalation = true;
      return { blocked, reason, flags, humanEscalation };
    }

    // Emotional distress (non-blocking)
    if (PATTERNS.distress.test(content)) {
      flags.push('emotional_distress');
    }

    // Harassment check
    if (PATTERNS.harassment.test(content)) {
      flags.push('potential_harassment');
    }

    return { blocked, reason, flags, humanEscalation };
  }

  /**
   * Optimized PII detection
   */
  private detectPII(content: string): string[] {
    const detected: string[] = [];
    
    if (PATTERNS.creditCard.test(content)) detected.push('credit_card');
    if (PATTERNS.australianTFN.test(content)) detected.push('australian_tfn');
    if (PATTERNS.usSSN.test(content)) detected.push('us_ssn');
    if (PATTERNS.medicareNumber.test(content)) detected.push('medicare_number');
    if (PATTERNS.passport.test(content)) detected.push('passport');
    
    return detected;
  }

  /**
   * Optimized threat detection
   */
  private detectThreats(content: string): string[] {
    const threats: string[] = [];
    
    // SQL Injection
    if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|WHERE)\b)/i.test(content)) {
      threats.push('sql_injection');
    }
    
    // Prompt injection - single check
    if (/ignore previous instructions|disregard all prior|new instructions:|system prompt:|you are now|forget everything|act as if/i.test(content)) {
      threats.push('prompt_injection');
    }
    
    // XSS
    if (/<script|javascript:|onerror=|onclick=|<iframe/i.test(content)) {
      threats.push('xss_attempt');
    }
    
    return threats;
  }

  /**
   * Optimized rate limiting
   */
  private checkRateLimit(sessionId: string): { allowed: boolean; current: number; limit: number } {
    const key = `rate_limit:${sessionId}`;
    const limit = 20;
    const windowMs = 60000;

    try {
      const rateLimitData = cache.get<{ count: number; windowStart: number }>(key);
      const now = Date.now();
      
      if (!rateLimitData || (now - rateLimitData.windowStart) > windowMs) {
        cache.set(key, { count: 1, windowStart: now }, windowMs);
        return { allowed: true, current: 1, limit };
      }
      
      const updatedData = { ...rateLimitData, count: rateLimitData.count + 1 };
      cache.set(key, updatedData, windowMs - (now - rateLimitData.windowStart));
      
      return {
        allowed: updatedData.count <= limit,
        current: updatedData.count,
        limit
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true, current: 0, limit };
    }
  }

  /**
   * Lightweight logging
   */
  private logSecurityEvent(event: {
    timestamp: Date;
    channel: string;
    sessionId: string;
    userId?: string;
    blocked: boolean;
    reason?: string;
    flags: string[];
    humanEscalation?: boolean;
  }) {
    try {
      if (event.blocked) {
        const logEntry = {
          ...event,
          timestamp: event.timestamp.toISOString()
        };
        
        // Async write to avoid blocking
        fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n', () => {});
        
        // Update cache metrics
        const today = new Date().toISOString().split('T')[0];
        const blockedKey = `security:blocked:${today}`;
        const currentCount = cache.get<number>(blockedKey) || 0;
        cache.set(blockedKey, currentCount + 1, 86400000);
      }
    } catch (error) {
      console.error('Security logging failed:', error);
    }
  }

  /**
   * Get basic security metrics
   */
  getSecurityMetrics(): {
    blockedToday: number;
    recentEvents: any[];
    flagsCounts: Record<string, number>;
  } {
    try {
      const today = new Date().toISOString().split('T')[0];
      const blockedToday = cache.get<number>(`security:blocked:${today}`) || 0;
      const recentEvents = cache.get<any[]>('security:recent_events') || [];

      const flagsCounts: Record<string, number> = {};
      recentEvents.forEach(event => {
        event.flags?.forEach((flag: string) => {
          flagsCounts[flag] = (flagsCounts[flag] || 0) + 1;
        });
      });

      return {
        blockedToday,
        recentEvents: recentEvents.slice(0, 10),
        flagsCounts
      };
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      return {
        blockedToday: 0,
        recentEvents: [],
        flagsCounts: {}
      };
    }
  }
}