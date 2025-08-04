/**
 * Response Validation Pipeline
 * Ensures all AI responses meet safety and quality standards
 * Implements the Claude Code Configuration safety protocol
 */

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
   * Validate and sanitize AI response according to safety protocol
   */
  validateResponse(
    response: string, 
    context: ValidationContext
  ): ResponseValidationResult {
    const violations: string[] = [];
    let sanitizedResponse = response;
    let responseType: ResponseValidationResult['responseType'] = 'normal';
    let requiresHumanEscalation = false;

    // 1. CRITICAL: Remove any staff name references
    sanitizedResponse = this.removeStaffNames(sanitizedResponse, violations);

    // 2. CRITICAL: Remove persona name contamination
    sanitizedResponse = this.removePersonaNames(sanitizedResponse, violations);

    // 3. Ensure professional tone and appropriate references
    sanitizedResponse = this.ensureProfessionalReferences(sanitizedResponse, violations);

    // 4. Check for required consultation elements (as per protocol)
    const consultationResult = this.validateConsultationElements(sanitizedResponse, context);
    if (!consultationResult.isValid) {
      violations.push(...consultationResult.violations);
      sanitizedResponse = consultationResult.enhancedResponse;
    }

    // 5. Detect if this is a crisis/emotional support response
    if (context.securityFlags?.includes('critical_crisis')) {
      responseType = 'crisis';
      requiresHumanEscalation = true;
    } else if (context.securityFlags?.includes('emotional_distress')) {
      responseType = 'emotional_support';
    }

    // 6. Ensure response personalization without persona contamination
    sanitizedResponse = this.ensureProperPersonalization(sanitizedResponse, context, violations);

    // 7. Final quality check
    const qualityResult = this.validateResponseQuality(sanitizedResponse);
    if (!qualityResult.isValid) {
      violations.push(...qualityResult.violations);
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
   * Remove specific staff names and replace with generic titles
   */
  private removeStaffNames(response: string, violations: string[]): string {
    const staffNames = ['Kevin', 'kevin'];
    let sanitized = response;
    
    for (const name of staffNames) {
      const regex = new RegExp(`\\b${name}\\b`, 'gi');
      if (regex.test(sanitized)) {
        violations.push(`staff_name_reference: ${name}`);
        sanitized = sanitized.replace(regex, 'our student success coordinator');
      }
    }

    return sanitized;
  }

  /**
   * Remove persona names that might be used to address the user
   */
  private removePersonaNames(response: string, violations: string[]): string {
    const personaNames = [
      'Rohan', 'Rohan Patel',
      'Li', 'Li Wen', 
      'Hanh', 'Hanh Nguyen',
      'Tyler', 'Tyler Brooks',
      'Priya', 'Priya Singh',
      'Sadia', 'Sadia Rahman',
      'Sandeep', 'Sandeep Shrestha',
      'Kwame', 'Kwame Mensah'
    ];
    
    let sanitized = response;
    
    for (const name of personaNames) {
      // Check if persona name is being used to address the user
      const addressPatterns = [
        new RegExp(`\\bHi ${name}\\b`, 'gi'),
        new RegExp(`\\bHey ${name}\\b`, 'gi'),
        new RegExp(`\\b${name},`, 'gi'),
        new RegExp(`^${name}\\b`, 'gi') // At start of response
      ];
      
      for (const pattern of addressPatterns) {
        if (pattern.test(sanitized)) {
          violations.push(`persona_name_addressing: ${name}`);
          sanitized = sanitized.replace(pattern, (match) => {
            if (match.startsWith('Hi ') || match.startsWith('Hey ')) {
              return match.replace(name, '').trim() + '!';
            }
            return 'Hi!';
          });
        }
      }
    }

    return sanitized;
  }

  /**
   * Ensure professional references are used instead of specific names
   */
  private ensureProfessionalReferences(response: string, violations: string[]): string {
    let sanitized = response;
    
    // Replace common problematic phrases
    const replacements = {
      'the person who built this system': 'our development team',
      'the developer': 'our technical team',
      'my creator': 'our development team',
      'the admin': 'our support team'
    };

    for (const [problematic, replacement] of Object.entries(replacements)) {
      const regex = new RegExp(problematic, 'gi');
      if (regex.test(sanitized)) {
        violations.push(`unprofessional_reference: ${problematic}`);
        sanitized = sanitized.replace(regex, replacement);
      }
    }

    return sanitized;
  }

  /**
   * Validate consultation booking elements as per protocol
   */
  private validateConsultationElements(
    response: string, 
    context: ValidationContext
  ): { isValid: boolean; violations: string[]; enhancedResponse: string } {
    const violations: string[] = [];
    let enhancedResponse = response;

    // Check if this is a booking/consultation response
    const isBookingRelated = /book|consultation|appointment|meeting|chat|speak|talk.*advisor/i.test(response);
    
    if (isBookingRelated) {
      // Should mention meeting type and preparation
      if (!/30.?min|45.?min|15.?min/i.test(response)) {
        violations.push('missing_meeting_duration');
      }
      
      // Should have preparation/expectation setting
      if (!/what we'll cover|preparation|review|discuss/i.test(response)) {
        violations.push('missing_consultation_preparation');
        enhancedResponse += "\n\nDuring this consultation, our academic advisor will help you understand program requirements, career paths, and determine if this direction aligns with your goals.";
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      enhancedResponse
    };
  }

  /**
   * Ensure proper personalization without persona contamination
   */
  private ensureProperPersonalization(
    response: string, 
    context: ValidationContext, 
    violations: string[]
  ): string {
    let sanitized = response;
    
    // If we have a real user session, ensure we use their actual name
    if (context.userSession?.user?.name) {
      const firstName = context.userSession.user.name.split(' ')[0];
      
      // Replace generic greetings with personalized ones if appropriate
      if (/^(Hi there|Hey there|Hello there)/i.test(sanitized)) {
        sanitized = sanitized.replace(/^(Hi there|Hey there|Hello there)/i, `Hi ${firstName}`);
      }
    } else {
      // For anonymous users, ensure we don't use persona names
      if (/Hi (Rohan|Li|Hanh|Tyler|Priya|Sadia|Sandeep|Kwame)/i.test(sanitized)) {
        violations.push('anonymous_user_addressed_by_persona_name');
        sanitized = sanitized.replace(/Hi (Rohan|Li|Hanh|Tyler|Priya|Sadia|Sandeep|Kwame)/i, 'Hi there');
      }
    }

    return sanitized;
  }

  /**
   * Validate response quality standards
   */
  private validateResponseQuality(response: string): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check minimum length (avoid too-short responses)
    if (response.trim().length < 20) {
      violations.push('response_too_short');
    }

    // Check maximum length (avoid overwhelming responses)
    if (response.length > 1000) {
      violations.push('response_too_long');
    }

    // Check for appropriate tone indicators (allow responses without sentence endings for fragments)
    if (response.trim().length > 30 && !/[.!?]$/.test(response.trim())) {
      violations.push('missing_sentence_ending');
    }

    // Check for unprofessional language
    const unprofessionalPatterns = [
      /\bwtf\b/i,
      /\bomg\b/i,
      /\blol\b/i,
      /\bbtw\b/i,
      /\bikr\b/i
    ];

    if (unprofessionalPatterns.some(pattern => pattern.test(response))) {
      violations.push('unprofessional_language');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Quick validation for crisis responses
   */
  validateCrisisResponse(response: string): boolean {
    const requiredElements = [
      /concern|worried|safety/i,  // Shows concern
      /reach out|contact|call/i,  // Provides action
      /crisis|lifeline|emergency/i // Mentions resources
    ];

    return requiredElements.every(pattern => pattern.test(response));
  }

  /**
   * Validate emotional support responses
   */
  validateEmotionalSupportResponse(response: string): boolean {
    const supportiveElements = [
      /understand|feel|challenging|difficult/i, // Acknowledges feelings
      /many students|not alone|normal/i,        // Normalizes experience
      /help|support|chat|talk/i                 // Offers support
    ];

    return supportiveElements.some(pattern => pattern.test(response));
  }
}