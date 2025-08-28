import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return NextResponse.json({ 
        error: 'Speech-to-text service not configured',
        fallback: 'web-speech-api' 
      }, { status: 503 });
    }

    // Create form data for OpenAI
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile);
    openaiFormData.append('model', 'whisper-1');
    openaiFormData.append('language', 'en'); // You can make this configurable
    openaiFormData.append('response_format', 'json');
    openaiFormData.append('temperature', '0'); // More deterministic

    console.log(`🎤 Transcribing audio file: ${audioFile.name} (${audioFile.size} bytes)`);

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: openaiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      return NextResponse.json({ 
        error: 'Transcription failed',
        details: `OpenAI API returned ${response.status}`,
        fallback: 'web-speech-api'
      }, { status: response.status });
    }

    const transcription = await response.json();
    console.log(`✅ Transcription successful: "${transcription.text}"`);

    return NextResponse.json({
      success: true,
      text: transcription.text,
      duration: transcription.duration || null,
      language: transcription.language || 'en'
    });

  } catch (error) {
    console.error('Error in transcription endpoint:', error);
    
    return NextResponse.json({ 
      error: 'Internal server error during transcription',
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback: 'web-speech-api'
    }, { status: 500 });
  }
}