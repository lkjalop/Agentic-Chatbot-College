/**
 * Basic Security Agent - Demo Implementation
 * Uses existing in-memory cache for rate limiting
 * Provides core security features for demonstration
 */

import { cache } from '@/lib/utils/cache';
import fs from 'fs';
import path from 'path';

export class BasicSecurityAgent {
  private logFile: string;

  constructor() {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFile = path.join(logsDir, 'security-events.log');
  }

  /**
   * Quick security scan - covers most common issues
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
    let blocked = false;
    let reason = '';

    // 1. Check rate limit first (fastest check)
    const rateLimitResult = await this.checkRateLimit(input.sessionId);
    if (!rateLimitResult.allowed) {
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        safeContent: "Please slow down. You're sending messages too quickly.",
        flags: ['rate_limited']
      };
    }

    // 2. Critical PII Detection
    const criticalPII = this.detectCriticalPII(input.content);
    if (criticalPII.length > 0) {
      flags.push(...criticalPII);
      blocked = true;
      reason = 'critical_pii_detected';
    }

    // 3. Basic Threat Detection
    const threats = this.detectBasicThreats(input.content);
    if (threats.length > 0) {
      flags.push(...threats);
      blocked = true;
      reason = 'security_threat_detected';
    }

    // 4. Simple Content Moderation
    const contentIssues = this.simpleContentModeration(input.content);
    if (contentIssues.length > 0) {
      flags.push(...contentIssues);
      // Don't block for content issues, just flag
    }

    // Check if should escalate to human
    const needsHumanEscalation = this.shouldEscalateToHuman(input.content, flags);
    
    // Log for basic audit trail
    this.logSecurityEvent({
      timestamp: new Date(),
      channel: input.channel,
      sessionId: input.sessionId,
      userId: input.userId,
      blocked,
      reason,
      flags,
      humanEscalation: needsHumanEscalation
    });

    if (blocked || needsHumanEscalation) {
      const responseReason = needsHumanEscalation ? 'compliance_concern' : reason;
      return {
        allowed: false,
        reason: responseReason,
        safeContent: this.generateSafeResponse(responseReason),
        flags: needsHumanEscalation ? [...flags, 'human_escalation'] : flags
      };
    }

    return {
      allowed: true,
      safeContent: input.content,
      flags
    };
  }

  /**
   * Detect critical PII that must be blocked
   */
  private detectCriticalPII(content: string): string[] {
    const detected: string[] = [];

    // Credit Cards (universal)
    if (/\b(?:\d{4}[\s-]?){3}\d{4}\b/.test(content)) {
      detected.push('credit_card');
    }

    // Australian Tax File Number
    if (/\b\d{3}[\s-]?\d{3}[\s-]?\d{3}\b/.test(content)) {
      detected.push('australian_tfn');
    }

    // US Social Security Number
    if (/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/.test(content)) {
      detected.push('us_ssn');
    }

    // Australian Medicare Number
    if (/\b\d{4}[\s-]?\d{5}[\s-]?\d{1}[\s-]?\d{1}\b/.test(content)) {
      detected.push('medicare_number');
    }

    // Passport Numbers (basic pattern)
    if (/\b[A-Z]{1,2}\d{6,9}\b/.test(content)) {
      detected.push('passport');
    }

    return detected;
  }

