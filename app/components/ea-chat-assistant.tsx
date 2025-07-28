'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { AnalyticsService } from '@/lib/analytics/analytics-service';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  agent?: {
    name: string;
    icon: string;
  };
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const agents: Agent[] = [
  { id: 'knowledge', name: 'Knowledge Agent', icon: '📚', description: 'Career advice and industry insights' },
  { id: 'schedule', name: 'Scheduling Agent', icon: '📅', description: 'Mock interviews and timeline management' },
  { id: 'cultural', name: 'Cultural Intelligence Agent', icon: '🌍', description: 'International student guidance' },
  { id: 'voice', name: 'Voice Interaction Agent', icon: '🎙️', description: 'Communication practice and feedback' }
];

const quickActions = [
  { id: 'resume', label: '📝 Resume Review', prompt: "I'd like help reviewing and improving my resume" },
  { id: 'interview', label: '🎯 Interview Prep', prompt: "Can you help me prepare for upcoming interviews?" },
  { id: 'jobs', label: '💼 Job Search', prompt: "I'm looking for job opportunities in my field" },
  { id: 'visa', label: '🌍 Visa Support', prompt: "I need guidance on visa and work authorization" },
  { id: 'skills', label: '📊 Skill Analysis', prompt: "Can you analyze my skills and suggest improvements?" }
];

