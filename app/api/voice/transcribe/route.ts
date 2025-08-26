import { NextRequest, NextResponse } from 'next/server';
import { voiceService } from '@/lib/services/twilio-service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;

    console.log(`🎤 Transcription webhook for call ${callSid}:`);
    console.log(`Status: ${transcriptionStatus}`);
    console.log(`Text: "${transcriptionText}"`);

    if (transcriptionStatus === 'completed' && transcriptionText) {
      // Process the transcription through our voice service
      const response = await voiceService.processTranscription(callSid, transcriptionText);
      
      // Generate TwiML response
      const twiml = voiceService.generateTwiML(response);
      
      return new NextResponse(twiml, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // If transcription failed or is empty, provide fallback
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        I didn't catch that. Let me connect you with our student advisor team.
    </Say>
    <Dial>+61234567890</Dial>
</Response>`;

    return new NextResponse(fallbackTwiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error processing transcription:', error);
    
    // Error fallback
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        There was an issue processing your request. Let me transfer you to our team.
    </Say>
    <Dial>+61234567890</Dial>
</Response>`;

    return new NextResponse(errorTwiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}