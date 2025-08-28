import { useState, useCallback, useEffect, useRef } from 'react';

interface UseEnhancedVoiceOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  preferOpenAI?: boolean; // New option to prefer OpenAI over Web Speech API
  onResult?: (transcript: string, isFinal: boolean, source?: 'openai' | 'web-speech') => void;
  onError?: (error: any, source?: 'openai' | 'web-speech') => void;
}

export function useEnhancedVoiceRecognition(options: UseEnhancedVoiceOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [source, setSource] = useState<'openai' | 'web-speech' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const hasWebSpeech = !!SpeechRecognition;
      const hasMediaRecorder = !!(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined');
      
      setIsSupported(hasWebSpeech || hasMediaRecorder);
      console.log(`🎤 Voice support: Web Speech: ${hasWebSpeech}, MediaRecorder: ${hasMediaRecorder}`);
    }
  }, []);

  // OpenAI Whisper implementation
  const startOpenAIRecording = useCallback(async () => {
    try {
      console.log('🎤 Starting OpenAI Whisper recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for Whisper
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('🎤 Recording stopped, processing with OpenAI...');
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size < 1000) { // Less than 1KB, probably too short
          console.warn('⚠️ Recording too short, skipping transcription');
          options.onError?.({ message: 'Recording too short' }, 'openai');
          return;
        }
        
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/speech/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          const result = await response.json();
          
          if (result.success && result.text?.trim()) {
            console.log(`✅ OpenAI transcription: "${result.text}"`);
            setTranscript(result.text);
            options.onResult?.(result.text, true, 'openai');
          } else if (result.fallback === 'web-speech-api') {
            console.warn('⚠️ OpenAI failed, falling back to Web Speech API');
            // Fallback to Web Speech API
            startWebSpeechRecognition();
            return;
          } else {
            throw new Error(result.error || 'Transcription failed');
          }
        } catch (error) {
          console.error('❌ OpenAI transcription error:', error);
          options.onError?.(error, 'openai');
          
          // Fallback to Web Speech API
          console.log('🔄 Falling back to Web Speech API...');
          startWebSpeechRecognition();
        } finally {
          // Clean up
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          setIsRecording(false);
        }
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setIsListening(true);
      setSource('openai');
      
    } catch (error) {
      console.error('❌ Failed to start OpenAI recording:', error);
      options.onError?.(error, 'openai');
      
      // Fallback to Web Speech API
      console.log('🔄 Falling back to Web Speech API...');
      startWebSpeechRecognition();
    }
  }, [options]);

  // Web Speech API implementation (original)
  const startWebSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('❌ Web Speech API not supported');
      options.onError?.({ message: 'Speech recognition not supported' }, 'web-speech');
      return;
    }

    console.log('🎤 Starting Web Speech API...');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = options.continuous ?? true;
    recognition.interimResults = options.interimResults ?? true;
    recognition.lang = options.language ?? 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setSource('web-speech');
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        options.onResult?.(finalTranscript, true, 'web-speech');
      }
      
      setInterimTranscript(interim);
      if (interim) {
        options.onResult?.(interim, false, 'web-speech');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('❌ Web Speech API error:', event.error);
      setIsListening(false);
      options.onError?.(event, 'web-speech');
    };

    recognition.onend = () => {
      if (options.continuous && isListening) {
        try {
          recognition.start();
        } catch (error) {
          console.log('🔄 Web Speech auto-restart attempted');
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [isListening, options]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      console.error('❌ No speech recognition support available');
      return;
    }

    // Prefer OpenAI if available and requested
    if (options.preferOpenAI !== false) {
      startOpenAIRecording();
    } else {
      startWebSpeechRecognition();
    }
  }, [isSupported, options.preferOpenAI, startOpenAIRecording, startWebSpeechRecognition]);

  const stopListening = useCallback(() => {
    console.log('🛑 Stopping voice recognition...');
    
    // Stop OpenAI recording
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    // Stop Web Speech API
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Clean up media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsListening(false);
    setIsRecording(false);
  }, [isRecording]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isSupported,
    isListening,
    isRecording,
    transcript,
    interimTranscript,
    source,
    startListening,
    stopListening,
    resetTranscript
  };
}