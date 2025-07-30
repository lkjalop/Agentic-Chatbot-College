'use client';

import { useState } from 'react';
import { Phone, PhoneCall, Mic, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallStatus {
  status: 'idle' | 'calling' | 'connected' | 'failed';
  message: string;
  callSid?: string;
}

interface VoiceCallWidgetProps {
  trigger?: 'floating' | 'inline';
  onCallInitiated?: () => void;
  chatOpen?: boolean;
}

export default function VoiceCallWidget({ trigger = 'floating', onCallInitiated, chatOpen = false }: VoiceCallWidgetProps) {
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStatus, setCallStatus] = useState<CallStatus>({ status: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const initiateCall = async () => {
    if (!phoneNumber.trim()) {
      setCallStatus({ status: 'failed', message: 'Please enter a phone number' });
      return;
    }

    setIsLoading(true);
    setCallStatus({ status: 'calling', message: 'Initiating call...' });

    try {
      const response = await fetch('/api/voice/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim()
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCallStatus({
          status: 'connected',
          message: 'Call initiated! You should receive a call shortly.',
          callSid: data.callSid
        });
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setCallStatus({ status: 'idle', message: '' });
          setShowCallDialog(false);
          setPhoneNumber('');
        }, 5000);
        
        // Notify parent component
        onCallInitiated?.();
      } else {
        setCallStatus({
          status: 'failed',
          message: data.error || 'Failed to initiate call'
        });
      }
    } catch (error) {
      console.error('Call error:', error);
      setCallStatus({
        status: 'failed',
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return digits;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  const getStatusIcon = () => {
    switch (callStatus.status) {
      case 'calling':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (callStatus.status) {
      case 'calling':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Voice Call Button - Only show if floating trigger */}
      {trigger === 'floating' && (
        <button
          onClick={() => setShowCallDialog(true)}
          className={cn(
            "fixed text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center group bg-gradient-to-r from-orange-500 to-red-500",
            chatOpen 
              ? "bottom-24 right-4 w-14 h-14 md:bottom-6 md:right-6 md:w-16 md:h-16 z-50 voice-call-widget-mobile" // Higher up on mobile when chat open
              : "bottom-6 right-6 w-16 h-16 z-40" // Normal position when chat closed
          )}
          title="Call AI Assistant"
        >
          <Phone className={cn(
            "group-hover:animate-bounce",
            chatOpen ? "w-5 h-5 md:w-7 md:h-7" : "w-7 h-7"
          )} />
          
          {/* Pulse animation - reduced when chat open */}
          <div className={cn(
            "absolute inset-0 rounded-full bg-orange-400 opacity-20",
            chatOpen ? "" : "animate-ping"
          )}></div>
        </button>
      )}
      
      {/* Inline trigger for floating buttons */}
      {trigger === 'inline' && (
        <button
          onClick={() => setShowCallDialog(true)}
          className="w-full h-full flex items-center justify-center"
          title="Call AI Assistant"
        >
          📞
        </button>
      )}

      {/* Call Dialog */}
      {showCallDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowCallDialog(false);
                setCallStatus({ status: 'idle', message: '' });
                setPhoneNumber('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <PhoneCall className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Call AI Assistant
              </h2>
              <p className="text-gray-600">
                Get instant help with your career and education questions
              </p>
            </div>

            {/* Phone Number Input */}
            <div className="mb-6">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Your Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-lg"
                disabled={isLoading}
                maxLength={14}
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll call you within 30 seconds
              </p>
            </div>

            {/* Status Message */}
            {callStatus.message && (
              <div className={cn(
                "flex items-center space-x-2 p-3 rounded-lg border mb-4",
                getStatusColor()
              )}>
                {getStatusIcon()}
                <span className="text-sm font-medium">{callStatus.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowCallDialog(false);
                  setCallStatus({ status: 'idle', message: '' });
                  setPhoneNumber('');
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={initiateCall}
                disabled={isLoading || !phoneNumber.trim() || callStatus.status === 'connected'}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Calling...</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4" />
                    <span>Call Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Features */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">What you can ask:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Course information and requirements</li>
                <li>• Career guidance and pathways</li>
                <li>• Visa and international student support</li>
                <li>• Enrollment and application processes</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}