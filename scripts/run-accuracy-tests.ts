#!/usr/bin/env tsx

// Script to run comprehensive accuracy testing
import { generateAccuracyReport, testAgentRouting, testPersonaMatching } from '../lib/testing/accuracy-testing';

async function main() {
  console.log('🚀 Starting Comprehensive Simulated Accuracy Testing...\n');
  
  try {
    // Generate and display the full report
    const fullReport = await generateAccuracyReport();
    console.log(fullReport);
    
    // Also run individual tests for detailed analysis
    console.log('\n🔍 DETAILED TEST RESULTS\n');
    
    const agentResults = await testAgentRouting();
    console.log('📊 Agent Routing Results:');
    console.log(`- Overall: ${agentResults.accuracy}% (${agentResults.correctTests}/${agentResults.totalTests})`);
    console.log(`- Failed tests: ${agentResults.failedTests.length}`);
    
    if (agentResults.failedTests.length > 0) {
      console.log('\n❌ Failed Agent Routing Tests:');
      agentResults.failedTests.forEach(test => {
        console.log(`  - "${test.query}" → Expected: ${test.expected}, Got: ${test.actual}`);
      });
    }
    
    const personaResults = testPersonaMatching();
    console.log(`\n👤 Persona Matching Results:`);
    console.log(`- Persona Selection: ${personaResults.personaAccuracy}%`);
    console.log(`- Similarity Scoring: ${personaResults.similarityAccuracy}%`);
    console.log(`- Overall: ${personaResults.overallAccuracy}%`);
    
    if (personaResults.failedTests.length > 0) {
      console.log('\n❌ Failed Persona Tests:');
      personaResults.failedTests.forEach((test: any) => {
        console.log(`  - "${test.query}" → Expected: ${test.expected}, Got: ${test.actual}`);
      });
    }
    
    console.log('\n✅ Testing completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}