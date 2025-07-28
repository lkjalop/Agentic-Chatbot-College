import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ 
  subsets: ['latin'],
  weights: ['400', '500', '600', '700'],
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Employability Advantage - AI Career Assistant',
  description: 'Transform your career with AI-powered coaching, personalized guidance, and job-ready skills development.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={`${inter.className} h-full`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}