/**
 * Optimized Response Validation Pipeline
 * Reduced redundancy and improved performance
 */

// Pre-compiled patterns for performance
const VALIDATION_PATTERNS = {
  staffNames: /\b(Kevin|kevin)\b/gi,
  personaGreetings: /\b(Hi|Hey|Hello)\s+(Rohan|Li|Hanh|Tyler|Priya|Sadia|Sandeep|Kwame)\b/gi,
  bookingRelated: /book|consultation|appointment|meeting|chat|speak|talk.*advisor/i,
  meetingDuration: /30.?min|45.?min|15.?min/i,
  preparationContent: /what we'll cover|preparation|review|discuss/i,
  genericGreetings: /^(Hi there|Hey there|Hello there)/i,
  unprofessional: /\b(wtf|omg|lol|btw|ikr)\b/i
};

// Pre-defined replacements
const TEXT_REPLACEMENTS = {
  'the person who built this system': 'our development team',
  'the developer': 'our technical team',
  'my creator': 'our development team',
  'the admin': 'our support team'
};

export interface ResponseValidationResult {
  isValid: boolean;
  sanitizedResponse: string;
  violations: string[];
  requiresHumanEscalation?: boolean;
  responseType: 'normal' | 'crisis' | 'emotional_support' | 'blocked';
}

export interface ValidationContext {
  originalQuery: string;
  userSession?: any;
  conversationHistory?: any[];
  securityFlags?: string[];
}

export class ResponseValidator {
  
  /**
   * Optimized validation with single pass through response
   */
  validateResponse(
    response: string, 
    context: ValidationContext
  ): ResponseValidationResult {
    const violations: string[] = [];
    let sanitizedResponse = response;
    
    // Determine response type early
    const responseType = this.determineResponseType(context.securityFlags);
    const requiresHumanEscalation = responseType === 'crisis';

    // Single pass sanitization
    sanitizedResponse = this.performSanitization(sanitizedResponse, violations, context);

    // Quality validation (only if not crisis)
    if (responseType !== 'crisis') {
      this.validateQuality(sanitizedResponse, violations);
    }

    return {
      isValid: violations.length === 0,
      sanitizedResponse,
      violations,
      requiresHumanEscalation,
      responseType
    };
  }

  /**
   * Perform all sanitization in a single pass
   */
  private performSanitization(
    response: string, 
    violations: string[], 
    context: ValidationContext
  ): string {
    let sanitized = response;

    // 1. Staff names (Kevin -> coordinator)
    sanitized = sanitized.replace(VALIDATION_PATTERNS.staffNames, (match) => {
      violations.push(`staff_name_reference: ${match}`);
      return 'our student success coordinator';
    });

    // 2. Persona greetings removal
    sanitized = sanitized.replace(VALIDATION_PATTERNS.personaGreetings, (match, greeting, name) => {
      violations.push(`persona_name_addressing: ${name}`);
      return `${greeting}!`;
    });

    // 3. Professional references
    for (const [problematic, replacement] of Object.entries(TEXT_REPLACEMENTS)) {
      if (sanitized.includes(problematic)) {
        violations.push(`unprofessional_reference: ${problematic}`);
        sanitized = sanitized.replace(new RegExp(problematic, 'gi'), replacement);
      }
    }

    // 4. User personalization (if logged in)
    if (context.userSession?.user?.name && VALIDATION_PATTERNS.genericGreetings.test(sanitized)) {
      const firstName = context.userSession.user.name.split(' ')[0];
      sanitized = sanitized.replace(VALIDATION_PATTERNS.genericGreetings, `Hi ${firstName}`);
    }

    // 5. Booking validation and enhancement
    if (VALIDATION_PATTERNS.bookingRelated.test(sanitized)) {
      if (!VALIDATION_PATTERNS.meetingDuration.test(sanitized)) {
        violations.push('missing_meeting_duration');
      }
      if (!VALIDATION_PATTERNS.preparationContent.test(sanitized)) {
        violations.push('missing_consultation_preparation');
        sanitized += "\n\nDuring this consultation, our academic advisor will help you understand program requirements, career paths, and determine if this direction aligns with your goals.";
      }
    }

    return sanitized;
  }

  /**
   * Determine response type from security flags
   */
  private determineResponseType(flags?: string[]): ResponseValidationResult['responseType'] {
    if (!flags || flags.length === 0) return 'normal';
    
    if (flags.includes('critical_crisis')) return 'crisis';
    if (flags.includes('emotional_distress')) return 'emotional_support';
    if (flags.some(f => f.includes('blocked'))) return 'blocked';
    
    return 'normal';
  }

  /**
   * Lightweight quality validation
   */
  private validateQuality(response: string, violations: string[]): void {
    const length = response.trim().length;
    
    if (length < 20) violations.push('response_too_short');
    if (length > 1000) violations.push('response_too_long');
    if (length > 30 && !/[.!?]$/.test(response.trim())) violations.push('missing_sentence_ending');
    if (VALIDATION_PATTERNS.unprofessional.test(response)) violations.push('unprofessional_language');
  }

  /**
   * Quick validation for specific response types
   */
  validateCrisisResponse(response: string): boolean {
    return /concern|worried|safety/i.test(response) &&
           /reach out|contact|call/i.test(response) &&
           /crisis|lifeline|emergency/i.test(response);
  }

  validateEmotionalSupportResponse(response: string): boolean {
    return /understand|feel|challenging|difficult/i.test(response) ||
           /many students|not alone|normal/i.test(response) ||
           /help|support|chat|talk/i.test(response);
  }
}