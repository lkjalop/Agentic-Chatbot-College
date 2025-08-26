import { NextRequest } from 'next/server';
import { POST } from '@/app/api/search/personalized/route';

// Mock the external dependencies
jest.mock('@/lib/ai/groq', () => ({
  analyzeIntent: jest.fn().mockResolvedValue({
    type: 'definition',
    confidence: 0.8,
    entities: ['bootcamp'],
    searchStrategy: 'semantic',
    clarificationNeeded: false
  }),
  generateResponse: jest.fn().mockResolvedValue('We offer 4 bootcamps: Data & AI, Cybersecurity, Business Analyst, Full Stack. Which interests you?')
}));

jest.mock('@/lib/security/basic-security-agent', () => ({
  BasicSecurityAgent: jest.fn().mockImplementation(() => ({
    quickScan: jest.fn().mockResolvedValue({
      allowed: true,
      safeContent: 'test content',
      flags: []
    })
  }))
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(null)
}));

describe('/api/search/personalized', () => {
  describe('POST', () => {
    it('should handle basic bootcamp query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        body: JSON.stringify({
          query: 'What bootcamps do you offer?',
          enablePersonaDetection: false
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
      expect(typeof data.response).toBe('string');
      expect(data.diagnostics).toBeDefined();
    });

    it('should handle empty query', async () => {
      const request = new NextRequest('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query is required');
    });

    it('should handle security blocked content', async () => {
      // Mock security scan to block content
      const mockSecurityAgent = require('@/lib/security/basic-security-agent').BasicSecurityAgent;
      mockSecurityAgent.mockImplementation(() => ({
        quickScan: jest.fn().mockResolvedValue({
          allowed: false,
          reason: 'critical_pii_detected',
          safeContent: 'I can only help with educational questions.',
          flags: ['credit_card']
        })
      }));

      const request = new NextRequest('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        body: JSON.stringify({
          query: 'My card is 4532 1234 5678 9012'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.blocked).toBe(true);
      expect(data.securityReason).toBe('critical_pii_detected');
      expect(data.diagnostics.security).toBeDefined();
    });

    it('should handle conversation history', async () => {
      const request = new NextRequest('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        body: JSON.stringify({
          query: 'Tell me more about that',
          conversationHistory: [
            { role: 'user', content: 'What is cybersecurity?' },
            { role: 'assistant', content: 'Cybersecurity protects digital systems...' }
          ]
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.response).toBeDefined();
    });
  });
});