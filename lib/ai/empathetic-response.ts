import Groq from 'groq-sdk';
import { PersonaDetectionResult } from '@/lib/personas/persona-detector';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface EmpatheticResponseOptions {
  query: string;
  personaDetection: PersonaDetectionResult;
  searchResults: any[];
  conversationHistory?: any[];
}

export async function generateEmpatheticResponse({
  query,
  personaDetection,
  searchResults,
  conversationHistory = []
}: EmpatheticResponseOptions): Promise<string> {
  try {
    const systemPrompt = buildPersonaAwareSystemPrompt(personaDetection);
    const enhancedContext = buildEnhancedContext(searchResults, personaDetection);
    const userPrompt = buildPersonalizedUserPrompt(query, personaDetection);
    
    // Combine context with user prompt
    const fullUserPrompt = enhancedContext ? `${enhancedContext}\n\n${userPrompt}` : userPrompt;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-4), // Last 2 exchanges for context
        { role: 'user', content: fullUserPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8, // More conversational
      max_tokens: 300 // Much shorter responses
    });

    let response = completion.choices[0]?.message?.content || 
      'I understand you\'re looking for guidance. Let me help you with that.';

    // Post-process for persona-specific enhancements
    response = await enhanceResponseForPersona(response, personaDetection);

    // Ensure mandatory information is included
    response = ensureMandatoryInfo(response);

    return response;
  } catch (error) {
    console.error('Empathetic response generation error:', error);
    return generateFallbackResponse(personaDetection, query);
  }
}

function buildPersonaAwareSystemPrompt(detection: PersonaDetectionResult): string {
  const { persona, emotionalNeeds, journeyStage } = detection;
  
  let basePrompt = `You are a friendly course advisor at Employability Advantage helping people choose the right track from our 4 bootcamp options. Your goal is to match them with the perfect course and guide them toward enrollment or consultation.

4 COURSE TRACKS AVAILABLE:
- Business Analyst ($740 AUD): Agile, user stories, requirements, prototyping - perfect for career changers, no coding required
- Data & AI Analyst ($740 AUD): Python, SQL, dashboards, AI tools - for data-driven roles, some technical skills taught
- Cybersecurity ($740 AUD): AWS security, compliance, risk management - high demand, suitable for beginners
- Full Stack Developer ($740 AUD): Modern web development, frontend/backend - for those who want to build applications

PLUS: 6-week Live Industry Project ($790 AUD) - work on real client projects, cross-track collaboration

PRICING: $740 per track, $185/week payment plans, bundle for $1,430 (saves $100)

YOUR APPROACH:
- Read their question to understand which track(s) they're interested in
- Give specific info about the relevant track(s)
- If unsure, help them compare options
- Conversational tone (like talking to a friend)
- ALWAYS mention pricing ($740 AUD or $185/week payment plans)
- ALWAYS mention timeline (4 weeks)
- Always end with clear next step (book consultation or enroll)

CRITICAL: NEVER use persona names when addressing the user
- Use generic terms: "Hi!", "Hey there!", or no greeting at all
- Don't say "Hi Camila" or "Hey Sofia" - just say "Hi!" or "Hello!"
- Use background info for context but NOT for addressing them by name

MANDATORY: Every response MUST include:
1. Specific pricing: "$740 AUD" or "$185/week payment plans"
2. Timeline: "4 weeks" or "4-week bootcamp"
3. Clear next step: "book a consultation" or "enroll now"`;

  // Persona-specific context
  if (persona?.archetypeName) {
    if (persona.visaType === '485') {
      basePrompt += `\n\nTalking to someone on 485 visa - highlight fast entry to workforce, PR pathway potential.`;
    }
    if (persona.previousField && persona.previousField !== 'IT') {
      basePrompt += `\n\nThey're transitioning from ${persona.previousField} - show how their background is actually valuable.`;
    }
    if (persona?.archetypeName?.includes('Callum')) {
      basePrompt += `\n\nLocal Australian - emphasize they don't need uni degree, admin background is perfect.`;
    }
    if (persona?.archetypeName?.includes('Tyler')) {
      basePrompt += `\n\nRecent high school grad - show alternative to university, hands-on learning.`;
    }
  }

  // Next step guidance based on journey stage
  if (journeyStage === 'research' || journeyStage === 'awareness') {
    basePrompt += `\n\nEND WITH: Offer to book a quick chat with an advisor to get personalized advice.`;
  } else if (journeyStage === 'decision') {
    basePrompt += `\n\nEND WITH: Ask if they want to secure their spot or talk through any final concerns.`;
  } else {
    basePrompt += `\n\nEND WITH: Ask what their biggest question is right now.`;
  }

  return basePrompt;
}

