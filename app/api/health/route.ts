import { NextRequest, NextResponse } from 'next/server';
import { env, hasDatabase, hasVectorDB, hasGroqAI } from '@/lib/config/environment';

// Health check for database
async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
  if (!hasDatabase) {
    return { status: 'unhealthy', error: 'Database URL not configured' };
  }
  
  const startTime = Date.now();
  try {
    // Try to import and use the database connection
    const { db } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    
    // Simple connectivity test
    await db.execute(sql`SELECT 1`);
    
    return { 
      status: 'healthy', 
      latency: Date.now() - startTime 
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

// Health check for vector database
async function checkVectorHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
  if (!hasVectorDB) {
    return { status: 'unhealthy', error: 'Vector DB not configured' };
  }
  
  const startTime = Date.now();
  try {
    const { Index } = await import('@upstash/vector');
    
    const index = new Index({
      url: env.UPSTASH_VECTOR_REST_URL!,
      token: env.UPSTASH_VECTOR_REST_TOKEN!,
    });
    
    // Simple info query to check connectivity
    const info = await index.info();
    
    return { 
      status: 'healthy', 
      latency: Date.now() - startTime 
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown vector DB error'
    };
  }
}

// Health check for AI service
async function checkAIHealth(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }> {
  if (!hasGroqAI) {
    return { status: 'unhealthy', error: 'Groq API key not configured' };
  }
  
  const startTime = Date.now();
  try {
    const Groq = (await import('groq-sdk')).default;
    const groq = new Groq({ apiKey: env.GROQ_API_KEY! });
    
    // Simple test query
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'llama-3.3-70b-versatile',
      max_tokens: 10,
      temperature: 0.1,
    });
    
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid AI response format');
    }
    
    return { 
      status: 'healthy', 
      latency: Date.now() - startTime 
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown AI service error'
    };
  }
}

// Get system information
function getSystemInfo() {
  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    nodeVersion: process.version,
    environment: env.NODE_ENV,
    features: {
      database: hasDatabase,
      vectorDB: hasVectorDB,
      ai: hasGroqAI,
      careerTracks: env.USE_CAREER_TRACKS,
      cragSidecar: env.CRAG_SIDECAR_ENABLED,
    }
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Run health checks in parallel
    const [databaseHealth, vectorHealth, aiHealth] = await Promise.allSettled([
      checkDatabaseHealth(),
      checkVectorHealth(), 
      checkAIHealth()
    ]);
    
    // Determine overall health
    const services = {
      database: databaseHealth.status === 'fulfilled' ? databaseHealth.value : { status: 'unhealthy' as const, error: 'Health check failed' },
      vector: vectorHealth.status === 'fulfilled' ? vectorHealth.value : { status: 'unhealthy' as const, error: 'Health check failed' },
      ai: aiHealth.status === 'fulfilled' ? aiHealth.value : { status: 'unhealthy' as const, error: 'Health check failed' }
    };
    
    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    const overallStatus = allHealthy ? 'healthy' : 'degraded';
    
    const healthResponse = {
      status: overallStatus,
      totalCheckTime: Date.now() - startTime,
      services,
      system: getSystemInfo()
    };
    
    // Return 200 for healthy, 503 for unhealthy
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthResponse, { status: statusCode });
    
  } catch (error) {
    // Catastrophic failure
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown health check error',
      totalCheckTime: Date.now() - startTime,
      system: getSystemInfo()
    }, { status: 503 });
  }
}

// Simple ready check (just confirms service is responding)
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}