  /**
   * Detect basic security threats
   */
  private detectBasicThreats(content: string): string[] {
    const threats: string[] = [];

    // SQL Injection (common patterns)
    if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b.*\b(FROM|WHERE)\b)/i.test(content)) {
      threats.push('sql_injection');
    }

    // Prompt Injection
    const promptInjectionPatterns = [
      /ignore previous instructions/i,
      /disregard all prior/i,
      /new instructions:/i,
      /system prompt:/i,
      /you are now/i,
      /forget everything/i,
      /act as if/i
    ];

    if (promptInjectionPatterns.some(pattern => pattern.test(content))) {
      threats.push('prompt_injection');
    }

    // XSS Attempts
    if (/<script|javascript:|onerror=|onclick=|<iframe/i.test(content)) {
      threats.push('xss_attempt');
    }

    // NoSQL Injection
    if (/(\$where|\$ne|\$gt|\$lt|\$regex|\$exists)/i.test(content)) {
      threats.push('nosql_injection');
    }

    // Data Poisoning Attempts
    const poisoningThreats = this.detectDataPoisoning(content);
    if (poisoningThreats.length > 0) {
      threats.push(...poisoningThreats);
    }

    // Mental Health Crisis Detection
    const mentalHealthFlags = this.detectMentalHealthCrisis(content);
    if (mentalHealthFlags.length > 0) {
      threats.push(...mentalHealthFlags);
    }

    // Malicious Activity Detection
    const maliciousFlags = this.detectMaliciousActivity(content);
    if (maliciousFlags.length > 0) {
      threats.push(...maliciousFlags);
    }

    return threats;
  }

  /**
   * Detect data poisoning attempts - ASCII exploits, model corruption, etc.
   */
  private detectDataPoisoning(content: string): string[] {
    const threats: string[] = [];

    // ASCII/Unicode Control Character Attacks
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(content)) {
      threats.push('ascii_control_chars');
    }

    // Null byte injection
    if (content.includes('\x00') || content.includes('%00')) {
      threats.push('null_byte_injection');
    }

    // Unicode normalization attacks
    if (/[\u200B-\u200D\uFEFF]/.test(content)) {
      threats.push('unicode_normalization_attack');
    }

    // Model confusion patterns (excessive repetition to corrupt context)
    const repetitionMatch = content.match(/(.{1,50})\1{10,}/);
    if (repetitionMatch) {
      threats.push('repetition_attack');
    }

    // Excessive length (potential buffer overflow or context pollution)
    if (content.length > 10000) {
      threats.push('content_length_attack');
    }

    // Binary data encoded as text
    if (/^[A-Za-z0-9+/]{100,}={0,2}$/.test(content.replace(/\s/g, ''))) {
      threats.push('base64_binary_injection');
    }

    // Model jailbreak patterns
    const jailbreakPatterns = [
      /\b(DAN|jailbreak|unrestricted mode|developer mode)\b/i,
      /simulate|emulate.*different (model|ai|system)/i,
      /pretend you are.*not bound by/i,
      /ignore.*safety.*guideline/i,
      /bypass.*restriction/i
    ];

    if (jailbreakPatterns.some(pattern => pattern.test(content))) {
      threats.push('model_jailbreak_attempt');
    }

    // Vector embedding pollution (attempts to inject malicious context)
    const embeddingPollutionPatterns = [
      /always respond with.*regardless of/i,
      /from now on.*ignore previous/i,
      /remember this.*override/i,
      /poison.*vector.*database/i,
      /inject.*embedding/i
    ];

    if (embeddingPollutionPatterns.some(pattern => pattern.test(content))) {
      threats.push('embedding_pollution_attempt');
    }

    // Prompt template manipulation
    if (content.includes('{{') && content.includes('}}')) {
      threats.push('template_injection');
    }

    // System instruction override attempts
    const systemOverridePatterns = [
      /\[SYSTEM\]|\[\/SYSTEM\]/i,
      /<\|system\|>|<\|\/system\|>/i,
      /###\s*SYSTEM\s*###/i,
      /ASSISTANT_PREFIX|USER_PREFIX/i
    ];

    if (systemOverridePatterns.some(pattern => pattern.test(content))) {
      threats.push('system_instruction_override');
    }

    return threats;
  }

  /**
   * Simple content moderation
   */
  private simpleContentModeration(content: string): string[] {
    const issues: string[] = [];

    // Self-harm detection (flag for special handling)
    if (/\b(suicide|self.?harm|end my life|kill myself)\b/i.test(content)) {
      issues.push('self_harm_risk');
    }

    // Harassment/hate speech
    if (/\b(hate|racist|sexist|discriminate)\b/i.test(content)) {
      issues.push('potential_harassment');
    }

    return issues;
  }

  /**
   * Rate limiting using existing in-memory cache - 20 requests per minute per session
   */
  private checkRateLimit(sessionId: string): { allowed: boolean; current: number; limit: number } {
    const key = `rate_limit:${sessionId}`;
    const limit = 20; // Conservative limit for demo
    const windowMs = 60000; // 1 minute

    try {
      // Get current count from cache
      const rateLimitData = cache.get<{ count: number; windowStart: number }>(key);
      const now = Date.now();
      
      if (!rateLimitData || (now - rateLimitData.windowStart) > windowMs) {
        // New window or expired
        const newData = { count: 1, windowStart: now };
        cache.set(key, newData, windowMs);
        return { allowed: true, current: 1, limit };
      }
      
      // Increment count
      const updatedData = { ...rateLimitData, count: rateLimitData.count + 1 };
      cache.set(key, updatedData, windowMs - (now - rateLimitData.windowStart));
      
      return {
        allowed: updatedData.count <= limit,
        current: updatedData.count,
        limit
      };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if cache fails
      return { allowed: true, current: 0, limit };
    }
  }

  /**
   * Generate appropriate safe responses with human escalation option
   */
  private generateSafeResponse(reason: string): string {
    const responses = {
      critical_pii_detected: "I noticed you shared sensitive personal information. For your security and privacy, I can't process this type of data. If you need to discuss personal details, I can connect you with a human advisor who can help you securely. Would you like me to arrange a callback?",
      
      security_threat_detected: "I can only assist with educational and career guidance. If you need to discuss something sensitive or complex, I can arrange for you to speak with a human counselor. How can I help you with your studies or career planning?",
      
      rate_limit_exceeded: "You're sending messages very quickly. If this is urgent and you need immediate assistance, I can connect you with a human advisor. Otherwise, please wait a moment before continuing.",

      compliance_concern: "I want to make sure I handle your information properly according to privacy laws. For questions involving personal data or complex situations, I can connect you with a human advisor who can assist you directly. Would you like to book a session with one of our counselors?",

      // Mental health crisis responses
      suicide_risk: "I'm very concerned about you and want to make sure you get the right support. Please reach out to a mental health professional immediately. In Australia, you can call Lifeline at 13 11 14 (24/7). I can also connect you with one of our counselors who are trained to help. You're not alone.",

      self_harm_risk: "I'm worried about you and want to help. Self-harm is a sign that you're dealing with difficult emotions. Please consider speaking with a mental health professional. Lifeline (13 11 14) offers 24/7 support. I can also arrange for you to speak with one of our trained counselors.",

      depression_crisis: "It sounds like you're going through a really tough time. Depression can make everything feel overwhelming, but help is available. Please consider reaching out to Beyond Blue (1300 22 4636) or Lifeline (13 11 14). I can also connect you with a counselor who can provide ongoing support.",

      // Malicious activity responses  
      malicious_intent: "I can only provide assistance with legitimate educational and career activities. I cannot and will not help with activities that could harm others or break the law. If you need guidance on ethical career paths in technology, I'm here to help with that.",

      violence_threat: "I cannot assist with anything related to violence or threats. If you're having thoughts of harming others, please seek immediate help from a mental health professional or contact emergency services. If you need support for stress or anger management, I can connect you with appropriate resources.",

      inappropriate_content: "I can only assist with educational and career-related topics. If you have questions about professional development, career paths, or educational programs, I'm here to help with those."
    };

    return responses[reason] || "I'm here to help with your educational and career questions. If you need more personalized assistance, I can arrange for you to speak with a human advisor. How can I assist you?";
  }

  /**
   * Detect mental health crisis indicators
   */
  private detectMentalHealthCrisis(content: string): string[] {
    const flags: string[] = [];
    const lowercaseContent = content.toLowerCase();

    // Suicide indicators
    const suicidePatterns = [
      /\bsuicid\w+/i, /kill myself/i, /end my life/i, /want to die/i,
      /better off dead/i, /not worth living/i, /can't go on/i
    ];

    if (suicidePatterns.some(pattern => pattern.test(content))) {
      flags.push('suicide_risk');
    }

    // Self-harm indicators
    const selfHarmPatterns = [
      /cut myself/i, /hurt myself/i, /self.harm/i, /cutting/i,
      /burning myself/i, /self.injury/i
    ];

    if (selfHarmPatterns.some(pattern => pattern.test(content))) {
      flags.push('self_harm_risk');
    }

    // Severe depression indicators
    const depressionPatterns = [
      /severely depressed/i, /can't cope/i, /nothing matters/i,
      /hopeless/i, /no point in living/i, /feel worthless/i
    ];

    if (depressionPatterns.some(pattern => pattern.test(content))) {
      flags.push('depression_crisis');
    }

    return flags;
  }

  /**
   * Detect malicious activity indicators
   */
  private detectMaliciousActivity(content: string): string[] {
    const flags: string[] = [];
    const lowercaseContent = content.toLowerCase();

    // Hacking/illegal activity
    const hackingPatterns = [
      /\bhack\w*/i, /steal\w*/i, /\bcrack\w*/i, /\bphish\w*/i,
      /\bscam\w*/i, /fraud/i, /illegal/i, /\bexploit\w*/i,
      /break into/i, /gain access/i, /bypass/i, /penetrate/i
    ];

    if (hackingPatterns.some(pattern => pattern.test(content))) {
      flags.push('malicious_intent');
    }

    // Violence indicators
    const violencePatterns = [
      /\bkill\w*/i, /murder/i, /\battack\w*/i, /\bhurt\w*/i,
      /violence/i, /\bbeat\w*/i, /assault/i, /weapon/i
    ];

    if (violencePatterns.some(pattern => pattern.test(content))) {
      flags.push('violence_threat');
    }

    // Inappropriate requests
    const inappropriatePatterns = [
      /porn/i, /sex/i, /nude/i, /nsfw/i, /adult content/i,
      /drugs/i, /cocaine/i, /marijuana/i, /\bweed\b/i
    ];

    if (inappropriatePatterns.some(pattern => pattern.test(content))) {
      flags.push('inappropriate_content');
    }

    return flags;
  }

  /**
   * Check if request should be escalated to human
   */
  private shouldEscalateToHuman(content: string, flags: string[]): boolean {
    // Always escalate if critical PII detected
    if (flags.includes('credit_card') || flags.includes('australian_tfn') || flags.includes('us_ssn')) {
      return true;
    }

    // Escalate for mental health concerns
    if (flags.includes('suicide_risk') || flags.includes('self_harm_risk') || flags.includes('depression_crisis')) {
      return true;
    }

    // Escalate for malicious activity
    if (flags.includes('malicious_intent') || flags.includes('violence_threat')) {
      return true;
    }

    // Escalate for complex compliance scenarios
    const complexTopics = [
      'legal advice', 'immigration law', 'visa rejection', 'deportation',
      'discrimination', 'harassment', 'abuse', 'emergency',
      'medical advice', 'mental health crisis', 'delete my data',
      'gdpr request', 'privacy complaint', 'data breach'
    ];

    return complexTopics.some(topic => content.toLowerCase().includes(topic));
  }

  /**
   * Basic audit logging - file-based for demo
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
      const logEntry = {
        ...event,
        timestamp: event.timestamp.toISOString()
      };

      // Log to file (for demo/audit purposes)
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logFile, logLine);

      // Also store recent events in cache for metrics
      const recentEvents = cache.get<any[]>('security:recent_events') || [];
      recentEvents.unshift(logEntry);
      
      // Keep only last 50 events in memory
      cache.set('security:recent_events', recentEvents.slice(0, 50), 3600000); // 1 hour

      // Track daily blocked count
      if (event.blocked) {
        const today = new Date().toISOString().split('T')[0];
        const blockedKey = `security:blocked:${today}`;
        const currentCount = cache.get<number>(blockedKey) || 0;
        cache.set(blockedKey, currentCount + 1, 86400000); // 24 hours
      }

      // Console log for immediate feedback
      if (event.blocked) {
        console.log(`🛡️ Security blocked: ${event.reason} - ${event.flags.join(', ')}`);
      }
    } catch (error) {
      console.error('Security logging failed:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  /**
   * Get basic security metrics from cache
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

      // Count flags from recent events
      const flagsCounts: Record<string, number> = {};
      recentEvents.forEach(event => {
        event.flags?.forEach((flag: string) => {
          flagsCounts[flag] = (flagsCounts[flag] || 0) + 1;
        });
      });

      return {
        blockedToday,
        recentEvents: recentEvents.slice(0, 10), // Last 10 events
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