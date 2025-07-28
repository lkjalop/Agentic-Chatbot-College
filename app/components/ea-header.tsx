'use client';

import Link from 'next/link';
import { GoogleAuth } from './google-auth';

export function EAHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 text-decoration-none">
          <div 
            className="w-10 h-10 rounded flex items-center justify-center p-2"
            style={{ background: 'var(--ea-orange)' }}
          >
            <svg viewBox="0 0 24 24" className="w-full h-full" fill="white">
              <rect x="4" y="4" width="7" height="7" rx="1"/>
              <rect x="13" y="4" width="7" height="7" rx="1"/>
              <rect x="4" y="13" width="7" height="7" rx="1"/>
              <rect x="13" y="13" width="7" height="7" rx="1"/>
            </svg>
          </div>
          <span 
            className="text-lg font-semibold leading-tight"
            style={{ color: 'var(--ea-navy)' }}
          >
            Employability<br />Advantage
          </span>
        </Link>
        
        <div className="flex items-center gap-4">
          <GoogleAuth />
          <button 
            className="px-5 py-2.5 rounded font-medium transition-colors border"
            style={{ 
              borderColor: 'var(--ea-navy)', 
              color: 'var(--ea-navy)',
              background: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ea-navy)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--ea-navy)';
            }}
          >
            STUDENT LOGIN
          </button>
          <button 
            className="px-5 py-2.5 rounded font-medium text-white border-none transition-colors"
            style={{ background: 'var(--ea-orange)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--ea-orange-dark)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--ea-orange)';
            }}
          >
            CONTACT US
          </button>
        </div>
      </nav>
    </header>
  );
}