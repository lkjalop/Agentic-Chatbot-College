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

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-4), // Last 2 exchanges for context
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7, // Warmer for more empathetic responses
      max_tokens: 800
    });

    let response = completion.choices[0]?.message?.content || 
      'I understand you\'re looking for guidance. Let me help you with that.';

    // Post-process for persona-specific enhancements
    response = await enhanceResponseForPersona(response, personaDetection);

    return response;
  } catch (error) {
    console.error('Empathetic response generation error:', error);
    return generateFallbackResponse(personaDetection, query);
  }
}

function buildPersonaAwareSystemPrompt(detection: PersonaDetectionResult): string {
  const { persona, emotionalNeeds, journeyStage } = detection;
  
  let basePrompt = `You are an empathetic education counselor specializing in helping international students transition into tech careers. Your responses should be warm, understanding, and culturally sensitive.`;

  // Persona-specific adjustments
  if (persona?.archetypeName) {
    basePrompt += `\n\nYou're speaking with someone similar to ${persona.archetypeName}`;
    
    if (persona.nationality) {
      basePrompt += ` from ${persona.nationality}`;
    }
    
    if (persona.visaType) {
      basePrompt += ` on a ${persona.visaType} visa`;
    }
    
    if (persona.location && persona.isRegional) {
      basePrompt += ` living in regional ${persona.location}`;
    }
    
    basePrompt += '.';
  }

  // Background context
  if (persona?.previousField && persona.previousField !== 'IT') {
    basePrompt += `\n\nThey're transitioning from ${persona.previousField} to tech, so explain technical concepts in relatable terms and acknowledge the challenge of career change.`;
  }

  if (persona?.workExperience?.includes('no') || persona?.techConfidence === 'none') {
    basePrompt += `\n\nThey have little to no tech experience, so be encouraging and start with basics.`;
  }

  // Emotional state guidance
  if (emotionalNeeds.includes('reassurance')) {
    basePrompt += `\n\nThey seem worried or anxious. Provide reassurance and normalize their concerns.`;
  }
  
  if (emotionalNeeds.includes('immediate_action')) {
    basePrompt += `\n\nThey have time pressure or urgency. Prioritize actionable next steps.`;
  }

  // Journey stage context
  if (journeyStage) {
    const stageGuidance = {
      awareness: 'They\'re just learning about options. Focus on overview and possibilities.',
      research: 'They\'re comparing options. Provide clear comparisons and recommendations.',
      pre_consultation: 'They\'re ready to talk to someone. Encourage booking a consultation.',
      decision: 'They\'re choosing between options. Help them decide confidently.',
      bootcamp_start: 'They\'re beginning their journey. Focus on preparation and mindset.',
      engagement: 'They\'re in the middle of learning. Provide specific help and encouragement.',
      post_completion: 'They\'ve finished learning. Focus on job search and next steps.'
    };
    
    const guidance = stageGuidance[journeyStage as keyof typeof stageGuidance];
    if (guidance) {
      basePrompt += `\n\nJourney stage: ${guidance}`;
    }
  }

  // Communication style
  basePrompt += `\n\nCommunication guidelines:
1. Start with empathy - acknowledge their situation
2. Be specific and practical - give actionable advice
3. Include encouragement - highlight their strengths
4. Address visa/regional concerns if relevant
5. Use "you" language to make it personal
6. End with a clear next step or question
7. Keep it conversational and warm`;

  return basePrompt;
}

function buildEnhancedContext(searchResults: any[], detection: PersonaDetectionResult): string {
  if (!searchResults.length) return '';
  
  const context = searchResults.map(result => {
    let content = `Title: ${result.metadata?.title}\nContent: ${result.content}`;
    
    // Add persona-relevant context
    if (result.metadata?.prerequisites && detection.persona?.techConfidence === 'none') {
      content += `\nNote: This builds on ${result.metadata.prerequisites.join(', ')}`;
    }
    
    if (result.metadata?.difficulty) {
      content += `\nDifficulty: ${result.metadata.difficulty}`;
    }
    
    return content;
  }).join('\n\n---\n\n');

  return `Relevant information found:\n${context}`;
}

function buildPersonalizedUserPrompt(query: string, detection: PersonaDetectionResult): string {
  let prompt = `Query: ${query}`;
  
  // Add detected context for the AI to reference
  if (detection.confidence > 50) {
    prompt += `\n\nDetected context:`;
    if (detection.persona?.visaType) {
      prompt += `\n- Visa: ${detection.persona.visaType}`;
    }
    if (detection.persona?.location) {
      prompt += `\n- Location: ${detection.persona.location}`;
    }
    if (detection.persona?.previousField) {
      prompt += `\n- Background: ${detection.persona.previousField}`;
    }
    if (detection.emotionalNeeds.length > 0) {
      prompt += `\n- Emotional needs: ${detection.emotionalNeeds.join(', ')}`;
    }
  }

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
  let response = "I understand you're looking for guidance, and I want to help you find the right path forward.";
  
  // Add basic persona acknowledgment if detected
  if (detection.persona?.nationality && detection.confidence > 30) {
    response += ` As someone from ${detection.persona.nationality}, I know navigating the Australian tech industry can feel overwhelming.`;
  }
  
  if (detection.emotionalNeeds.includes('reassurance')) {
    response += " Your concerns are completely valid, and many students in similar situations have successfully made this transition.";
  }
  
  response += " Could you tell me a bit more about your specific situation so I can provide more targeted advice?";
  
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