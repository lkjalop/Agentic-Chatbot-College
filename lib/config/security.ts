import { env } from './environment';

// Security configuration
export const securityConfig = {
  // Rate limiting
  rateLimiting: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    skipSuccessfulRequests: false,
  },
  
  // Session security
  session: {
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    updateAge: 60 * 60,   // Update every hour
  },
  
  // Content security
  contentSecurity: {
    maxMessageLength: 2000,
    maxConversationHistory: 10,
    enablePIIDetection: true,
    enableCrisisDetection: true,
  },
  
  // Basic Auth for staging
  basicAuth: {
    enabled: !!(env.BASIC_AUTH_USERNAME && env.BASIC_AUTH_PASSWORD),
    username: env.BASIC_AUTH_USERNAME,
    password: env.BASIC_AUTH_PASSWORD,
  },
  
  // Security headers
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff', 
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },
  
  // CORS configuration
  cors: {
    origin: env.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
    optionsSuccessStatus: 200,
  },
};

// Security validation functions
export function validateInput(input: string): { valid: boolean; reason?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'Invalid input type' };
  }
  
  if (input.length > securityConfig.contentSecurity.maxMessageLength) {
    return { valid: false, reason: 'Input too long' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:text\/html/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return { valid: false, reason: 'Potentially malicious content' };
    }
  }
  
  return { valid: true };
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, securityConfig.contentSecurity.maxMessageLength);
}

// Generate secure session ID
export function generateSessionId(): string {
  return crypto.randomUUID();
}

// Check if request is from allowed origin
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Allow same-origin requests
  
  const allowedOrigins = securityConfig.cors.origin;
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin);
  }
  
  return origin === allowedOrigins;
}