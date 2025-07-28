'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { User, LogOut, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface GoogleAuthProps {
  onAuthChange?: (user: any) => void;
}

export function GoogleAuth({ onAuthChange }: GoogleAuthProps) {
  const { data: session, status } = useSession();
  const [analyticsConsent, setAnalyticsConsent] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setAnalyticsConsent(session.user.analyticsConsent ?? true);
      onAuthChange?.(session.user);
    } else {
      onAuthChange?.(null);
    }
  }, [session, onAuthChange]);

  const handleGoogleLogin = async (userType: string = 'unknown') => {
    setIsLoading(true);
    try {
      await signIn('google', {
        callbackUrl: window.location.pathname,
        redirect: true,
      });
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
  };

  const updatePrivacySettings = async (newAnalyticsConsent: boolean) => {
    try {
      const response = await fetch('/api/user/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analyticsConsent: newAnalyticsConsent,
        }),
      });

      if (response.ok) {
        setAnalyticsConsent(newAnalyticsConsent);
      }
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="animate-pulse">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
    );
  }

  if (session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel>
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
              )}
              <div>
                <h3 className="font-medium">{session.user.name}</h3>
                <p className="text-sm text-gray-600">{session.user.email}</p>
                {session.user.studentType && session.user.studentType !== 'unknown' && (
                  <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {session.user.studentType.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="analytics-consent" className="text-sm font-medium">
                Analytics Tracking
              </Label>
              <Switch
                id="analytics-consent"
                checked={analyticsConsent}
                onCheckedChange={updatePrivacySettings}
              />
            </div>
            <p className="text-xs text-gray-500">
              Help us improve your experience by allowing analytics tracking. 
              Your data is always kept private and secure.
            </p>
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem className="cursor-pointer">
            <BarChart3 className="w-4 h-4 mr-2" />
            View My Analytics
          </DropdownMenuItem>
          
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="w-4 h-4 mr-2" />
            Account Settings
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={handleLogout}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Sign in to get personalized help</h3>
        <p className="text-sm text-gray-600 mb-4">
          Track your learning progress and get recommendations tailored to your goals
        </p>
      </div>

      <div className="space-y-2">
        <Button
          onClick={() => handleGoogleLogin('international')}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isLoading ? 'Signing in...' : 'Continue with Google (International)'}
        </Button>
        
        <Button
          onClick={() => handleGoogleLogin('local')}
          disabled={isLoading}
          className="w-full"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Local Student (AU/NZ)
        </Button>
      </div>

      <div className="text-center">
        <button
          onClick={() => handleGoogleLogin('career_changer')}
          className="text-sm text-blue-600 hover:underline"
          disabled={isLoading}
        >
          Career Changer? Click here
        </button>
      </div>

      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>By signing in, you agree to our privacy policy.</p>
        <p>We use your data to provide personalized recommendations.</p>
      </div>
    </div>
  );
}