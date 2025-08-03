import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { searchVectors } from '@/lib/vector';
import { PersonalizedSearchService } from '@/lib/search/personalized-search';
import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';
import { AgenticRouter } from '@/lib/ai/router';

const VoiceResponse = twilio.twiml.VoiceResponse;
const security = new BasicSecurityAgent();
const router = new AgenticRouter();

// Store conversation context per call (in production, use Redis or database)
const conversations = new Map<string, Array<{ role: string; content: string; timestamp: Date }>>();

// Clean AI response text for better speech synthesis
function cleanTextForSpeech(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    // Replace URLs with spoken equivalent
    .replace(/https?:\/\/[^\s]+/g, 'link available')
    // Handle common abbreviations
    .replace(/\bVS\b/g, 'versus')
    .replace(/\bETC\b/g, 'etcetera')
    .replace(/\bE\.G\./g, 'for example')
    .replace(/\bI\.E\./g, 'that is')
    // Remove extra whitespace and limit length
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 1000);
}

// Enhanced AI response using multi-agent routing
async function getAIResponse(userInput: string, conversationContext: Array<{ role: string; content: string }>): Promise<string> {
  try {
    console.log(`🤖 Processing with multi-agent router: "${userInput}"`);
    
    // Use the enhanced router system
    const routerResult = await router.route(userInput);
    const intent = routerResult.intent;
    const results = routerResult.results;
    
    console.log(`🎯 Intent detected: ${intent.type} (confidence: ${intent.confidence})`);
    
    if (!results || results.length === 0) {
      return generateFallbackResponse(intent.type || 'general');
    }

    // Generate agent-specific responses based on intent
    return generateAgentResponse(intent, results, userInput);

  } catch (error) {
    console.error('Error in multi-agent processing:', error);
    // Fallback to simple search
    return await getSimpleResponse(userInput);
  }
}

// Generate responses based on agent type/intent
function generateAgentResponse(intent: any, results: any[], userInput: string): string {
  const context = results.map(r => r.metadata?.content || r.data || '').join(' ').substring(0, 400);
  
  switch (intent.type) {
    case 'booking':
    case 'appointment':
      return `I can help you schedule a consultation! ${context}. Would you like me to book you a time to speak with one of our advisors? I can arrange a 30-minute session this week.`;
    
    case 'visa':
    case 'international':
      return `For international students: ${context}. Our programs are designed to help with Australian work experience and PR pathways. Do you need specific information about visa requirements or student support services?`;
    
    case 'career':
    case 'job_search':
      return `Career guidance: ${context}. I can provide information about job market trends, skills development, and career transition strategies. What specific career area interests you?`;
    
    case 'course':
    case 'program':
      return `Course information: ${context}. Our programs are designed for practical skills and industry connections. Would you like details about course duration, requirements, or career outcomes?`;
    
    case 'prerequisite':
      return `Prerequisites and requirements: ${context}. I can help you understand what preparation you need and create a learning pathway. What's your current background?`;
    
    case 'voice_coaching':
    case 'communication':
      return `Communication skills: ${context}. We offer voice coaching and presentation skills training to help with job interviews and workplace communication. Are you preparing for interviews?`;
    
    default:
      return `Here's what I found: ${context}. I'm here to help with courses, careers, visa guidance, or scheduling consultations. What would you like to know more about?`;
  }
}

// Fallback responses by category
function generateFallbackResponse(intentType: string): string {
  const fallbacks = {
    booking: "I can help you schedule a consultation with our career advisors. Would you like to book a 30-minute session this week?",
    visa: "For international student support, I can connect you with our visa guidance team. We help with work experience requirements and PR pathways.",
    career: "I provide career guidance including job search strategies, skills development, and industry insights. What career area interests you?",
    course: "We offer various programs designed for practical skills and job readiness. Would you like information about specific courses or career outcomes?",
    voice_coaching: "Our communication coaching helps with interview skills, accent modification, and workplace communication. Are you preparing for job interviews?",
    general: "I'm here to help with courses, career guidance, visa information, or scheduling consultations. How can I assist you today?"
  };
  
  return fallbacks[intentType as keyof typeof fallbacks] || fallbacks.general;
}

