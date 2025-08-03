import { NextResponse } from 'next/server';
import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';

const security = new BasicSecurityAgent();

export async function GET() {
  try {
    const metrics = security.getSecurityMetrics();
    
    // Add system health info
    const systemInfo = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      features: {
        multiAgent: true,
        securityScanning: true,
        rateLimiting: true,
        auditLogging: true
      }
    };
    
    return NextResponse.json({
      ...systemInfo,
      security: {
        blockedToday: metrics.blockedToday,
        recentEvents: metrics.recentEvents.map(event => ({
          timestamp: event.timestamp,
          channel: event.channel,
          blocked: event.blocked,
          reason: event.reason,
          flags: event.flags
        })),
        topFlags: Object.entries(metrics.flagsCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([flag, count]) => ({ flag, count })),
        summary: {
          totalEvents: metrics.recentEvents.length,
          blocked: metrics.recentEvents.filter(e => e.blocked).length,
          allowed: metrics.recentEvents.filter(e => !e.blocked).length
        }
      }
    });
  } catch (error) {
    console.error('Security metrics error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get security metrics',
        status: 'degraded',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}