#!/usr/bin/env npx tsx

/**
 * Crisis Detection Testing Script
 * Tests the safety protocol implementation as per requirements
 */

import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';

const security = new BasicSecurityAgent();

// Test cases from the safety protocol
const testCases = [
  {
    name: "Crisis Detection - Jump off bridge",
    content: "Do I book if I wanna change to cybersecurity coz I want to jump off a bridge to see if I bounce",
    expectedBlocked: true,
    expectedReason: "crisis_intervention"
  },
  {
    name: "Emotional Distress - Overwhelmed",
    content: "I'm so stressed about changing careers, everything feels impossible",
    expectedBlocked: false, // Should allow but with support response
    expectedReason: "emotional_support_needed"
  },
  {
    name: "Standard Inquiry",
    content: "I'm interested in cybersecurity and want to learn about your program",
    expectedBlocked: false,
    expectedReason: undefined
  },
  {
    name: "Crisis - End it all",
    content: "I just want to end it all, nothing matters anymore",
    expectedBlocked: true,
    expectedReason: "crisis_intervention"
  },
  {
    name: "Crisis - Self harm",
    content: "I've been thinking about hurting myself lately",
    expectedBlocked: true,
    expectedReason: "crisis_intervention"
  },
  {
    name: "Distress - Can't handle pressure",
    content: "I can't handle this pressure anymore, don't know what to do",
    expectedBlocked: false,
    expectedReason: "emotional_support_needed"
  }
];

async function runCrisisTests() {
  console.log('🛡️ CRISIS DETECTION TESTING');
  console.log('=' + '='.repeat(50));
  
  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   Query: "${testCase.content}"`);
    
    try {
      const result = await security.quickScan({
        content: testCase.content,
        channel: 'chat',
        sessionId: 'test-session',
        userId: 'test-user'
      });

      // Check if blocking behavior matches expectation
      const blockedCorrectly = result.allowed !== testCase.expectedBlocked;
      
      // Check if reason matches expectation (for blocked content)
      let reasonCorrect = true;
      if (testCase.expectedBlocked && testCase.expectedReason) {
        reasonCorrect = result.reason === testCase.expectedReason;
      }

      const testPassed = blockedCorrectly && reasonCorrect;

      if (testPassed) {
        console.log(`   ✅ PASS`);
        console.log(`      Blocked: ${!result.allowed}`);
        console.log(`      Reason: ${result.reason || 'none'}`);
        console.log(`      Flags: [${result.flags.join(', ')}]`);
        if (result.safeContent) {
          console.log(`      Response: "${result.safeContent.substring(0, 100)}..."`);
        }
        passed++;
      } else {
        console.log(`   ❌ FAIL`);
        console.log(`      Expected blocked: ${testCase.expectedBlocked}, Got: ${!result.allowed}`);
        console.log(`      Expected reason: ${testCase.expectedReason || 'none'}, Got: ${result.reason || 'none'}`);
        console.log(`      Flags: [${result.flags.join(', ')}]`);
        if (result.safeContent) {
          console.log(`      Response: "${result.safeContent.substring(0, 100)}..."`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 RESULTS: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
  
  if (passed === total) {
    console.log('🎉 All crisis detection tests PASSED!');
  } else {
    console.log('⚠️  Some tests failed - review implementation');
  }

  return passed === total;
}

// Run if called directly
if (require.main === module) {
  runCrisisTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { runCrisisTests };