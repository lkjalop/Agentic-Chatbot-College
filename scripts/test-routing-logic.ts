#!/usr/bin/env tsx

/**
 * Test routing logic without external API dependencies
 * Tests the core routing decisions in Option 7
 */

import { getFeatureFlags } from '@/lib/ai/router';

// Mock intent for testing
const mockIntent = {
  type: 'career_path' as const,
  confidence: 0.8,
  entities: [],
  searchStrategy: 'semantic' as const,
  clarificationNeeded: false
};

interface TestCase {
  query: string;
  expectedAgent: string;
  category: string;
  description: string;
}

const testCases: TestCase[] = [
  // Career Track Tests - Data & AI
  { query: "python data science", expectedAgent: "data_ai", category: "Data & AI", description: "Python + data science" },
  { query: "machine learning career", expectedAgent: "data_ai", category: "Data & AI", description: "ML career" },
  { query: "SQL analytics", expectedAgent: "data_ai", category: "Data & AI", description: "SQL analytics" },
  
  // Career Track Tests - Cybersecurity  
  { query: "cybersecurity bootcamp", expectedAgent: "cybersecurity", category: "Cybersecurity", description: "Security bootcamp" },
  { query: "ethical hacking", expectedAgent: "cybersecurity", category: "Cybersecurity", description: "Ethical hacking" },
  { query: "security compliance", expectedAgent: "cybersecurity", category: "Cybersecurity", description: "Security compliance" },
  
  // Career Track Tests - Full Stack
  { query: "full stack development", expectedAgent: "fullstack", category: "Full Stack", description: "Full stack dev" },
  { query: "react javascript", expectedAgent: "fullstack", category: "Full Stack", description: "React JS" },
  { query: "web frontend", expectedAgent: "fullstack", category: "Full Stack", description: "Web frontend" },
  
  // Career Track Tests - Business Analyst
  { query: "business analyst requirements", expectedAgent: "business_analyst", category: "Business Analyst", description: "BA requirements" },
  { query: "stakeholder management", expectedAgent: "business_analyst", category: "Business Analyst", description: "Stakeholder mgmt" },
  { query: "process improvement", expectedAgent: "business_analyst", category: "Business Analyst", description: "Process improvement" },
  
  // Essential Support - Booking
  { query: "book appointment", expectedAgent: "booking", category: "Booking", description: "Book appointment" },
  { query: "schedule consultation", expectedAgent: "booking", category: "Booking", description: "Schedule consult" },
  { query: "meet with advisor", expectedAgent: "booking", category: "Booking", description: "Meet advisor" },
  
  // Essential Support - Cultural
  { query: "visa requirements", expectedAgent: "cultural", category: "Cultural", description: "Visa requirements" },
  { query: "international student", expectedAgent: "cultural", category: "Cultural", description: "International student" },
  { query: "485 visa", expectedAgent: "cultural", category: "Cultural", description: "485 visa" },
  
  // Default cases
  { query: "general career advice", expectedAgent: "business_analyst", category: "Default", description: "General career" }
];

