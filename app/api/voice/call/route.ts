import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('Missing Twilio credentials');
}

const client = twilio(accountSid, authToken);

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return NextResponse.json(
        { error: 'Twilio not configured. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Format phone number (ensure it includes country code)
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;

    // Make the call
    const call = await client.calls.create({
      url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/voice/incoming`,
      to: formattedNumber,
      from: twilioPhoneNumber,
      record: false, // Set to true if you want to record calls
      timeout: 30, // Ring for 30 seconds
    });

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      message: 'Call initiated successfully'
    });

  } catch (error: any) {
    console.error('Error making call:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to initiate call',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  const isConfigured = !!(accountSid && authToken && twilioPhoneNumber);
  
  return NextResponse.json({
    status: 'OK',
    twilioConfigured: isConfigured,
    timestamp: new Date().toISOString()
  });
}