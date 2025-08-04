import { NextRequest } from 'next/server';
import { CRAGMonitor } from '@/lib/monitoring/crag-monitor';

// Shared monitor instance (in production, this would be centralized)
const cragMonitor = new CRAGMonitor();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursBack = parseInt(searchParams.get('hours') || '24');
    const format = searchParams.get('format') || 'json';

    if (format === 'stats') {
      const stats = cragMonitor.getStats(hoursBack);
      const insights = cragMonitor.getInsights();
      const healthStatus = cragMonitor.getHealthStatus();

      return Response.json({
        timestamp: new Date().toISOString(),
        timeRange: `${hoursBack} hours`,
        stats,
        insights,
        healthStatus
      });
    }

    if (format === 'export') {
      const exportFormat = searchParams.get('exportFormat') as 'json' | 'csv' || 'json';
      const data = cragMonitor.exportMetrics(exportFormat);
      
      const contentType = exportFormat === 'csv' ? 'text/csv' : 'application/json';
      const filename = `crag-metrics-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      
      return new Response(data, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Default: return basic status
    return Response.json({
      status: 'CRAG monitoring active',
      healthStatus: cragMonitor.getHealthStatus(),
      recentInsights: cragMonitor.getInsights().slice(0, 3),
      quickStats: {
        ...cragMonitor.getStats(1), // Last hour
        timeRange: '1 hour'
      }
    });

  } catch (error) {
    console.error('Error in CRAG monitoring endpoint:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve CRAG monitoring data'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Clear metrics (for testing/maintenance)
    cragMonitor.clearMetrics();
    
    return Response.json({
      success: true,
      message: 'CRAG monitoring metrics cleared'
    });
  } catch (error) {
    console.error('Error clearing CRAG metrics:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: 'Failed to clear metrics'
    }, { status: 500 });
  }
}