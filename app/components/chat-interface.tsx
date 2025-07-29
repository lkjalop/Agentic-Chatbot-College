'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useVoiceRecognition } from '@/lib/hooks/use-voice';
import VoiceCallWidget from './voice-call-widget';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  confidence?: number;
  type: 'agent' | 'persona' | 'source' | 'reasoning';
}

interface ChatInterfaceProps {
  onClose: () => void;
}

export default function ChatInterface({ onClose }: ChatInterfaceProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Welcome! I'm your AI career assistant, powered by advanced context-aware technology. I'm here to help you navigate your career journey with personalized guidance tailored specifically to your goals and experience.",
      timestamp: new Date()
    },
    {
      id: '2', 
      role: 'assistant',
      content: "How can I help you today? Whether it's resume optimization, interview preparation, job search strategies, or career planning, I'm here to provide expert guidance every step of the way.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([
    { id: '1', name: 'Knowledge Agent', icon: '📚', confidence: 80, type: 'agent' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice recognition setup
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceRecognition({
    continuous: false,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        setInputValue(text);
        resetTranscript();
        // Update agents for voice input
        updateAgentsForVoice();
      }
    }
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleAgentPanel = () => {
    setAgentPanelOpen(!agentPanelOpen);
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const updateAgentsForVoice = () => {
    setActiveAgents([
      { id: 'v1', name: 'Voice Agent', icon: '🎤', type: 'agent' },
      { id: '1', name: 'Knowledge Agent', icon: '📚', confidence: 95, type: 'agent' }
    ]);
    if (!agentPanelOpen) {
      setAgentPanelOpen(true);
    }
  };

  const updateAgentsForMessage = (message: string) => {
    // This is just a placeholder during loading - real agents come from API
    const agents: Agent[] = [
      { id: 'loading', name: 'Analyzing...', icon: '🔄', confidence: 0, type: 'agent' }
    ];
    setActiveAgents(agents);
  };

  const updateAgentsWithDiagnostics = (diagnostics: any, intent: any) => {
    const agents: Agent[] = [];
    
    // Add the actual agent that was used
    const agentIcons = {
      knowledge: '📚',
      cultural: '🌍', 
      schedule: '📅',
      voice: '🎙️'
    };
    
    agents.push({
      id: 'active',
      name: `${diagnostics.agent.charAt(0).toUpperCase() + diagnostics.agent.slice(1)} Agent`,
      icon: agentIcons[diagnostics.agent as keyof typeof agentIcons] || '🤖',
      confidence: diagnostics.confidence,
      type: 'agent'
    });
    
    // Add persona match if available
    if (diagnostics.personaMatch) {
      agents.push({
        id: 'persona',
        name: diagnostics.personaMatch.name,
        icon: '👤',
        confidence: diagnostics.personaMatch.similarity,
        type: 'persona'
      });
    }
    
    // Add knowledge sources
    if (diagnostics.sources && diagnostics.sources.length > 0) {
      diagnostics.sources.slice(0, 2).forEach((source: string, index: number) => {
        agents.push({
          id: `source-${index}`,
          name: source,
          icon: '📖',
          type: 'source'
        });
      });
    }
    
    // Add reasoning
    if (diagnostics.reasoning) {
      agents.push({
        id: 'reasoning',
        name: 'AI Reasoning',
        icon: '🧠',
        type: 'reasoning'
      });
    }
    
    setActiveAgents(agents);
    
    // Auto-open agent panel to show the routing
    if (!agentPanelOpen) {
      setAgentPanelOpen(true);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Update agents based on message
    updateAgentsForMessage(userMessage.content);

    try {
      // Call your AI API here
      const response = await fetch('/api/search/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          userId: session?.user?.id
        })
      });

      const data = await response.json();

      // Update agents with real diagnostic data from API
      if (data.diagnostics) {
        updateAgentsWithDiagnostics(data.diagnostics, data.intent);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || "I'm here to help! Could you please provide more details about what you're looking for?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-interface">
      <div className="main-header">
        <div className="header-left">
          <button className="menu-toggle" onClick={toggleSidebar}>
            ☰
          </button>
          <div className="header-title">
            <div className="logo">🎓</div>
            <span>AI Career Assistant</span>
          </div>
        </div>
        <div className="header-right">
          <button className="settings-btn" onClick={toggleAgentPanel}>
            ⚙️
          </button>
          <button className="settings-btn" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="main-layout">
        {/* Sidebar */}
        <div className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
          <button className="new-chat-btn">
            <span>+</span>
            <span>New chat</span>
          </button>

          <div className="chat-history">
            <div className="history-section">
              <div className="history-title">Today</div>
              <div className="chat-item active">Getting Started</div>
              <div className="chat-item">Resume Review Session</div>
            </div>
            <div className="history-section">
              <div className="history-title">Yesterday</div>
              <div className="chat-item">Interview Preparation</div>
              <div className="chat-item">Career Path Discussion</div>
            </div>
            <div className="history-section">
              <div className="history-title">Previous 7 Days</div>
              <div className="chat-item">Project review and skill analysis</div>
              <div className="chat-item">Security for chatbots</div>
              <div className="chat-item">AI chatbot UI/UX design</div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-container">
            <div className="messages-area">
              {messages.map((message) => (
                <div key={message.id} className="message">
                  <div className={`avatar ${message.role === 'assistant' ? 'bot-avatar' : 'user-avatar'}`}>
                    {message.role === 'assistant' ? '🤖' : session?.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="message-content">
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="message">
                  <div className="avatar bot-avatar">🤖</div>
                  <div className="message-content">
                    <p className="typing-indicator">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-container">
              <div className="input-wrapper">
                <input
                  type="text"
                  className="input-field"
                  placeholder={isListening ? 'Listening...' : 'Type your message...'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                />
                <div className="input-buttons">
                  {voiceSupported && (
                    <button 
                      className={`input-btn mic-btn ${isListening ? 'speech-active' : ''}`}
                      onClick={toggleSpeechRecognition}
                      disabled={isLoading}
                    >
                      🎤
                    </button>
                  )}
                  <button 
                    className="input-btn send-btn"
                    onClick={sendMessage}
                    disabled={isLoading || !inputValue.trim()}
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Under the Hood Panel */}
          <div className={`agent-panel ${agentPanelOpen ? 'visible' : ''}`}>
            <div className="panel-header">
              <span>⚙️ Under the Hood</span>
            </div>
            <div className="panel-subtitle">See how the AI processes your questions</div>

            <div className="agent-section">
              <div className="section-title">ACTIVE AGENTS</div>
              {activeAgents.filter(a => a.type === 'agent').map(agent => (
                <div key={agent.id} className="agent-item">
                  <div className="agent-icon">{agent.icon}</div>
                  <div className="agent-name">{agent.name}</div>
                  {agent.confidence && (
                    <div className="confidence">{agent.confidence}%</div>
                  )}
                </div>
              ))}
            </div>

            {activeAgents.filter(a => a.type === 'persona').length > 0 && (
              <div className="agent-section">
                <div className="section-title">PERSONA MATCH</div>
                {activeAgents.filter(a => a.type === 'persona').map(agent => (
                  <div key={agent.id} className="agent-item">
                    <div className="agent-icon">{agent.icon}</div>
                    <div className="agent-name">{agent.name}</div>
                    {agent.confidence && (
                      <div className="confidence">{agent.confidence}%</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeAgents.filter(a => a.type === 'source').length > 0 && (
              <div className="agent-section">
                <div className="section-title">KNOWLEDGE SOURCES</div>
                {activeAgents.filter(a => a.type === 'source').map(agent => (
                  <div key={agent.id} className="agent-item">
                    <div className="agent-icon">{agent.icon}</div>
                    <div className="agent-name" style={{ fontSize: '13px', color: '#6c757d' }}>
                      {agent.name}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeAgents.filter(a => a.type === 'reasoning').length > 0 && (
              <div className="agent-section">
                <div className="section-title">AI REASONING</div>
                <div style={{ padding: '12px', background: 'white', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <p style={{ fontSize: '13px', color: '#6c757d', lineHeight: 1.5 }}>
                    Query processed through multi-agent analysis with context-aware routing
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Voice Call Widget */}
      <VoiceCallWidget chatOpen={true} />

      <style jsx>{`
        .chat-interface {
          display: block;
          height: 100vh;
          background: #ffffff;
        }

        .main-header {
          height: 60px;
          background: #2c3e50;
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .menu-toggle {
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border-radius: 8px;
          transition: background 0.3s;
        }

        .menu-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 500;
        }

        .header-title .logo {
          width: 32px;
          height: 32px;
          font-size: 18px;
          background: #ff6b35;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .settings-btn {
          width: 36px;
          height: 36px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border-radius: 8px;
          transition: background 0.3s;
        }

        .settings-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .main-layout {
          display: flex;
          height: calc(100vh - 60px);
        }

        .sidebar {
          width: 260px;
          background: #f8f9fa;
          border-right: 1px solid #e9ecef;
          transition: transform 0.3s ease;
          overflow-y: auto;
        }

        .sidebar.collapsed {
          transform: translateX(-260px);
          margin-right: -260px;
        }

        .new-chat-btn {
          margin: 16px;
          padding: 12px 16px;
          background: #2c3e50;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s;
          width: calc(100% - 32px);
        }

        .new-chat-btn:hover {
          background: #34495e;
        }

        .chat-history {
          padding: 0 16px;
        }

        .history-section {
          margin-bottom: 24px;
        }

        .history-title {
          font-size: 12px;
          color: #6c757d;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .chat-item {
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
          font-size: 14px;
          color: #495057;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chat-item:hover {
          background: #e9ecef;
        }

        .chat-item.active {
          background: #e3f2fd;
          color: #1976d2;
        }

        .chat-area {
          flex: 1;
          display: flex;
          background: #ffffff;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .messages-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .message {
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
        }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .bot-avatar {
          background: #2c3e50;
          color: white;
        }

        .user-avatar {
          background: #e9ecef;
          color: #495057;
        }

        .message-content {
          flex: 1;
          font-size: 15px;
          line-height: 1.6;
          color: #333;
        }

        .typing-indicator {
          color: #666;
          font-style: italic;
        }

        .input-container {
          padding: 20px;
          border-top: 1px solid #e9ecef;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          position: relative;
        }

        .input-field {
          flex: 1;
          padding: 12px 20px;
          border: 1px solid #ced4da;
          border-radius: 24px;
          font-size: 15px;
          outline: none;
          transition: all 0.3s;
          background: #f8f9fa;
        }

        .input-field:focus {
          border-color: #ff6b35;
          background: white;
        }

        .input-buttons {
          display: flex;
          gap: 8px;
        }

        .input-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transition: all 0.3s;
        }

        .mic-btn {
          background: #ff6b35;
          color: white;
        }

        .mic-btn.speech-active {
          animation: pulse 1.5s infinite;
        }

        .send-btn {
          background: #2c3e50;
          color: white;
        }

        .input-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .input-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .agent-panel {
          width: 320px;
          background: #f8f9fa;
          border-left: 1px solid #e9ecef;
          padding: 20px;
          overflow-y: auto;
          display: none;
        }

        .agent-panel.visible {
          display: block;
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .panel-subtitle {
          font-size: 12px;
          color: #6c757d;
          font-weight: 400;
          margin-bottom: 24px;
        }

        .agent-section {
          margin-bottom: 28px;
        }

        .section-title {
          font-size: 11px;
          color: #6c757d;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .agent-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: white;
          border-radius: 8px;
          margin-bottom: 8px;
          border: 1px solid #e9ecef;
          transition: all 0.3s;
        }

        .agent-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        .agent-name {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .confidence {
          font-size: 13px;
          color: #28a745;
          font-weight: 600;
        }

        @keyframes pulse {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 60px;
            height: calc(100vh - 60px);
            z-index: 200;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
          }

          .agent-panel {
            position: fixed;
            right: 0;
            top: 60px;
            height: calc(100vh - 60px);
            z-index: 200;
            box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
}