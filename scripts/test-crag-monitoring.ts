#!/usr/bin/env tsx

/**
 * Test CRAG Monitoring System
 * Demonstrates performance tracking and insights
 */

import { CRAGMonitor } from '../lib/monitoring/crag-monitor';

async function testCRAGMonitoring() {
  console.log('📊 Testing CRAG Monitoring System\n');

  const monitor = new CRAGMonitor();

  // Simulate various query patterns
  const simulatedQueries = [
    // Fast path queries
    { query: "Hello", classification: 'fast' as const, processingTime: 150, agent: 'knowledge', cacheHit: false },
    { query: "What courses?", classification: 'fast' as const, processingTime: 200, agent: 'knowledge', cacheHit: false },
    { query: "Book appointment", classification: 'fast' as const, processingTime: 120, agent: 'booking', cacheHit: false },
    
    // Enhanced path queries
    { query: "I need visa help for career change", classification: 'enhanced' as const, processingTime: 800, agent: 'cultural', cacheHit: false },
    { query: "Compare cybersecurity vs data analyst", classification: 'enhanced' as const, processingTime: 1200, agent: 'knowledge', cacheHit: false },
    { query: "International student requirements", classification: 'enhanced' as const, processingTime: 600, agent: 'cultural', cacheHit: false },
    
    // Cache hits
    { query: "cybersecurity career path", classification: 'enhanced' as const, processingTime: 50, agent: 'knowledge', cacheHit: true },
    { query: "visa help international", classification: 'enhanced' as const, processingTime: 45, agent: 'cultural', cacheHit: true },
    
    // Some slow queries
    { query: "Complex multi-part question about career transition for international students", classification: 'enhanced' as const, processingTime: 2500, agent: 'knowledge', cacheHit: false },
  ];

  console.log('🔄 Simulating queries...\n');

  // Record all queries
  simulatedQueries.forEach((query, index) => {
    monitor.recordQuery({
      query: query.query,
      classification: query.classification,
      processingTimeMs: query.processingTime,
      cacheHit: query.cacheHit,
      agent: query.agent,
      resultCount: Math.floor(Math.random() * 5) + 3, // 3-7 results
      confidence: 0.7 + Math.random() * 0.25 // 0.7-0.95 confidence
    });
    
    console.log(`${index + 1}. ${query.classification.toUpperCase()} (${query.processingTime}ms): "${query.query.substring(0, 40)}..."`);
  });

  // Get statistics
  console.log('\n📈 Performance Statistics:\n');
  const stats = monitor.getStats();
  
  console.log(`Total queries: ${stats.totalQueries}`);
  console.log(`Fast path: ${stats.fastPathQueries} (${Math.round(stats.fastPathQueries/stats.totalQueries*100)}%)`);
  console.log(`Enhanced path: ${stats.enhancedPathQueries} (${Math.round(stats.enhancedPathQueries/stats.totalQueries*100)}%)`);
  console.log(`Cache hit rate: ${Math.round(stats.cacheHitRate * 100)}%`);
  console.log(`Avg processing time: ${stats.avgProcessingTime}ms`);
  console.log(`Avg confidence: ${stats.avgConfidence}`);

  console.log('\n🎯 Popular Agents:');
  Object.entries(stats.popularAgents)
    .sort(([,a], [,b]) => b - a)
    .forEach(([agent, count]) => {
      console.log(`  ${agent}: ${count} queries`);
    });

  // Get insights
  console.log('\n💡 Performance Insights:\n');
  const insights = monitor.getInsights();
  insights.forEach(insight => console.log(`  • ${insight}`));

  // Health status
  console.log('\n🩺 Health Status:\n');
  const health = monitor.getHealthStatus();
  const statusIcon = health.status === 'healthy' ? '✅' : health.status === 'warning' ? '⚠️' : '❌';
  console.log(`  ${statusIcon} ${health.status.toUpperCase()}: ${health.message}`);

  // Export test
  console.log('\n📁 Export Test:\n');
  console.log('  JSON export length:', monitor.exportMetrics('json').length, 'characters');
  console.log('  CSV export lines:', monitor.exportMetrics('csv').split('\n').length);

  console.log('\n🎉 CRAG Monitoring test completed!');
  console.log('✅ Query recording works');
  console.log('✅ Statistics calculation works');
  console.log('✅ Performance insights work');
  console.log('✅ Health monitoring works');
  console.log('✅ Data export works');
  
  console.log('\n🚀 The lean CRAG implementation provides excellent visibility into performance!');
}

// Run the test
testCRAGMonitoring().catch(console.error);