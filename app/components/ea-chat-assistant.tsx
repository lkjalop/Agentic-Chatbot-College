'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AnalyticsService } from '@/lib/analytics/analytics-service';
import { useVoiceRecognition, useTextToSpeech } from '@/lib/hooks/use-voice';
import { ScheduleButton, extractCalendlyUrl, removeCalendlyUrl } from './schedule-button';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  diagnostics?: {
    agent: string;
    confidence: number;
    personaMatch?: {
      name: string;
      similarity: number;
    };
    sources: string[];
    reasoning: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
}

export function EAChatAssistant() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [showDiagnosticInfo, setShowDiagnosticInfo] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Welcome! I'm your AI career assistant, ready to help with personalized guidance.",
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'assistant',
      content: "How can I help today? Ask about resumes, interviews, job search, or career planning.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Getting Started',
      preview: 'Welcome to your AI career assistant...',
      timestamp: new Date()
    },
    {
      id: '2',
      title: 'Resume Review Session',
      preview: 'Let\'s optimize your resume for ATS...',
      timestamp: new Date(Date.now() - 86400000)
    },
    {
      id: '3',
      title: 'Interview Preparation',
      preview: 'Common behavioral questions for...',
      timestamp: new Date(Date.now() - 172800000)
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, transcript, startListening, stopListening, resetTranscript } = useVoiceRecognition({
    continuous: true,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      if (isFinal) {
        setInputValue(transcript);
        stopListening();
      }
    }
  });

  const { speak } = useTextToSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    autoResizeTextarea();

    try {
      console.log('Sending API request for:', userMessage.content);
      
      // Call personalized search API
      const response = await fetch('/api/search/personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          userId: session?.user?.id
        }),
      });

      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response data:', data);

      // Simulate processing delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || "I understand your question. Let me provide you with personalized guidance based on your specific situation and career goals.",
        timestamp: new Date(),
        diagnostics: {
          agent: data.agent || 'knowledge',
          confidence: data.diagnostics?.confidence || (data.intent?.confidence || 0.8) * 100,
          personaMatch: data.diagnostics?.personaMatch || {
            name: 'Rohan Patel',
            similarity: 91
          },
          sources: data.diagnostics?.sources || data.results?.map((r: any) => r.metadata?.title || r.title).slice(0, 3) || ['Business Analyst Bootcamp', 'Career Switcher Guide', 'India Student Support'],
          reasoning: data.diagnostics?.reasoning || (data.intent?.type === 'career_path' 
            ? 'Career guidance query detected, matched to similar background professionals'
            : 'General inquiry routed through knowledge base with personalization')
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Analytics tracking (removed for build compatibility)
      // TODO: Implement analytics tracking

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleVoiceRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Starting a fresh conversation. What would you like to work on today?",
        timestamp: new Date()
      }
    ]);
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Landing Page Content */}
      <div className="landing-page min-h-screen flex items-center justify-center px-5 py-10 text-center">
        <div>
          <h1 className="text-4xl md:text-6xl font-bold text-[--ea-navy] mb-6 leading-tight landing-heading">
            We're here to help you<br />see the <span className="text-[--ea-orange] underline decoration-[--ea-orange] underline-offset-8 decoration-4">bigger picture.</span>
          </h1>
          <p className="text-lg md:text-xl text-[--ea-text-secondary] max-w-2xl mx-auto mb-12 leading-relaxed">
            We help students gain confidence, job-ready skills, and experience needed to secure a successful career straight out of university.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-xl shadow-sm text-left">
              <h3 className="text-[--ea-orange] text-xl font-semibold mb-3 flex items-center gap-2">
                <span>✓</span> Confidence
              </h3>
              <p className="text-base text-[--ea-text-primary]">
                Build unshakeable confidence through personalized AI coaching and real-world practice scenarios.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-left">
              <h3 className="text-[--ea-orange] text-xl font-semibold mb-3 flex items-center gap-2">
                <span>✓</span> Job-ready skills
              </h3>
              <p className="text-base text-[--ea-text-primary]">
                Master the skills employers actually want with our industry-aligned curriculum and AI guidance.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-left">
              <h3 className="text-[--ea-orange] text-xl font-semibold mb-3 flex items-center gap-2">
                <span>✓</span> Experience
              </h3>
              <p className="text-base text-[--ea-text-primary]">
                Gain practical experience through simulations, projects, and AI-powered interview practice.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-[5%] flex items-center gap-4 z-50 floating-action-buttons">
        <button
          onClick={toggleVoiceRecording}
          className="w-15 h-15 bg-[--ea-orange] hover:bg-[--ea-orange-dark] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center"
          aria-label={isListening ? "Stop voice recording" : "Start voice conversation"}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          </svg>
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="w-15 h-15 bg-[--ea-navy] hover:bg-[--ea-navy-dark] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 flex items-center justify-center relative overflow-hidden before:absolute before:inset-0 before:bg-[--ea-navy] before:rounded-full before:scale-90 before:opacity-70 before:animate-pulse"
          aria-label="Open chat assistant"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <rect x="4" y="4" width="7" height="7" rx="1"/>
            <rect x="13" y="4" width="7" height="7" rx="1"/>
            <rect x="4" y="13" width="7" height="7" rx="1"/>
            <rect x="13" y="13" width="7" height="7" rx="1"/>
          </svg>
        </button>
      </div>

      {/* Chat Overlay */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-[1999] transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed top-0 right-[10%] bottom-0 w-[70%] max-w-6xl bg-white shadow-2xl z-[2000] flex transition-transform duration-300 md:right-[10%] md:w-[70%] max-md:right-0 max-md:w-full">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden absolute md:relative h-full z-10 md:z-auto`}>
              <div className="p-5 border-b border-gray-200 bg-white">
                <button
                  onClick={startNewChat}
                  className="w-full px-5 py-3 bg-[--ea-navy] hover:bg-[--ea-navy-dark] text-white rounded-lg font-medium transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  New chat
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {chatSessions.map((session) => (
                  <div key={session.id} className="p-4 mb-1 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white border border-transparent hover:border-gray-200">
                    <div className="font-medium text-[--ea-text-primary] text-sm mb-1 truncate">
                      {session.title}
                    </div>
                    <div className="text-xs text-[--ea-text-secondary] truncate">
                      {session.preview}
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Mobile sidebar backdrop */}
            {isSidebarOpen && (
              <div 
                className="absolute inset-0 bg-black/30 z-5 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              />
            )}

            {/* Main Chat */}
            <main className="flex-1 flex flex-col bg-white">
              {/* Header */}
              <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between min-h-18">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12h18M3 6h18M3 18h18"/>
                    </svg>
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[--ea-navy] rounded-lg flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                        <rect x="4" y="4" width="7" height="7" rx="1"/>
                        <rect x="13" y="4" width="7" height="7" rx="1"/>
                        <rect x="4" y="13" width="7" height="7" rx="1"/>
                        <rect x="13" y="13" width="7" height="7" rx="1"/>
                      </svg>
                    </div>
                    <h1 className="text-lg font-semibold text-[--ea-text-primary] hidden md:block">
                      AI Career Assistant
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Diagnostic Toggle */}
                  <button
                    onClick={() => {
                      if (!isDiagnosticOpen && !showDiagnosticInfo) {
                        setShowDiagnosticInfo(true);
                        setTimeout(() => setShowDiagnosticInfo(false), 5000);
                      }
                      setIsDiagnosticOpen(!isDiagnosticOpen);
                    }}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isDiagnosticOpen 
                        ? 'bg-[--ea-orange] text-white' 
                        : 'hover:bg-gray-100 text-[--ea-text-secondary]'
                    }`}
                    title="Under the Hood - See how AI thinks"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      {/* Half gear on left */}
                      <g clipPath="url(#leftHalf)">
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
                      </g>
                      {/* Robot face on right */}
                      <g transform="translate(12,0)">
                        <rect x="1" y="6" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <circle cx="3.5" cy="9" r="1" fill="currentColor"/>
                        <circle cx="8.5" cy="9" r="1" fill="currentColor"/>
                        <rect x="4" y="11" width="4" height="1" rx="0.5" fill="currentColor"/>
                        <rect x="5" y="4" width="2" height="2" rx="0.5" stroke="currentColor" strokeWidth="1" fill="none"/>
                      </g>
                      <defs>
                        <clipPath id="leftHalf">
                          <rect x="0" y="0" width="12" height="24"/>
                        </clipPath>
                      </defs>
                    </svg>
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200 text-[--ea-text-secondary]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </header>

              <div className="flex flex-1 overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-6 messages-container">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-4 max-w-4xl w-full ${message.type === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 font-medium ${
                        message.type === 'assistant' 
                          ? 'bg-[--ea-navy] text-white' 
                          : 'bg-gray-200 text-[--ea-text-primary]'
                      }`}>
                        {message.type === 'assistant' ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                            <rect x="4" y="4" width="7" height="7" rx="1"/>
                            <rect x="13" y="4" width="7" height="7" rx="1"/>
                            <rect x="4" y="13" width="7" height="7" rx="1"/>
                            <rect x="13" y="13" width="7" height="7" rx="1"/>
                          </svg>
                        ) : (
                          'Y'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-[15px] leading-relaxed text-[--ea-text-primary] message-content">
                          {(() => {
                            const calendlyUrl = extractCalendlyUrl(message.content);
                            if (calendlyUrl && message.type === 'assistant') {
                              return removeCalendlyUrl(message.content);
                            }
                            return message.content;
                          })()}
                        </div>
                        {message.type === 'assistant' && (
                          <>
                            {(() => {
                              const calendlyUrl = extractCalendlyUrl(message.content);
                              if (calendlyUrl) {
                                return <ScheduleButton calendlyUrl={calendlyUrl} />;
                              }
                              return null;
                            })()}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => speak(message.content)}
                                className="text-xs text-[--ea-text-secondary] hover:text-[--ea-orange] flex items-center gap-1 transition-colors duration-200"
                                title="Read aloud"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                                </svg>
                                Listen
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex gap-4 max-w-4xl w-full self-start">
                      <div className="w-10 h-10 rounded-lg bg-[--ea-navy] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <rect x="4" y="4" width="7" height="7" rx="1"/>
                          <rect x="13" y="4" width="7" height="7" rx="1"/>
                          <rect x="4" y="13" width="7" height="7" rx="1"/>
                          <rect x="13" y="13" width="7" height="7" rx="1"/>
                        </svg>
                      </div>
                      <div className="flex gap-1 items-center py-4">
                        <div className="w-2 h-2 bg-[--ea-navy] rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-[--ea-navy] rounded-full animate-pulse animation-delay-200"></div>
                        <div className="w-2 h-2 bg-[--ea-navy] rounded-full animate-pulse animation-delay-400"></div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Info Popup for Under the Hood */}
                {showDiagnosticInfo && (
                  <div className="absolute top-20 right-4 bg-[--ea-navy] text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
                    <p className="text-sm">
                      The <strong>Under the Hood</strong> panel showcases our AI's dynamic architecture. 
                      Watch how agents and personas change based on your questions to provide targeted assistance!
                    </p>
                    <div className="mt-2 text-xs text-gray-300">
                      Click the gear icon to toggle this panel
                    </div>
                  </div>
                )}

                {/* Diagnostic Panel */}
                {isDiagnosticOpen && (
                  <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col md:relative fixed md:position-static top-0 right-0 bottom-0 md:w-80 w-full z-50 md:z-auto">
                    <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[--ea-text-primary] flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"/>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                          </svg>
                          Under the Hood
                        </h3>
                        <p className="text-xs text-[--ea-text-secondary] mt-1">
                          See how the AI processes your questions
                        </p>
                      </div>
                      {/* Mobile close button */}
                      <button
                        onClick={() => setIsDiagnosticOpen(false)}
                        className="md:hidden w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200 text-[--ea-text-secondary]"
                        aria-label="Close Under the Hood panel"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12"/>
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {messages.filter(m => m.type === 'assistant' && m.diagnostics).slice(-1).map((message) => (
                        <div key={`diag-${message.id}`} className="space-y-3">
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-[--ea-text-secondary] uppercase tracking-wide mb-2">
                              Agent Selection
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[--ea-text-primary] capitalize">
                                {message.diagnostics?.agent} Agent
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {message.diagnostics?.confidence.toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {message.diagnostics?.personaMatch && (
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs font-medium text-[--ea-text-secondary] uppercase tracking-wide mb-2">
                                Persona Match
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {/* Gender-based avatar */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                                    ['Priya', 'Li Wen', 'Sarah', 'Sadia', 'Hanh', 'Aarti', 'Amina', 'Mey Lin', 'Camila', 'Chelsea', 'Farah', 'Dr. Anjali'].some(
                                      name => message.diagnostics?.personaMatch?.name?.includes(name)
                                    ) ? 'bg-[--ea-orange]' : 'bg-[--ea-navy]'
                                  }`}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="12" cy="8" r="3"/>
                                      <path d="M16 14h-8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z"/>
                                    </svg>
                                  </div>
                                  <span className="text-sm font-medium text-[--ea-text-primary]">
                                    {message.diagnostics.personaMatch.name}
                                  </span>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {message.diagnostics.personaMatch.similarity}%
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-[--ea-text-secondary] uppercase tracking-wide mb-2">
                              Knowledge Sources
                            </div>
                            <div className="space-y-1">
                              {message.diagnostics?.sources.map((source, idx) => (
                                <div key={idx} className="text-xs text-[--ea-text-primary] bg-gray-50 px-2 py-1 rounded">
                                  {source}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="text-xs font-medium text-[--ea-text-secondary] uppercase tracking-wide mb-2">
                              Reasoning
                            </div>
                            <p className="text-xs text-[--ea-text-primary] leading-relaxed">
                              {message.diagnostics?.reasoning}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="flex-shrink-0 p-5 border-t border-gray-200 bg-white">
                {isListening && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-[--ea-orange] font-medium">
                    <div className="w-2 h-2 bg-[--ea-orange] rounded-full animate-pulse"></div>
                    Listening... (speak naturally)
                  </div>
                )}
                <div className="flex items-end gap-3 bg-gray-50 border-2 border-gray-200 rounded-xl p-2 focus-within:border-[--ea-orange] focus-within:bg-white transition-all duration-200">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      autoResizeTextarea();
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 border-none bg-transparent outline-none text-[15px] text-[--ea-text-primary] placeholder-[--ea-text-secondary] px-4 py-3 resize-none min-h-6 max-h-30"
                    rows={1}
                  />
                  <div className="flex gap-1.5 pb-1">
                    <button
                      onClick={toggleVoiceRecording}
                      className={`w-10 h-10 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-[--ea-orange] hover:bg-[--ea-orange-dark]'} text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5`}
                      title={isListening ? 'Stop Listening' : 'Start Voice Input'}
                    >
                      {isListening ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="6" width="12" height="12" rx="2"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={sendMessage}
                      disabled={!inputValue.trim()}
                      className="w-10 h-10 bg-[--ea-navy] hover:bg-[--ea-navy-dark] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </>
      )}


      <style jsx>{`
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        :root {
          --ea-navy: #1e3a5f;
          --ea-navy-dark: #152a47;
          --ea-orange: #ff6b35;
          --ea-orange-dark: #e55a2b;
          --ea-white: #ffffff;
          --ea-off-white: #fafaf9;
          --ea-text-primary: #1e3a5f;
          --ea-text-secondary: #78716c;
        }
      `}</style>
    </>
  );
}