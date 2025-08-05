// Test the new 3-option structure and Live Industry Project integration

interface TestCase {
  query: string;
  expectedMentions: string[];
  track: string;
  testType: 'pricing' | 'options' | 'general' | 'crag';
}

const testCases: TestCase[] = [
  // Pricing Tests
  {
    query: "How much does the Business Analyst bootcamp cost?",
    expectedMentions: ["$740", "3 options", "Live Industry Project", "4-week", "6-week", "10-week"],
    track: "Business Analyst",
    testType: "pricing"
  },
  {
    query: "What are the pricing options for Full Stack Developer?",
    expectedMentions: ["$740", "Option 1", "Option 2", "Option 3", "bootcamp only", "Live Industry Project"],
    track: "Full Stack",
    testType: "options"
  },
  {
    query: "Tell me about Data & AI program costs",
    expectedMentions: ["$740", "payment plan", "$185/week", "Live Industry Project", "complete program"],
    track: "Data & AI",
    testType: "pricing"
  },
  {
    query: "What's included in the Cybersecurity course?",
    expectedMentions: ["3 options", "4-week", "6-week", "bootcamp", "Live Industry Project"],
    track: "Cybersecurity",
    testType: "options"
  },
  
  // General Information Tests
  {
    query: "I'm interested in career change programs",
    expectedMentions: ["Business Analyst", "bootcamp", "Live Industry Project", "flexible options"],
    track: "General",
    testType: "general"
  },
  {
    query: "What's the Live Industry Project?",
    expectedMentions: ["6-week", "real client", "professional teams", "portfolio", "all career tracks"],
    track: "General",
    testType: "general"
  },
  {
    query: "Can I do the project without the bootcamp?",
    expectedMentions: ["Option 2", "6-week", "Live Industry Project only", "real client projects"],
    track: "General",
    testType: "options"
  },
  
  // CRAG Enhancement Tests
  {
    query: "I'm an international student on 485 visa worried about career prospects and need practical Australian work experience for PR application",
    expectedMentions: ["Live Industry Project", "Australian work experience", "visa", "practical experience"],
    track: "Cultural",
    testType: "crag"
  },
  {
    query: "As a university CS student with no industry experience, how can I bridge the academic-professional gap?",
    expectedMentions: ["Live Industry Project", "real projects", "professional teams", "portfolio"],
    track: "Full Stack",
    testType: "crag"
  }
];