function buildEnhancedContext(searchResults: any[], detection: PersonaDetectionResult): string {
  if (!searchResults.length) return '';
  
  // Extract key info from bootcamp Q&As
  let keyInfo = '';
  let successStories = '';
  let specificDetails = '';
  
  searchResults.forEach(result => {
    const content = result.content || '';
    
    // Extract pricing info
    if (content.includes('$740') || content.includes('$185')) {
      keyInfo += 'PRICING: $740 AUD total or $185/week payment plan available. ';
    }
    
    // Extract timeline info  
    if (content.includes('4 week') || content.includes('6 week')) {
      keyInfo += 'TIMELINE: 4-week bootcamp + optional 6-week industry project. ';
    }
    
    // Extract success stories
    if (content.includes('alumni') || content.includes('graduates') || content.includes('success')) {
      const match = content.match(/([^.]*(?:alumni|graduates|success)[^.]*\.)/i);
      if (match) {
        successStories += match[1] + ' ';
      }
    }
    
    // Extract specific outcomes/benefits
    if (content.includes('portfolio') || content.includes('job-ready') || content.includes('entry-level')) {
      const match = content.match(/([^.]*(?:portfolio|job-ready|entry-level)[^.]*\.)/i);
      if (match) {
        specificDetails += match[1] + ' ';
      }
    }
  });
  
  let context = '';
  if (keyInfo) context += `KEY INFO: ${keyInfo.trim()}\n`;
  if (successStories) context += `SUCCESS STORIES: ${successStories.trim()}\n`;
  if (specificDetails) context += `OUTCOMES: ${specificDetails.trim()}\n`;
  
  // Add raw content for additional context (first 2 results)
  const rawContent = searchResults.slice(0, 2).map(r => r.content?.substring(0, 200)).join(' ');
  if (rawContent) context += `\nADDITIONAL CONTEXT: ${rawContent}...`;
  
  return context;
}

function buildPersonalizedUserPrompt(query: string, detection: PersonaDetectionResult): string {
  let prompt = `STUDENT QUESTION: ${query}`;
  
  // Add persona context if detected (without using persona name)
  if (detection.confidence > 15) {
    prompt += `\n\nSTUDENT BACKGROUND DETECTED:`;
    if (detection.persona?.visaType) {
      prompt += ` ${detection.persona.visaType} visa holder`;
    }
    if (detection.persona?.previousField) {
      prompt += ` - Previous field: ${detection.persona.previousField}`;
    }
    if (detection.persona?.isRegional) {
      prompt += ` - Regional area student`;
    }
  }
  
  // Add emotional context
  if (detection.emotionalNeeds.length > 0) {
    prompt += `\n\nEMOTIONAL NEEDS: ${detection.emotionalNeeds.join(', ')}`;
  }
  
  prompt += `\n\nINSTRUCTIONS: Give a friendly, specific response using the bootcamp details and context provided. Keep it conversational and end with a clear next step.`;

  return prompt;
}

async function enhanceResponseForPersona(
  response: string, 
  detection: PersonaDetectionResult
): Promise<string> {
  let enhanced = response;
  
  // Add visa-specific encouragement
  if (detection.persona?.visaType === '485') {
    if (!enhanced.includes('485') && detection.confidence > 60) {
      enhanced += `\n\n💡 As a 485 visa holder, you have valuable time to build your tech career. Many students in your situation have successfully transitioned - you're on the right path!`;
    }
  }

  // Add regional advantages
  if (detection.persona?.isRegional && detection.confidence > 50) {
    if (!enhanced.includes('regional')) {
      enhanced += `\n\n🌟 Being in a regional area like ${detection.persona.location} can actually be an advantage - there are specific regional pathways and often less competition for local opportunities.`;
    }
  }

  // Add emotional support for anxiety
  if (detection.emotionalNeeds.includes('reassurance') && !enhanced.includes('normal')) {
    enhanced += `\n\n💙 Remember, feeling uncertain about a career change is completely normal. Every successful tech professional started where you are now.`;
  }

  // Add urgency support
  if (detection.emotionalNeeds.includes('immediate_action')) {
    enhanced += `\n\n⚡ I understand you need to move quickly. Let's focus on the most important next step you can take this week.`;
  }

  return enhanced;
}

