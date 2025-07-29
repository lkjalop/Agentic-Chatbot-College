import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Store conversation context per call (in production, use Redis or database)
const conversations = new Map<string, Array<{ role: string; content: string; timestamp: Date }>>();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;

    // Initialize conversation for this call
    if (!conversations.has(callSid)) {
      conversations.set(callSid, []);
    }

    const twiml = new VoiceResponse();

    // Welcome message
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Hello! Welcome to Employment Advantage College AI Assistant. How can I help you with your career and education questions today?');

    // Start gathering speech input
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
    }, 'Please tell me your question about courses, careers, or anything else I can help with.');

    // Fallback if no speech detected
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'I didn\'t hear anything. Please call back when you\'re ready to chat. Goodbye!');

    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error handling incoming call:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'I\'m sorry, there was an error. Please try calling again later.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}