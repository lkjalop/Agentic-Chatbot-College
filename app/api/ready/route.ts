import { NextRequest, NextResponse } from 'next/server';

// Simple readiness probe - just confirms the service is up
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Service is ready to accept traffic'
  });
}

// HEAD request for load balancer checks
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}