async function test3OptionStructure() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  console.log('🧪 Testing 3-Option Structure and Live Industry Project Integration\n');
  
  const results = {
    totalTests: testCases.length,
    passedTests: 0,
    liveProjectMentions: 0,
    pricingAccuracy: 0,
    cragEnhancement: 0,
    detailedResults: []
  };
  
  for (const [index, testCase] of testCases.entries()) {
    console.log(`\n🔍 Test ${index + 1}/${testCases.length}: ${testCase.testType.toUpperCase()}`);
    console.log(`   Track: ${testCase.track}`);
    console.log(`   Query: "${testCase.query}"`);
    
    try {
      const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: testCase.query,
          enablePersonaDetection: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const responseText = data.response || '';
        
        // Check for expected mentions
        const foundMentions = testCase.expectedMentions.filter(mention => 
          responseText.toLowerCase().includes(mention.toLowerCase())
        );
        
        const successRate = foundMentions.length / testCase.expectedMentions.length;
        const passed = successRate >= 0.6; // 60% threshold
        
        if (passed) results.passedTests++;
        
        // Track specific metrics
        if (responseText.toLowerCase().includes('live industry project')) {
          results.liveProjectMentions++;
        }
        
        if (testCase.testType === 'pricing' && responseText.includes('$740')) {
          results.pricingAccuracy++;
        }
        
        if (testCase.testType === 'crag' && responseText.length > 300) {
          results.cragEnhancement++;
        }
        
        console.log(`   ${passed ? '✅' : '❌'} Success Rate: ${(successRate * 100).toFixed(1)}%`);
        console.log(`   📊 Found: ${foundMentions.length}/${testCase.expectedMentions.length} mentions`);
        console.log(`   🤖 Agent: ${data.agent}`);
        console.log(`   📝 Length: ${responseText.length} chars`);
        
        if (foundMentions.length < testCase.expectedMentions.length) {
          const missing = testCase.expectedMentions.filter(m => !foundMentions.includes(m));
          console.log(`   ⚠️  Missing: ${missing.join(', ')}`);
        }
        
        // Show response preview
        console.log(`   💬 Preview: ${responseText.substring(0, 150)}...`);
        
        results.detailedResults.push({
          test: index + 1,
          type: testCase.testType,
          track: testCase.track,
          passed,
          successRate,
          foundMentions: foundMentions.length,
          totalMentions: testCase.expectedMentions.length,
          responseLength: responseText.length,
          agent: data.agent
        });
        
      } else {
        console.log(`   ❌ API Error: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Request Failed: ${error.message}`);
    }
  }
  
  // Generate comprehensive report
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));
  
  console.log(`\n🎯 Overall Performance:`);
  console.log(`   Tests Passed: ${results.passedTests}/${results.totalTests} (${(results.passedTests/results.totalTests*100).toFixed(1)}%)`);
  console.log(`   Live Industry Project Mentions: ${results.liveProjectMentions}/${results.totalTests} (${(results.liveProjectMentions/results.totalTests*100).toFixed(1)}%)`);
  
  const pricingTests = testCases.filter(t => t.testType === 'pricing').length;
  console.log(`   Pricing Accuracy: ${results.pricingAccuracy}/${pricingTests} (${pricingTests > 0 ? (results.pricingAccuracy/pricingTests*100).toFixed(1) : 0}%)`);
  
  const cragTests = testCases.filter(t => t.testType === 'crag').length;
  console.log(`   CRAG Enhancement: ${results.cragEnhancement}/${cragTests} (${cragTests > 0 ? (results.cragEnhancement/cragTests*100).toFixed(1) : 0}%)`);
  
  console.log(`\n📈 Performance by Test Type:`);
  const testTypeStats = results.detailedResults.reduce((acc, result) => {
    if (!acc[result.type]) acc[result.type] = { passed: 0, total: 0 };
    acc[result.type].total++;
    if (result.passed) acc[result.type].passed++;
    return acc;
  }, {});
  
  Object.entries(testTypeStats).forEach(([type, stats]: [string, any]) => {
    console.log(`   ${type.toUpperCase()}: ${stats.passed}/${stats.total} (${(stats.passed/stats.total*100).toFixed(1)}%)`);
  });
  
  console.log(`\n🏆 Success Criteria:`);
  const overallSuccess = results.passedTests / results.totalTests >= 0.7;
  const lipSuccess = results.liveProjectMentions / results.totalTests >= 0.6;
  const pricingSuccess = pricingTests === 0 || results.pricingAccuracy / pricingTests >= 0.8;
  
  console.log(`   ${overallSuccess ? '✅' : '❌'} Overall Performance (≥70%): ${overallSuccess}`);
  console.log(`   ${lipSuccess ? '✅' : '❌'} Live Industry Project Coverage (≥60%): ${lipSuccess}`);
  console.log(`   ${pricingSuccess ? '✅' : '❌'} Pricing Accuracy (≥80%): ${pricingSuccess}`);
  
  const systemReady = overallSuccess && lipSuccess && pricingSuccess;
  console.log(`\n🚀 System Status: ${systemReady ? '✅ READY FOR PRODUCTION' : '⚠️ NEEDS IMPROVEMENT'}`);
  
  if (!systemReady) {
    console.log(`\n💡 Recommendations:`);
    if (!overallSuccess) console.log(`   - Improve overall response quality and coverage`);
    if (!lipSuccess) console.log(`   - Enhance Live Industry Project information in responses`);
    if (!pricingSuccess) console.log(`   - Fix pricing information accuracy`);
  }
  
  return results;
}

// Run the comprehensive test
test3OptionStructure().catch(console.error);