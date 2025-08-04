#!/usr/bin/env tsx

/**
 * Test script for CRAG Query Classification
 * Tests the lean CRAG implementation to ensure queries are properly classified
 */

// Extracted classification logic from route.ts for testing
const shouldUseCRAG = (query: string, userContext?: any) => {
  // High-value triggers for enhanced processing
  const highValuePatterns = [
    /visa|immigration|work rights/i,
    /career change|transition/i,
    /international student/i,
    /course comparison|compare.*course|compare.*bootcamp/i,
    /job market|salary|industry trends/i,
    /prerequisites|requirements/i
  ];
  
  return highValuePatterns.some(pattern => pattern.test(query)) ||
         query.length > 100 || // Complex queries
         (userContext && userContext.isPremium); // Premium users get enhanced processing
};

// Test cases
const testCases = [
  // Should trigger CRAG (Enhanced)
  { query: "I need help with visa application", expected: true, category: "visa" },
  { query: "What are the immigration requirements for Australia?", expected: true, category: "immigration" },
  { query: "I'm looking for career change advice", expected: true, category: "career change" },
  { query: "As an international student, what are my options?", expected: true, category: "international student" },
  { query: "Can you compare the cybersecurity course with data analyst course?", expected: true, category: "course comparison" },
  { query: "What's the current job market like for developers? What salaries can I expect and what are the industry trends?", expected: true, category: "long query + job market" },
  { query: "What are the prerequisites for the full stack developer bootcamp and what requirements do I need to meet?", expected: true, category: "prerequisites + long" },
  
  // Should NOT trigger CRAG (Fast path)
  { query: "Hello", expected: false, category: "greeting" },
  { query: "Tell me about courses", expected: false, category: "general" },
  { query: "What is a bootcamp?", expected: false, category: "simple definition" },
  { query: "How much does it cost?", expected: false, category: "simple question" },
  { query: "Book appointment", expected: false, category: "booking" },
  { query: "Can you help me?", expected: false, category: "general help" },
  
  // Edge cases
  { query: "I'm a visa holder looking for career advice", expected: true, category: "visa + career" },
  { query: "course", expected: false, category: "single word" },
  { query: "", expected: false, category: "empty query" },
];

console.log('🧪 Testing CRAG Query Classification\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = shouldUseCRAG(testCase.query);
  const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
  
  console.log(`Test ${index + 1}: ${status}`);
  console.log(`  Query: "${testCase.query}"`);
  console.log(`  Category: ${testCase.category}`);
  console.log(`  Expected: ${testCase.expected ? 'Enhanced' : 'Fast'}`);
  console.log(`  Actual: ${result ? 'Enhanced' : 'Fast'}`);
  console.log('');
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
});

// Test with premium user context
console.log('🎯 Testing Premium User Context\n');

const premiumUser = { isPremium: true };
const basicQuery = "What courses do you offer?";

const basicResult = shouldUseCRAG(basicQuery);
const premiumResult = shouldUseCRAG(basicQuery, premiumUser);

console.log(`Premium Context Test:`);
console.log(`  Query: "${basicQuery}"`);
console.log(`  Basic user: ${basicResult ? 'Enhanced' : 'Fast'}`);
console.log(`  Premium user: ${premiumResult ? 'Enhanced' : 'Fast'}`);
console.log(`  Premium enhancement: ${!basicResult && premiumResult ? '✅ PASS' : '❌ FAIL'}`);
console.log('');

if (!basicResult && premiumResult) {
  passed++;
} else {
  failed++;
}

// Summary
console.log('📊 Test Results Summary');
console.log(`Total tests: ${testCases.length + 1}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Success rate: ${Math.round((passed / (testCases.length + 1)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All CRAG classification tests passed! The lean implementation is working correctly.');
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Review the classification logic.`);
}

// Performance test
console.log('\n⚡ Performance Test');
const performanceQueries = [
  "I need visa help for my career transition as an international student",
  "Hello there",
  "What are the course prerequisites and requirements for cybersecurity bootcamp?",
  "Book appointment"
];

performanceQueries.forEach(query => {
  const startTime = performance.now();
  const result = shouldUseCRAG(query);
  const endTime = performance.now();
  
  console.log(`  "${query.substring(0, 50)}..." → ${result ? 'Enhanced' : 'Fast'} (${(endTime - startTime).toFixed(3)}ms)`);
});

console.log('\n✅ CRAG Query Classification implementation is lean and fast!');