import React, { memo, useMemo } from 'react';
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

interface OptimizedMessageProps {
  message: Message;
  onSpeak: (content: string) => void;
}

const OptimizedMessage = memo(({ message, onSpeak }: OptimizedMessageProps) => {
  // Memoize expensive operations
  const calendlyUrl = useMemo(() => extractCalendlyUrl(message.content), [message.content]);
  const cleanContent = useMemo(() => {
    return calendlyUrl && message.type === 'assistant' 
      ? removeCalendlyUrl(message.content) 
      : message.content;
  }, [message.content, calendlyUrl, message.type]);

  const handleSpeak = useMemo(() => () => onSpeak(message.content), [message.content, onSpeak]);

  return (
    <div className={`flex gap-4 max-w-4xl w-full ${message.type === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
      <div className={`flex-shrink-0 font-medium ${
        message.type === 'assistant' 
          ? 'ea-avatar-assistant' 
          : 'ea-avatar-user'
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
        <div className="ea-message-bubble">
          {cleanContent}
        </div>
        {message.type === 'assistant' && (
          <>
            {calendlyUrl && <ScheduleButton calendlyUrl={calendlyUrl} />}
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSpeak}
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
  );
});

OptimizedMessage.displayName = 'OptimizedMessage';

export { OptimizedMessage };
export type { OptimizedMessageProps };