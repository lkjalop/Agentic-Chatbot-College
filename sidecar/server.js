/**
 * CRAG Sidecar Server
 * Lightweight service for enhanced query processing
 * Runs independently with graceful failure handling
 */

const express = require('express');
const cors = require('cors');
const { SemanticCache } = require('../lib/cache/semantic-cache');
const { CRAGMonitor } = require('../lib/monitoring/crag-monitor');

const app = express();
const port = process.env.PORT || 8001;

// Initialize services
const semanticCache = new SemanticCache({ 
  maxEntries: parseInt(process.env.CACHE_SIZE) || 100,
  similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7
});

const cragMonitor = new CRAGMonitor();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: process.env.MAIN_APP_URL || 'http://localhost:3000',
  credentials: true
}));

// Warm cache on startup
let cacheWarmed = false;
const warmCache = async () => {
  if (!cacheWarmed) {
    try {
      await semanticCache.warmCache();
      cacheWarmed = true;
      console.log('🔥 CRAG Sidecar: Cache warmed successfully');
    } catch (error) {
      console.error('❌ CRAG Sidecar: Cache warming failed:', error);
    }
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  const health = cragMonitor.getHealthStatus();
  const cacheStats = semanticCache.getStats();
  
  res.json({
    status: 'healthy',
    service: 'crag-sidecar',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      entries: cacheStats.totalEntries,
      hitRate: cacheStats.cacheHitRate
    },
    processing: health
  });
});

// Enhanced query processing endpoint
app.post('/process', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, agent, context } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Warm cache if needed
    await warmCache();

    console.log(`🚀 CRAG Sidecar: Processing query for ${agent} agent`);

    // Check semantic cache
    const cachedResult = semanticCache.findSimilar(query);
    if (cachedResult) {
      const processingTime = Date.now() - startTime;
      
      // Record metrics
      cragMonitor.recordQuery({
        query,
        classification: 'enhanced',
        processingTimeMs: processingTime,
        cacheHit: true,
        agent: cachedResult.agent,
        resultCount: cachedResult.results.length,
        confidence: cachedResult.confidence
      });

      return res.json({
        success: true,
        fromCache: true,
        processingTimeMs: processingTime,
        results: cachedResult.results,
        response: cachedResult.response,
        agent: cachedResult.agent,
        confidence: cachedResult.confidence
      });
    }

    // If no cache hit, return indication to use main processing
    // In a full implementation, this would do enhanced processing
    const processingTime = Date.now() - startTime;
    
    cragMonitor.recordQuery({
      query,
      classification: 'enhanced',
      processingTimeMs: processingTime,
      cacheHit: false,
      agent,
      resultCount: 0,
      confidence: 0.5
    });

    res.json({
      success: true,
      fromCache: false,
      processingTimeMs: processingTime,
      recommendation: 'fallback_to_main',
      message: 'No cached result found, recommend using main application processing'
    });

  } catch (error) {
    console.error('❌ CRAG Sidecar: Processing failed:', error);
    
    const processingTime = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: 'Processing failed',
      processingTimeMs: processingTime,
      recommendation: 'fallback_to_main'
    });
  }
});

// Cache management endpoints
app.post('/cache/warm', async (req, res) => {
  try {
    await semanticCache.warmCache();
    res.json({ success: true, message: 'Cache warmed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/cache/stats', (req, res) => {
  const stats = semanticCache.getStats();
  res.json(stats);
});

app.delete('/cache/clear', (req, res) => {
  try {
    semanticCache.clearMetrics && semanticCache.clearMetrics();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Monitoring endpoints
app.get('/monitor/stats', (req, res) => {
  const hours = parseInt(req.query.hours) || 24;
  const stats = cragMonitor.getStats(hours);
  const insights = cragMonitor.getInsights();
  const health = cragMonitor.getHealthStatus();
  
  res.json({
    timeRange: `${hours} hours`,
    stats,
    insights,
    health
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 CRAG Sidecar: Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 CRAG Sidecar: Received SIGINT, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 CRAG Sidecar running on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🔧 Cache stats: http://localhost:${port}/cache/stats`);
  console.log(`📈 Monitor: http://localhost:${port}/monitor/stats`);
  
  // Warm cache on startup
  warmCache();
});

module.exports = app;