export function EAChatAssistant() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState('knowledge');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Welcome! I'm your AI career assistant. I can help you with resume optimization, interview preparation, job search strategies, and more. What would you like to work on today?",
      agent: { name: 'Knowledge Agent', icon: '📚' },
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleAgentSwitch = (agentId: string) => {
    setActiveAgent(agentId);
    const agent = agents.find(a => a.id === agentId);
    if (agent) {
      const agentMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: getAgentSwitchMessage(agentId),
        agent: { name: agent.name, icon: agent.icon },
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
    }
  };

  const getAgentSwitchMessage = (agentId: string) => {
    const messages = {
      knowledge: 'Switched to Knowledge Agent. I can help with career advice, resume tips, and industry insights.',
      schedule: 'Scheduling Agent active. I can help schedule mock interviews and manage your job search timeline.',
      cultural: 'Cultural Agent here. I specialize in helping international students navigate cultural differences in the job market.',
      voice: 'Voice Agent activated. I can help you practice verbal communication and interview responses.'
    };
    return messages[agentId as keyof typeof messages] || messages.knowledge;
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    handleSubmit(prompt);
  };

  const handleSubmit = async (messageContent?: string) => {
    const content = messageContent || input.trim();
    if (!content) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      // Call the enhanced search API
      const response = await fetch('/api/search/personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: content,
          agent: activeAgent,
          filters: session?.user ? {
            studentType: session.user.studentType,
            courseInterest: session.user.courseInterest
          } : undefined
        }),
      });

      const data = await response.json();
      
      // Simulate response delay for better UX
      setTimeout(() => {
        setIsTyping(false);
        
        const agent = agents.find(a => a.id === activeAgent);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: data.response || generateFallbackResponse(content, activeAgent),
          agent: agent ? { name: agent.name, icon: agent.icon } : undefined,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, botMessage]);
      }, 1000 + Math.random() * 1000);

    } catch (error) {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      const agent = agents.find(a => a.id === activeAgent);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        agent: agent ? { name: agent.name, icon: agent.icon } : undefined,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const generateFallbackResponse = (userMessage: string, agentId: string) => {
    const responses = {
      knowledge: [
        "Based on current market trends, I recommend focusing on these key skills for your field. Let me create a personalized development plan.",
        "Great question! Here are proven strategies that have helped students like you succeed in their job search.",
        "I've analyzed your query. Let me provide specific, actionable steps you can take today to advance your career."
      ],
      schedule: [
        "I can help you create a structured job search schedule. Most successful students dedicate 2-3 hours daily. Shall we plan your week?",
        "Let's schedule mock interviews to prepare you. I have slots available this week. Which days work best?",
        "I've identified key networking events in your area. Would you like me to add them to your calendar?"
      ],
      cultural: [
        "I understand the cultural challenges you're facing. Here's how to turn your international experience into a competitive advantage.",
        "Let me help you adapt your communication style while staying authentic. Cultural diversity is your strength!",
        "Many international students face similar challenges. Here are proven strategies for navigating cultural differences in interviews."
      ],
      voice: [
        "Let's practice your elevator pitch. I'll provide real-time feedback on clarity and confidence. Ready to start?",
        "Voice practice is crucial for interviews. Say 'Start practice' to begin our interactive session.",
        "I can help improve your professional communication. Let's work on tone, pace, and articulation together."
      ]
    };

    const agentResponses = responses[agentId as keyof typeof responses] || responses.knowledge;
    return agentResponses[Math.floor(Math.random() * agentResponses.length)];
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Voice Assistant Button */}
      <button
        className="fixed bottom-24 right-20 w-14 h-14 rounded-full text-white border-none cursor-pointer transition-all duration-200 flex items-center justify-center z-50"
        style={{ 
          background: 'var(--ea-orange)',
          boxShadow: 'var(--ea-shadow-md)'
        }}
        onClick={() => {
          handleAgentSwitch('voice');
          if (!isOpen) setIsOpen(true);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = 'var(--ea-shadow-lg)';
          e.currentTarget.style.background = 'var(--ea-orange-dark)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'var(--ea-shadow-md)';
          e.currentTarget.style.background = 'var(--ea-orange)';
        }}
        aria-label="Open Voice Assistant"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <path d="M12 19v4"></path>
        </svg>
      </button>

      {/* Chat Container */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Trigger */}
        <button
          className="flex items-center gap-2.5 px-6 py-3.5 text-white border-none rounded-full cursor-pointer font-medium transition-all duration-200 relative"
          style={{ 
            background: 'var(--ea-navy)',
            boxShadow: 'var(--ea-shadow-md)'
          }}
          onClick={handleToggleChat}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--ea-shadow-lg)';
            e.currentTarget.style.background = 'var(--ea-navy-dark)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'var(--ea-shadow-md)';
            e.currentTarget.style.background = 'var(--ea-navy)';
          }}
          aria-label="Open AI Career Assistant"
          aria-expanded={isOpen}
        >
          <div className="w-5 h-5 bg-white rounded p-1">
            <svg viewBox="0 0 24 24" className="w-full h-full" style={{ fill: 'var(--ea-navy)' }}>
              <rect x="4" y="4" width="7" height="7" rx="1"/>
              <rect x="13" y="4" width="7" height="7" rx="1"/>
              <rect x="4" y="13" width="7" height="7" rx="1"/>
              <rect x="13" y="13" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <span className="hidden sm:block">AI Career Assistant</span>
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white"
            style={{ 
              background: '#10b981',
              animation: 'pulse 2s infinite'
            }}
          />
        </button>

        {/* Chat Window */}
        {isOpen && (
          <div 
            className="absolute bottom-16 right-0 w-96 h-[600px] bg-white rounded-xl flex flex-col overflow-hidden border transition-all duration-200"
            style={{ 
              boxShadow: 'var(--ea-shadow-lg)',
              borderColor: 'var(--ea-gray-border)'
            }}
            role="dialog"
            aria-label="AI Career Assistant Chat"
          >
            {/* Chat Header */}
            <div 
              className="px-5 py-5 text-white flex justify-between items-center"
              style={{ background: 'var(--ea-navy)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded p-1">
                  <svg viewBox="0 0 24 24" className="w-full h-full" style={{ fill: 'var(--ea-navy)' }}>
                    <rect x="4" y="4" width="7" height="7" rx="1"/>
                    <rect x="13" y="4" width="7" height="7" rx="1"/>
                    <rect x="4" y="13" width="7" height="7" rx="1"/>
                    <rect x="13" y="13" width="7" height="7" rx="1"/>
                  </svg>
                </div>
                <span className="font-semibold">Your AI Career Team</span>
              </div>
              <button
                className="bg-transparent border-none text-white text-2xl cursor-pointer opacity-80 transition-opacity p-0 w-8 h-8 flex items-center justify-center"
                onClick={handleToggleChat}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                aria-label="Close chat"
              >
                ×
              </button>
            </div>

            {/* Agent Tabs */}
            <div 
              className="flex gap-2 px-5 py-3 overflow-x-auto border-b"
              style={{ 
                background: 'var(--ea-gray-light)',
                borderColor: 'var(--ea-gray-border)'
              }}
            >
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap flex-shrink-0 border ${
                    activeAgent === agent.id 
                      ? 'text-white border-transparent' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                  style={activeAgent === agent.id ? { 
                    background: 'var(--ea-navy)',
                    borderColor: 'var(--ea-navy)'
                  } : {
                    color: 'var(--ea-text-secondary)',
                    borderColor: 'var(--ea-gray-border)'
                  }}
                  onClick={() => handleAgentSwitch(agent.id)}
                >
                  <span>{agent.icon}</span>
                  <span>{agent.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 p-5 overflow-y-auto bg-white custom-scrollbar">
              <div className="flex flex-col gap-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] ${message.type === 'user' ? 'self-end' : 'self-start'}`}
                    style={{ animation: 'messageSlide 0.3s ease' }}
                  >
                    {message.type === 'bot' && message.agent && (
                      <div 
                        className="text-xs mb-1.5 flex items-center gap-1.5"
                        style={{ color: 'var(--ea-text-secondary)' }}
                      >
                        <span>{message.agent.icon}</span>
                        <span>{message.agent.name}</span>
                      </div>
                    )}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        message.type === 'user' 
                          ? 'text-white' 
                          : 'text-gray-900'
                      }`}
                      style={message.type === 'user' ? { 
                        background: 'var(--ea-navy)' 
                      } : { 
                        background: 'var(--ea-gray-light)' 
                      }}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="max-w-[85%] self-start">
                    <div 
                      className="flex gap-1 px-4 py-3 rounded-2xl w-fit"
                      style={{ background: 'var(--ea-gray-light)' }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          background: 'var(--ea-text-secondary)',
                          animation: 'typing 1.4s infinite'
                        }}
                      />
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          background: 'var(--ea-text-secondary)',
                          animation: 'typing 1.4s infinite 0.2s'
                        }}
                      />
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ 
                          background: 'var(--ea-text-secondary)',
                          animation: 'typing 1.4s infinite 0.4s'
                        }}
                      />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 px-5 pb-3 overflow-x-auto">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className="px-4 py-2 bg-white border rounded-full text-sm font-medium cursor-pointer transition-all duration-200 whitespace-nowrap flex-shrink-0 hover:text-white"
                  style={{ 
                    borderColor: 'var(--ea-gray-border)',
                    color: 'var(--ea-text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--ea-orange)';
                    e.currentTarget.style.borderColor = 'var(--ea-orange)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = 'var(--ea-gray-border)';
                    e.currentTarget.style.color = 'var(--ea-text-secondary)';
                  }}
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <div 
              className="flex gap-3 p-4 bg-white border-t items-center"
              style={{ borderColor: 'var(--ea-gray-border)' }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your career..."
                className="flex-1 px-5 py-3 border rounded-full text-sm outline-none transition-all duration-200"
                style={{ 
                  borderColor: 'var(--ea-gray-border)',
                  background: 'var(--ea-gray-light)'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ea-navy)';
                  e.currentTarget.style.background = 'white';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--ea-gray-border)';
                  e.currentTarget.style.background = 'var(--ea-gray-light)';
                }}
                aria-label="Type your message"
              />
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 rounded-full border-none text-white cursor-pointer flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'var(--ea-navy)' }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'var(--ea-navy-dark)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--ea-navy)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                aria-label="Send message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}