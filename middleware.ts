import { NextRequest, NextResponse } from 'next/server';
import { securityConfig } from '@/lib/config/security';

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Apply security headers
  applySecurityHeaders(response);
  
  // Rate limiting
  const rateLimitResult = applyRateLimit(request);
  if (!rateLimitResult.allowed) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': securityConfig.rateLimiting.maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      },
    });
  }
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', securityConfig.rateLimiting.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
  
  // CORS handling
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }
  
  // Basic Auth for staging environments
  if (securityConfig.basicAuth.enabled && shouldApplyBasicAuth(request)) {
    const basicAuthResult = checkBasicAuth(request);
    if (!basicAuthResult.authorized) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
      });
    }
  }
  
  return response;
}

function applySecurityHeaders(response: NextResponse) {
  // Apply all security headers from config
  Object.entries(securityConfig.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.groq.com https://*.upstash.io",
    "frame-ancestors 'none'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Additional security headers
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
}

function applyRateLimit(request: NextRequest): { 
  allowed: boolean; 
  remaining: number; 
  resetTime: number; 
} {
  const key = getClientIdentifier(request);
  const now = Date.now();
  const windowMs = securityConfig.rateLimiting.windowMs;
  const maxRequests = securityConfig.rateLimiting.maxRequests;
  
  // Get or create rate limit entry
  const entry = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };
  
  // Reset if window expired
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + windowMs;
  }
  
  // Check if request is allowed
  const allowed = entry.count < maxRequests;
  
  if (allowed) {
    entry.count++;
    rateLimitMap.set(key, entry);
  }
  
  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

function getClientIdentifier(request: NextRequest): string {
  // Try to get client IP from various headers (accounting for proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const connectingIp = request.headers.get('x-connecting-ip');
  
  let clientIp = forwarded?.split(',')[0] || realIp || connectingIp || 'unknown';
  
  // For development, use a combination of IP and User-Agent to be more permissive
  if (process.env.NODE_ENV === 'development') {
    const userAgent = request.headers.get('user-agent') || '';
    clientIp = `${clientIp}-${Buffer.from(userAgent).toString('base64').slice(0, 10)}`;
  }
  
  return clientIp;
}

function handleCORS(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 200 });
  
  // Check if origin is allowed
  const allowedOrigins = securityConfig.cors.origin;
  const isAllowed = Array.isArray(allowedOrigins) 
    ? allowedOrigins.includes(origin || '') 
    : origin === allowedOrigins;
  
  if (isAllowed || !origin) {
    response.headers.set('Access-Control-Allow-Origin', origin || '*');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
    response.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
  }
  
  return response;
}

function shouldApplyBasicAuth(request: NextRequest): boolean {
  // Don't apply basic auth to API health checks
  if (request.nextUrl.pathname.startsWith('/api/health') || 
      request.nextUrl.pathname.startsWith('/api/ready')) {
    return false;
  }
  
  // Apply to staging environment
  return process.env.NODE_ENV === 'staging' || 
         request.nextUrl.hostname.includes('staging');
}

function checkBasicAuth(request: NextRequest): { authorized: boolean } {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return { authorized: false };
  }
  
  try {
    const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, password] = credentials.split(':');
    
    const validUsername = securityConfig.basicAuth.username;
    const validPassword = securityConfig.basicAuth.password;
    
    return {
      authorized: username === validUsername && password === validPassword
    };
  } catch {
    return { authorized: false };
  }
}

// Configure which routes this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};