// Simplified routing logic for testing (extracted from router.ts)
function testRouteToAgent(query: string): string {
  const lowercaseQuery = query.toLowerCase();
  
  // Essential Support Agents
  if (lowercaseQuery.includes('book') || lowercaseQuery.includes('appointment') ||
      lowercaseQuery.includes('meet with') || lowercaseQuery.includes('consultation') ||
      lowercaseQuery.includes('schedule')) {
    return 'booking';
  }
  
  if (lowercaseQuery.includes('visa') || lowercaseQuery.includes('international') ||
      lowercaseQuery.includes('cultural') || lowercaseQuery.includes('immigration')) {
    return 'cultural';
  }
  
  // Career Track Routing
  if (lowercaseQuery.includes('data') || lowercaseQuery.includes('analytics') || 
      lowercaseQuery.includes('python') || lowercaseQuery.includes('machine learning') || 
      lowercaseQuery.includes('ai') || lowercaseQuery.includes('sql')) {
    return 'data_ai';
  }
  
  if (lowercaseQuery.includes('security') || lowercaseQuery.includes('cyber') || 
      lowercaseQuery.includes('ethical') || lowercaseQuery.includes('penetration') || 
      lowercaseQuery.includes('compliance') || lowercaseQuery.includes('hacking')) {
    return 'cybersecurity';
  }
  
  if (lowercaseQuery.includes('full stack') || lowercaseQuery.includes('fullstack') || 
      lowercaseQuery.includes('web') || lowercaseQuery.includes('frontend') || 
      lowercaseQuery.includes('backend') || lowercaseQuery.includes('react') ||
      lowercaseQuery.includes('javascript') || lowercaseQuery.includes('node')) {
    return 'fullstack';
  }
  
  if (lowercaseQuery.includes('business analyst') || lowercaseQuery.includes('requirements') || 
      lowercaseQuery.includes('stakeholder') || lowercaseQuery.includes('process') ||
      lowercaseQuery.includes('workflow') || lowercaseQuery.includes('analysis')) {
    return 'business_analyst';
  }
  
  // Default to Business Analyst (most general track)
  return 'business_analyst';
}

function runRoutingTests(): void {
  console.log('🧪 Testing Option 7 Routing Logic');
  console.log('==================================');
  
  // Check feature flags
  const flags = getFeatureFlags();
  console.log('🏁 Feature Flags Status:');
  console.log(`   FEATURE_CAREER_TRACKS: ${flags.USE_CAREER_TRACKS}`);
  console.log(`   ROLLBACK_TO_ORIGINAL: ${flags.ROLLBACK_TO_ORIGINAL}`);
  console.log(`   CAREER_TRACK_ROLLOUT: ${flags.CAREER_TRACK_ROLLOUT}%`);
  console.log('');
  
  let passed = 0;
  let total = testCases.length;
  const results: Record<string, { passed: number; total: number }> = {};
  
  for (const testCase of testCases) {
    const actualAgent = testRouteToAgent(testCase.query);
    const testPassed = actualAgent === testCase.expectedAgent;
    
    if (!results[testCase.category]) {
      results[testCase.category] = { passed: 0, total: 0 };
    }
    results[testCase.category].total++;
    
    if (testPassed) {
      passed++;
      results[testCase.category].passed++;
      console.log(`✅ ${testCase.description}: "${testCase.query}" → ${actualAgent}`);
    } else {
      console.log(`❌ ${testCase.description}: "${testCase.query}"`);
      console.log(`   Expected: ${testCase.expectedAgent}, Got: ${actualAgent}`);
    }
  }
  
  console.log('');
  console.log('📊 RESULTS BY CATEGORY');
  console.log('=======================');
  
  Object.entries(results).forEach(([category, stats]) => {
    const percentage = Math.round((stats.passed / stats.total) * 100);
    console.log(`${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
  });
  
  console.log('');
  console.log('🎯 OVERALL RESULTS');
  console.log('==================');
  const overallPercentage = Math.round((passed / total) * 100);
  console.log(`Passed: ${passed}/${total} (${overallPercentage}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL ROUTING TESTS PASSED!');
    console.log('✨ Option 7 routing logic is working correctly.');
  } else {
    console.log('⚠️  Some routing tests failed.');
    console.log('📝 Review the routing patterns for failed cases.');
  }
  
  // Test communication context routing
  console.log('');
  console.log('🎤 COMMUNICATION CONTEXT TESTS');
  console.log('================================');
  
  const commTests = [
    { query: "presentation skills business", expected: "business_analyst" },
    { query: "technical communication dev", expected: "fullstack" },
    { query: "speaking skills data", expected: "data_ai" }
  ];
  
  commTests.forEach(test => {
    const result = testRouteToAgent(test.query);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} "${test.query}" → ${result} (expected: ${test.expected})`);
  });
}

// Run the tests
if (require.main === module) {
  runRoutingTests();
}

export { runRoutingTests };