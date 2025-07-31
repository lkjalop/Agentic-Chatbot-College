import React from 'react';

interface ScheduleButtonProps {
  calendlyUrl: string;
  className?: string;
}

export function ScheduleButton({ calendlyUrl, className = '' }: ScheduleButtonProps) {
  return (
    <div className={`flex justify-end mt-3 mb-2 ${className}`}>
      <button
        onClick={() => window.open(calendlyUrl, '_blank')}
        className="schedule-btn bg-[--ea-orange] hover:bg-[--ea-orange-dark] text-white border-none rounded-lg px-4 py-2 flex items-center gap-2 font-medium cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md"
        aria-label="Schedule a meeting"
      >
        <span>Schedule</span>
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          className="schedule-icon"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </button>
    </div>
  );
}

// Helper function to extract Calendly URL from message content
export function extractCalendlyUrl(content: string): string | null {
  const urlRegex = /https:\/\/calendly\.com[^\s\])]*/gi;
  const matches = content.match(urlRegex);
  return matches ? matches[0] : null;
}

// Helper function to remove Calendly URLs from message content
export function removeCalendlyUrl(content: string): string {
  // Remove markdown link format [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(https:\/\/calendly\.com[^\)]*\)/gi;
  let cleanedContent = content.replace(markdownLinkRegex, '');
  
  // Remove plain URLs
  const plainUrlRegex = /https:\/\/calendly\.com[^\s\])]*/gi;
  cleanedContent = cleanedContent.replace(plainUrlRegex, '');
  
  // Clean up extra whitespace
  cleanedContent = cleanedContent.trim().replace(/\n\n+/g, '\n\n');
  
  return cleanedContent;
}