function generateFallbackResponse(detection: PersonaDetectionResult, query: string): string {
  // Determine which track the query is about
  const queryLower = query.toLowerCase();
  let trackResponse = "";
  
  if (queryLower.includes('no coding') || queryLower.includes('without coding') || (queryLower.includes('marketing') && queryLower.includes('tech'))) {
    trackResponse = "our Business Analyst bootcamp";
  } else if (queryLower.includes('data') || queryLower.includes('analyst') || queryLower.includes('ai') || queryLower.includes('python')) {
    trackResponse = "our Data & AI Analyst bootcamp";
  } else if (queryLower.includes('cyber') || queryLower.includes('security')) {
    trackResponse = "our Cybersecurity bootcamp";
  } else if (queryLower.includes('code') || queryLower.includes('coding') || queryLower.includes('website') || queryLower.includes('developer') || queryLower.includes('full stack')) {
    trackResponse = "our Full Stack Developer bootcamp";
  } else if (queryLower.includes('business') || queryLower.includes('marketing')) {
    trackResponse = "our Business Analyst bootcamp";
  } else {
    trackResponse = "our bootcamp programs - we have Business Analyst, Data & AI, Cybersecurity, and Full Stack Developer tracks";
  }
  
  let response = `Hey! I'd love to help you figure out if ${trackResponse} is a good fit for you.`;
  
  // Add specific bootcamp info
  if (trackResponse.includes("Business Analyst")) {
    response += " It's a 4-week program ($740 AUD or $185/week payments) that gets you job-ready for entry-level BA roles.";
  } else if (trackResponse.includes("Data & AI")) {
    response += " It's a 4-week program ($740 AUD or $185/week payments) covering Python, SQL, dashboards, and AI tools.";
  } else if (trackResponse.includes("Cybersecurity")) {
    response += " It's a 4-week program ($740 AUD or $185/week payments) covering AWS security, compliance, and risk management.";
  } else if (trackResponse.includes("Full Stack")) {
    response += " It's a 4-week program ($740 AUD or $185/week payments) covering modern web development.";
  } else {
    response += " Each track is 4 weeks and costs $740 AUD (or $185/week payments).";
  }
  
  // Add persona-specific context if detected
  if (detection.persona?.visaType === '485') {
    response += " Perfect timing with your 485 visa - many graduates land jobs within months.";
  } else if (detection.persona?.archetypeName?.includes('Tyler')) {
    response += " Great alternative to uni - hands-on learning, real projects, portfolio building.";
  } else if (detection.persona?.archetypeName?.includes('Callum')) {
    response += " Your admin background is actually perfect for BA work - you already understand business processes.";
  }
  
  response += " Want to book a quick 15-min chat to see if it's right for your situation?";
  
  return response;
}

// Utility function for testing persona response generation
export function analyzeResponseNeeds(detection: PersonaDetectionResult): {
  tone: string;
  priorities: string[];
  specialConsiderations: string[];
} {
  const { persona, emotionalNeeds, journeyStage } = detection;
  
  let tone = 'supportive';
  const priorities: string[] = [];
  const specialConsiderations: string[] = [];
  
  // Determine tone based on emotional needs
  if (emotionalNeeds.includes('reassurance')) {
    tone = 'reassuring';
  } else if (emotionalNeeds.includes('immediate_action')) {
    tone = 'urgent-supportive';
  } else if (emotionalNeeds.includes('clarity')) {
    tone = 'clear-explanatory';
  }
  
  // Set priorities based on journey stage
  if (journeyStage === 'awareness') {
    priorities.push('overview', 'possibilities', 'first_steps');
  } else if (journeyStage === 'decision') {
    priorities.push('comparison', 'pros_cons', 'confidence_building');
  } else if (journeyStage === 'post_completion') {
    priorities.push('job_search', 'portfolio', 'networking');
  }
  
  // Add special considerations
  if (persona?.visaType === '485') {
    specialConsiderations.push('visa_timeline', 'PR_pathway');
  }
  
  if (persona?.isRegional) {
    specialConsiderations.push('regional_opportunities', 'remote_work');
  }
  
  if (persona?.techConfidence === 'none') {
    specialConsiderations.push('beginner_friendly', 'foundational_concepts');
  }
  
  return { tone, priorities, specialConsiderations };
}

// Ensure mandatory information is included in every response
function ensureMandatoryInfo(response: string): string {
  let enhanced = response;
  
  // Check if pricing is mentioned
  const hasPricing = enhanced.includes('$740') || enhanced.includes('$185');
  
  // Check if timeline is mentioned
  const hasTimeline = enhanced.includes('4 week') || enhanced.includes('4-week');
  
  // Check if next step is mentioned
  const hasNextStep = enhanced.includes('book') || enhanced.includes('consultation') || 
                     enhanced.includes('enroll') || enhanced.includes('chat') || 
                     enhanced.includes('call') || enhanced.includes('speak');
  
  // Add missing information
  if (!hasPricing || !hasTimeline || !hasNextStep) {
    let addendum = '';
    
    if (!hasPricing && !hasTimeline) {
      addendum = '\n\nThe bootcamp is 4 weeks and costs $740 AUD (or $185/week payment plan).';
    } else if (!hasPricing) {
      addendum = '\n\nIt costs $740 AUD (or $185/week payment plan).';
    } else if (!hasTimeline) {
      addendum = '\n\nThe bootcamp is 4 weeks.';
    }
    
    if (!hasNextStep) {
      addendum += ' Want to book a quick consultation to see if it\'s right for you?';
    }
    
    enhanced += addendum;
  }
  
  return enhanced;
}