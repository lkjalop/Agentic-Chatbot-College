import { NextRequest, NextResponse } from 'next/server';
import { voiceService } from '@/lib/services/twilio-service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    console.log(`📞 Incoming call webhook: ${callSid} from ${from} to ${to}`);

    // Handle incoming call through voice service
    const twiml = await voiceService.handleIncomingCall(callSid, from, to);

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Error handling incoming call:', error);
    
    // Fallback TwiML for errors
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        I'm sorry, there was an error. Let me transfer you to our human team.
    </Say>
    <Dial>+61234567890</Dial>
</Response>`;

    return new NextResponse(errorTwiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}