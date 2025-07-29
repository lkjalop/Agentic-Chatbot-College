'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ChatInterface from './chat-interface';
import VoiceCallWidget from './voice-call-widget';

export default function NewLandingPage() {
  const [showChat, setShowChat] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const handleGoogleSignIn = () => {
    signIn('google');
  };

  const openChat = () => {
    setShowChat(true);
  };

  const closeChat = () => {
    setShowChat(false);
  };

  // If user is already signed in, they can access chat directly
  const canUseChat = !!session;

  if (showChat) {
    return <ChatInterface onClose={closeChat} />;
  }

  return (
    <div className="landing-page">
      <div className="landing-header">
        <div className="logo-section">
          <div className="logo">EA</div>
          <div className="logo-text">
            Employability
            <br />
            Advantage
          </div>
        </div>
        <div className="header-buttons">
          <button className="header-btn">STUDENT LOGIN</button>
          <button className="header-btn primary">CONTACT US</button>
        </div>
      </div>

      <div className="landing-content">
        <h1>Sign in to get personalized help</h1>
        <p>Track your learning progress and get recommendations tailored to your goals</p>

        <button className="google-signin" onClick={handleGoogleSignIn}>
          <span>🔵</span>
          <span>Continue with Google (International)</span>
        </button>

        <div className="features">
          <div className="feature">
            <h3>✓ Confidence</h3>
            <p>Build unshakeable confidence through personalized AI coaching and real-world practice scenarios.</p>
          </div>
          <div className="feature">
            <h3>✓ Job-ready skills</h3>
            <p>Master the skills employers actually want with our industry-aligned curriculum and AI guidance.</p>
          </div>
          <div className="feature">
            <h3>✓ Experience</h3>
            <p>Gain practical experience through simulations, projects, and AI-powered interview practice.</p>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="floating-actions">
        <button className="float-btn chat-btn" onClick={openChat} title="Open Chat">
          💬
        </button>
        <div className="float-btn call-btn">
          <VoiceCallWidget trigger="inline" />
        </div>
      </div>

      <style jsx>{`
        .landing-page {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: #ffffff;
          position: relative;
        }

        .landing-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background: #ffffff;
        }

        .logo-section {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo {
          width: 45px;
          height: 45px;
          background: #ff6b35;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 24px;
          font-weight: bold;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }

        .header-buttons {
          display: flex;
          gap: 20px;
        }

        .header-btn {
          padding: 10px 24px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          color: #333;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .header-btn.primary {
          background: #ff6b35;
          color: white;
          border: none;
        }

        .header-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .landing-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          text-align: center;
        }

        .landing-content h1 {
          font-size: 48px;
          margin-bottom: 20px;
          color: #333;
        }

        .landing-content p {
          font-size: 20px;
          color: #666;
          max-width: 800px;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .google-signin {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 24px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }

        .google-signin:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .features {
          display: flex;
          gap: 60px;
          margin-top: 60px;
        }

        .feature {
          text-align: center;
          max-width: 250px;
        }

        .feature h3 {
          color: #ff6b35;
          margin-bottom: 12px;
          font-size: 24px;
        }

        .feature p {
          font-size: 16px;
          color: #666;
          line-height: 1.5;
        }

        .floating-actions {
          position: fixed;
          bottom: 30px;
          right: 30px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          z-index: 100;
        }

        .float-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s;
          background: white;
        }

        .chat-btn {
          background: #2c3e50;
          color: white;
        }

        .call-btn {
          background: #ff6b35;
          color: white;
        }

        .float-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          .landing-header {
            padding: 20px;
          }

          .header-buttons {
            gap: 10px;
          }

          .header-btn {
            padding: 8px 16px;
            font-size: 14px;
          }

          .landing-content h1 {
            font-size: 32px;
          }

          .landing-content p {
            font-size: 18px;
          }

          .features {
            flex-direction: column;
            gap: 40px;
          }

          .floating-actions {
            bottom: 20px;
            right: 20px;
          }

          .float-btn {
            width: 56px;
            height: 56px;
          }
        }
      `}</style>
    </div>
  );
}