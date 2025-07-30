'use client';

import { useState } from 'react';
import { EAChatAssistant } from './ea-chat-assistant';
import VoiceCallWidget from './voice-call-widget';
import { signIn, useSession } from 'next-auth/react';

export function LandingPage() {
  const [showChat, setShowChat] = useState(false);
  const { data: session } = useSession();

  if (showChat) {
    return <EAChatAssistant />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="flex justify-between items-center p-6 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[--ea-orange] rounded-lg flex items-center justify-center text-white font-bold text-xl">
            EA
          </div>
          <div>
            <div className="text-xl font-semibold text-[--ea-text-primary]">Employability</div>
            <div className="text-lg text-[--ea-text-primary]">Advantage</div>
          </div>
        </div>
        
        <div className="flex gap-4">
          {!session ? (
            <>
              <button 
                onClick={() => signIn('google')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">Google</span>
              </button>
              <button className="px-5 py-2.5 bg-[--ea-navy] text-white rounded-lg hover:bg-[--ea-navy-dark] transition-colors font-bold">
                STUDENT
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="text-[--ea-text-primary]">Welcome, {session.user?.name}</span>
              <button className="px-6 py-3 bg-[--ea-orange] text-white rounded-lg hover:bg-[--ea-orange-dark] transition-colors">
                CONTACT US
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-6 text-center">
        <h1 className="text-5xl font-bold text-[--ea-text-primary] mb-6">
          Sign in to get personalized help
        </h1>
        <p className="text-xl text-[--ea-text-secondary] max-w-3xl mb-12">
          Track your learning progress and get recommendations tailored to your goals
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl">
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-[--ea-orange] mb-3">✓ Confidence</h3>
            <p className="text-[--ea-text-secondary]">
              Build unshakeable confidence through personalized AI coaching and real-world practice scenarios.
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-[--ea-orange] mb-3">✓ Job-ready skills</h3>
            <p className="text-[--ea-text-secondary]">
              Master the skills employers actually want with our industry-aligned curriculum and AI guidance.
            </p>
          </div>
          <div className="text-center">
            <h3 className="text-2xl font-semibold text-[--ea-orange] mb-3">✓ Experience</h3>
            <p className="text-[--ea-text-secondary]">
              Gain practical experience through simulations, projects, and AI-powered interview practice.
            </p>
          </div>
        </div>
      </main>

      {/* Chat Button - Positioned above the VoiceCallWidget */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-28 right-6 w-16 h-16 bg-[#1e3a5f] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
        style={{ zIndex: 1000 }}
        title="Open Chat Assistant"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      
      {/* Voice Call Button - Will position itself at bottom-6 right-6 */}
      <VoiceCallWidget trigger="floating" chatOpen={false} />
    </div>
  );
}