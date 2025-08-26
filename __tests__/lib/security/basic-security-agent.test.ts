import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';

describe('BasicSecurityAgent', () => {
  let securityAgent: BasicSecurityAgent;

  beforeEach(() => {
    securityAgent = new BasicSecurityAgent();
  });

  describe('PII Detection', () => {
    it('should detect credit card numbers', async () => {
      const result = await securityAgent.quickScan({
        content: 'My card number is 4532 1234 5678 9012',
        channel: 'chat',
        sessionId: 'test-session',
        userId: 'test-user'
      });

      expect(result.allowed).toBe(false);
      expect(result.flags).toContain('credit_card');
      expect(result.reason).toBe('critical_pii_detected');
    });

    it('should detect Australian TFN', async () => {
      const result = await securityAgent.quickScan({
        content: 'My TFN is 123 456 789',
        channel: 'chat',
        sessionId: 'test-session',
        userId: 'test-user'
      });

      expect(result.allowed).toBe(false);
      expect(result.flags).toContain('australian_tfn');
    });

    it('should detect US SSN', async () => {
      const result = await securityAgent.quickScan({
        content: 'My SSN is 123-45-6789',
        channel: 'chat',
        sessionId: 'test-session'
      });

      expect(result.allowed).toBe(false);
      expect(result.flags).toContain('us_ssn');
    });
  });

  describe('Crisis Detection', () => {
    it('should detect suicide mentions', async () => {
      const result = await securityAgent.quickScan({
        content: 'I want to kill myself',
        channel: 'chat',
        sessionId: 'test-session'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('crisis_intervention');
      expect(result.flags).toContain('critical_crisis');
    });

    it('should detect self-harm language', async () => {
      const result = await securityAgent.quickScan({
        content: 'I should just hurt myself',
        channel: 'chat',
        sessionId: 'test-session'
      });

      expect(result.allowed).toBe(false);
      expect(result.flags).toContain('critical_crisis');
    });
  });

  describe('Safe Content', () => {
    it('should allow normal career questions', async () => {
      const result = await securityAgent.quickScan({
        content: 'What bootcamps do you offer?',
        channel: 'chat',
        sessionId: 'test-session'
      });

      expect(result.allowed).toBe(true);
      expect(result.flags).toEqual([]);
    });

    it('should allow technical questions', async () => {
      const result = await securityAgent.quickScan({
        content: 'Tell me about machine learning',
        channel: 'chat',
        sessionId: 'test-session'
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('Threat Detection', () => {
    it('should detect SQL injection attempts', async () => {
      const result = await securityAgent.quickScan({
        content: "'; DROP TABLE users; --",
        channel: 'chat',
        sessionId: 'test-session'
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('security_threat_detected');
    });
  });
});