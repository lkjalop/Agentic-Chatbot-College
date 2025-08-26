import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  
  // Database
  NEON_DATABASE_URL: z.string().url().optional(),
  
  // Vector Database
  UPSTASH_VECTOR_REST_URL: z.string().url().optional(),
  UPSTASH_VECTOR_REST_TOKEN: z.string().optional(),
  
  // AI Services
  GROQ_API_KEY: z.string().min(1).optional(),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(32).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  
  // Basic Auth (for staging environments)
  BASIC_AUTH_USERNAME: z.string().optional(),
  BASIC_AUTH_PASSWORD: z.string().optional(),
  
  // Twilio Voice Services
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  HUMAN_ADVISOR_NUMBER: z.string().optional(),
  ENROLLMENT_TEAM_NUMBER: z.string().optional(),
  TECHNICAL_TEAM_NUMBER: z.string().optional(),
  FINANCIAL_TEAM_NUMBER: z.string().optional(),

  // Feature Flags
  USE_CAREER_TRACKS: z.string().transform(val => val === 'true').default('true'),
  ROLLBACK_TO_ORIGINAL: z.string().transform(val => val === 'true').default('false'),
  CAREER_TRACK_ROLLOUT: z.string().transform(val => parseInt(val) || 100).default('100'),
  CRAG_SIDECAR_ENABLED: z.string().transform(val => val === 'true').default('false'),
});

// Type inference
export type Environment = z.infer<typeof envSchema>;

// Environment validation function
export function validateEnvironment(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(e => e.code === 'invalid_type' && e.received === 'undefined')
        .map(e => e.path.join('.'));
      
      if (missingVars.length > 0) {
        console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
      }
      
      // For development, we can continue with defaults
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return envSchema.parse({
          ...process.env,
          NODE_ENV: process.env.NODE_ENV || 'development'
        });
      }
      
      // For production, we should fail hard
      console.error('❌ Environment validation failed:', error.errors);
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
}

// Validate and export environment
export const env = validateEnvironment();

// Runtime environment checks
export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

// Service availability checks
export const hasDatabase = !!env.NEON_DATABASE_URL;
export const hasVectorDB = !!(env.UPSTASH_VECTOR_REST_URL && env.UPSTASH_VECTOR_REST_TOKEN);
export const hasGroqAI = !!env.GROQ_API_KEY;
export const hasAuth = !!env.NEXTAUTH_SECRET;

// Configuration summary for logging
export function getConfigSummary() {
  return {
    environment: env.NODE_ENV,
    features: {
      database: hasDatabase,
      vectorDB: hasVectorDB,
      ai: hasGroqAI,
      auth: hasAuth,
      careerTracks: env.USE_CAREER_TRACKS,
      cragSidecar: env.CRAG_SIDECAR_ENABLED
    }
  };
}