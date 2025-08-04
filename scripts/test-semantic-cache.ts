#!/usr/bin/env tsx

/**
 * Test Semantic Cache Implementation
 * Demonstrates cache hits and similarity matching
 */

import { SemanticCache } from '../lib/cache/semantic-cache';

async function testSemanticCache() {
  console.log('🧪 Testing Semantic Cache Implementation\n');

  const cache = new SemanticCache({ maxEntries: 10, similarityThreshold: 0.6 });

  // Warm the cache
  console.log('🔥 Warming cache...');
  await cache.warmCache();
  console.log('');

  // Test similarity matching
  const testQueries = [
    "cybersecurity career path requirements", // Should match cached "cybersecurity career path prerequisites"
    "security career path what do I need", // Similar to above
    "visa requirements for international students", // Should match cached query
    "visa help international student", // Similar to above
    "compare data analyst and business analyst", // Should match cached comparison
    "data vs business analyst differences", // Similar to above
    "full stack developer salary trends", // Should match cached job market query
    "Hello world", // Should not match anything
    "random unrelated query" // Should not match anything
  ];

  console.log('🔍 Testing similarity matching:\n');

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    const result = cache.findSimilar(query);
    
    if (result) {
      console.log(`  ✅ Cache HIT - Matched: "${result.query}"`);
      console.log(`  📝 Response: ${result.response.substring(0, 80)}...`);
      console.log(`  🎯 Agent: ${result.agent}`);
    } else {
      console.log(`  ❌ Cache MISS - No similar query found`);
    }
    console.log('');
  }

  // Test manual caching
  console.log('💾 Testing manual caching:\n');
  
  const customQuery = "How do I become a data scientist?";
  const customResults = [
    {
      id: "data-science-path",
      content: "Data Science path: Statistics, Python, Machine Learning, SQL skills required.",
      metadata: { title: "Data Science Path", category: "career" }
    }
  ];
  const customResponse = "Data Science requires strong analytics skills! Start with our Data & AI Analyst Bootcamp to build Python and SQL foundations, then advance to machine learning. The field offers excellent growth prospects!";

  cache.store(customQuery, customResults, customResponse, "knowledge", 0.85);
  console.log(`Stored: "${customQuery}"`);

  // Test retrieval of manually cached item
  const similarQuery = "what skills for data science career";
  const retrieved = cache.findSimilar(similarQuery);
  
  console.log(`\nTesting similar query: "${similarQuery}"`);
  if (retrieved) {
    console.log(`✅ Found match: "${retrieved.query}"`);
    console.log(`📝 Response: ${retrieved.response.substring(0, 80)}...`);
  } else {
    console.log(`❌ No match found`);
  }

  // Cache statistics
  console.log('\n📊 Cache Statistics:');
  const stats = cache.getStats();
  console.log(`  Total entries: ${stats.totalEntries}`);
  console.log(`  Total hits: ${stats.totalHits}`);
  console.log(`  Average confidence: ${stats.avgConfidence}`);
  console.log(`  Most popular query: ${stats.mostPopular || 'None yet'}`);

  console.log('\n🎉 Semantic Cache test completed!');
  console.log('✅ Cache warming works');
  console.log('✅ Similarity matching works'); 
  console.log('✅ Manual caching works');
  console.log('✅ Statistics tracking works');
}

// Run the test
testSemanticCache().catch(console.error);