import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { searchVectors } from '@/lib/vector';
import { PersonalizedSearchService } from '@/lib/search/personalized-search';

const VoiceResponse = twilio.twiml.VoiceResponse;

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

// Get AI response using existing search system
async function getAIResponse(userInput: string, conversationContext: Array<{ role: string; content: string }>): Promise<string> {
  try {
    // Use the existing search system
    const searchResponse = await searchVectors({
      query: userInput,
      limit: 3
    });

    if (!searchResponse.success || searchResponse.results.length === 0) {
      return "I don't have specific information about that topic in my knowledge base. Could you try rephrasing your question or asking about courses, career paths, or educational requirements?";
    }

    // Create a simple summary from search results
    const context = searchResponse.results.map(r => r.metadata?.content || r.data || '').join(' ');
    
    // For voice, provide concise, direct answers
    if (userInput.toLowerCase().includes('course') || userInput.toLowerCase().includes('program')) {
      return `Based on our course information: ${context.substring(0, 300)}. Would you like more details about specific programs or requirements?`;
    }
    
    if (userInput.toLowerCase().includes('career') || userInput.toLowerCase().includes('job')) {
      return `For career guidance: ${context.substring(0, 300)}. I can provide more information about specific career paths if you'd like.`;
    }
    
    if (userInput.toLowerCase().includes('visa') || userInput.toLowerCase().includes('international')) {
      return `Regarding visa and international student information: ${context.substring(0, 300)}. Do you need specific visa guidance?`;
    }

    // Default response
    return `Here's what I found: ${context.substring(0, 350)}. Is there a specific aspect you'd like me to explain further?`;

  } catch (error) {
    console.error('Error getting AI response:', error);
    return "I'm sorry, I'm having trouble accessing my knowledge base right now. Please try again or contact the college directly for assistance.";
  }
}

export async function POST(req: NextRequest) {
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
      
      // Prompt for next question
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

    console.log(`User said: ${speechResult}`);

    // Get conversation context
    const conversation = conversations.get(callSid) || [];
    
    // Add user message to context
    conversation.push({
      role: 'user',
      content: speechResult,
      timestamp: new Date()
    });

    // Get AI response using existing search system
    const aiResponse = await getAIResponse(speechResult, conversation);
    
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

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
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