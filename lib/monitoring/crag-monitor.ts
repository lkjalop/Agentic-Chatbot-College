/**
 * CRAG Performance Monitor
 * Lightweight monitoring for lean CRAG implementation
 * Tracks performance metrics without heavy dependencies
 */

interface CRAGMetrics {
  timestamp: number;
  query: string;
  queryLength: number;
  classification: 'fast' | 'enhanced';
  processingTimeMs: number;
  cacheHit: boolean;
  agent: string;
  resultCount: number;
  confidence: number;
}

interface CRAGStats {
  totalQueries: number;
  fastPathQueries: number;
  enhancedPathQueries: number;
  cacheHitRate: number;
  avgProcessingTime: number;
  avgConfidence: number;
  popularAgents: Record<string, number>;
  hourlyDistribution: Record<string, number>;
}

export class CRAGMonitor {
  private metrics: CRAGMetrics[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 queries for memory efficiency

  /**
   * Record a CRAG processing decision
   */
  recordQuery(data: {
    query: string;
    classification: 'fast' | 'enhanced';
    processingTimeMs: number;
    cacheHit: boolean;
    agent: string;
    resultCount: number;
    confidence: number;
  }): void {
    const metric: CRAGMetrics = {
      timestamp: Date.now(),
      queryLength: data.query.length,
      ...data
    };

    this.metrics.push(metric);

    // Keep only recent metrics for memory efficiency
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log significant events
    if (data.cacheHit) {
      console.log(`📊 CRAG Monitor: Cache hit for ${data.classification} query (${data.processingTimeMs}ms)`);
    }

    if (data.processingTimeMs > 3000) {
      console.warn(`⚠️ CRAG Monitor: Slow query detected (${data.processingTimeMs}ms) - ${data.query.substring(0, 50)}...`);
    }
  }

  /**
   * Get comprehensive statistics
   */
  getStats(hoursBack: number = 24): CRAGStats {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) {
      return this.getEmptyStats();
    }

    const totalQueries = recentMetrics.length;
    const fastPathQueries = recentMetrics.filter(m => m.classification === 'fast').length;
    const enhancedPathQueries = recentMetrics.filter(m => m.classification === 'enhanced').length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;

    const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / totalQueries;
    const avgConfidence = recentMetrics.reduce((sum, m) => sum + m.confidence, 0) / totalQueries;

    // Agent popularity
    const popularAgents: Record<string, number> = {};
    recentMetrics.forEach(m => {
      popularAgents[m.agent] = (popularAgents[m.agent] || 0) + 1;
    });

    // Hourly distribution
    const hourlyDistribution: Record<string, number> = {};
    recentMetrics.forEach(m => {
      const hour = new Date(m.timestamp).getHours().toString().padStart(2, '0');
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    return {
      totalQueries,
      fastPathQueries,
      enhancedPathQueries,
      cacheHitRate: cacheHits / totalQueries,
      avgProcessingTime: Math.round(avgProcessingTime),
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      popularAgents,
      hourlyDistribution
    };
  }

  /**
   * Get performance insights and recommendations
   */
  getInsights(): string[] {
    const stats = this.getStats();
    const insights: string[] = [];

    if (stats.totalQueries === 0) {
      return ['📊 No CRAG queries recorded yet. System ready for monitoring.'];
    }

    // Classification balance insight
    const enhancedRatio = stats.enhancedPathQueries / stats.totalQueries;
    if (enhancedRatio > 0.7) {
      insights.push('⚡ Consider tightening CRAG classification - 70%+ queries using enhanced path');
    } else if (enhancedRatio < 0.2) {
      insights.push('🚀 Classification working well - most queries on fast path');
    }

    // Cache performance insight
    if (stats.cacheHitRate > 0.3) {
      insights.push(`📄 Excellent cache performance - ${Math.round(stats.cacheHitRate * 100)}% hit rate`);
    } else if (stats.cacheHitRate < 0.1) {
      insights.push('🔥 Consider warming cache with more common queries');
    }

    // Performance insight
    if (stats.avgProcessingTime > 2000) {
      insights.push('⚠️ Average processing time high - consider optimization');
    } else if (stats.avgProcessingTime < 500) {
      insights.push('⚡ Excellent response times - lean implementation working well');
    }

    // Agent distribution insight
    const topAgent = Object.entries(stats.popularAgents)
      .sort(([,a], [,b]) => b - a)[0];
    if (topAgent) {
      insights.push(`🎯 Most popular agent: ${topAgent[0]} (${topAgent[1]} queries)`);
    }

    return insights;
  }

  /**
   * Get real-time health status
   */
  getHealthStatus(): { status: 'healthy' | 'warning' | 'critical'; message: string } {
    const recentMetrics = this.metrics.slice(-10); // Last 10 queries
    
    if (recentMetrics.length === 0) {
      return { status: 'healthy', message: 'No recent activity' };
    }

    const avgRecentTime = recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / recentMetrics.length;
    const recentErrors = recentMetrics.filter(m => m.confidence < 0.5).length;

    if (avgRecentTime > 5000) {
      return { status: 'critical', message: `Very slow responses (${Math.round(avgRecentTime)}ms avg)` };
    }

    if (recentErrors > 3) {
      return { status: 'warning', message: `Low confidence responses detected (${recentErrors}/10)` };
    }

    if (avgRecentTime > 2000) {
      return { status: 'warning', message: `Slower than ideal (${Math.round(avgRecentTime)}ms avg)` };
    }

    return { status: 'healthy', message: `Performance good (${Math.round(avgRecentTime)}ms avg)` };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,query,queryLength,classification,processingTimeMs,cacheHit,agent,resultCount,confidence';
      const rows = this.metrics.map(m => 
        `${m.timestamp},${m.query.replace(/,/g, ';')},${m.queryLength},${m.classification},${m.processingTimeMs},${m.cacheHit},${m.agent},${m.resultCount},${m.confidence}`
      );
      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear metrics (for testing or memory management)
   */
  clearMetrics(): void {
    this.metrics = [];
    console.log('📊 CRAG Monitor: Metrics cleared');
  }

  private getEmptyStats(): CRAGStats {
    return {
      totalQueries: 0,
      fastPathQueries: 0,
      enhancedPathQueries: 0,
      cacheHitRate: 0,
      avgProcessingTime: 0,
      avgConfidence: 0,
      popularAgents: {},
      hourlyDistribution: {}
    };
  }
}