// Simple fallback search (original logic)
async function getSimpleResponse(userInput: string): Promise<string> {
  try {
    const searchResponse = await searchVectors({
      query: userInput,
      limit: 3
    });

    if (!searchResponse.success || searchResponse.results.length === 0) {
      return "I'm here to help with educational and career questions. Could you ask about courses, career paths, or student services?";
    }

    const context = searchResponse.results.map(r => r.metadata?.content || r.content || '').join(' ');
    return `Here's what I found: ${context.substring(0, 350)}. Is there a specific aspect you'd like me to explain further?`;

  } catch (error) {
    console.error('Simple search fallback error:', error);
    return "I'm having trouble accessing information right now. Please try again or contact the college directly.";
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const speechResult = formData.get('SpeechResult') as string;

    const twiml = new VoiceResponse();

    if (!speechResult) {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'I didn\'t catch that. Could you please repeat your question?');
      
      const gather = twiml.gather({
        input: ['speech'],
        timeout: 5,
        speechTimeout: 'auto',
        action: '/api/voice/process-speech',
        method: 'POST'
      });

      gather.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Please tell me your question.');

      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Thank you for calling Employment Advantage College!');
      
      twiml.hangup();

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    console.log(`📞 Voice input received: "${speechResult}"`);

    // SECURITY SCAN - Check for threats and PII
    const securityResult = security.quickScan({
      content: speechResult,
      channel: 'voice',
      sessionId: callSid,
      userId: undefined // Voice calls don't have authenticated users initially
    });

    const securityCheck = await securityResult;
    if (!securityCheck.allowed) {
      console.log(`🛡️ Security blocked voice input: ${securityCheck.reason}`);
      
      // Check if this is a compliance concern requiring human escalation
      const needsComplianceEscalation = securityCheck.flags?.includes('human_escalation') || 
                                       securityCheck.reason === 'compliance_concern';
      
      // Provide safe response with compliance-specific guidance
      let responseText = securityCheck.safeContent || 'I can only help with educational questions.';
      
      if (needsComplianceEscalation) {
        responseText += ' For privacy matters or data requests, I can arrange for you to speak directly with our privacy officer who can provide proper guidance.';
      }
      
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, cleanTextForSpeech(responseText));
      
      // Still allow them to ask another question
      const gather = twiml.gather({
        input: ['speech'],
        timeout: 5,
        speechTimeout: 'auto',
        action: '/api/voice/process-speech',
        method: 'POST'
      });

      gather.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Do you have any questions about our courses or services?');

      twiml.hangup();

      return new NextResponse(twiml.toString(), {
        headers: { 
          'Content-Type': 'text/xml',
          'X-Security-Status': 'blocked',
          'X-Block-Reason': securityCheck.reason || 'unknown',
          'X-Compliance-Escalation': needsComplianceEscalation ? 'true' : 'false'
        }
      });
    }

    // Use safe content for processing
    const safeInput = securityCheck.safeContent || speechResult;
    console.log(`✅ Security passed, processing: "${safeInput}"`);

    // Get conversation context
    const conversation = conversations.get(callSid) || [];
    
    // Add user message to context (using safe input)
    conversation.push({
      role: 'user',
      content: safeInput,
      timestamp: new Date()
    });

    // Get enhanced AI response using multi-agent system
    const aiResponse = await getAIResponse(safeInput, conversation);
    
    // Add AI response to context
    conversation.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });

    // Update conversation storage
    conversations.set(callSid, conversation);

    // Speak the AI response
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, cleanTextForSpeech(aiResponse));

    // Ask if they have more questions
    twiml.pause({ length: 1 });
    
    const gather = twiml.gather({
      input: ['speech'],
      timeout: 5,
      speechTimeout: 'auto',
      action: '/api/voice/process-speech',
      method: 'POST'
    });

    gather.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Do you have any other questions about courses, careers, or college services?');

    // Fallback for no response
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for calling Employment Advantage College! Have a great day and good luck with your studies.');
    
    twiml.hangup();

    const processingTime = Date.now() - startTime;
    console.log(`⚡ Voice response completed in ${processingTime}ms`);

    return new NextResponse(twiml.toString(), {
      headers: { 
        'Content-Type': 'text/xml',
        'X-Processing-Time': processingTime.toString(),
        'X-Security-Status': 'passed',
        'X-Multi-Agent': 'enabled'
      }
    });

  } catch (error) {
    console.error('Error processing speech:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'I\'m sorry, I encountered an error processing your request. Please try calling again or contact the college directly.');
    
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}