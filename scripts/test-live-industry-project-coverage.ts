// Test if the system properly mentions Live Industry Project information

async function testLiveIndustryProjectCoverage() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  const testQueries = [
    "What's the cost of the Business Analyst bootcamp?",
    "How long is the Full Stack Developer program?",
    "What happens after the 4-week bootcamp?",
    "Is there a practical project component?",
    "What's included in the complete program?",
    "Can I get real work experience?",
    "How much time commitment is required total?",
    "What's the difference between bootcamp and live project?"
  ];
  
  console.log('🔍 Testing Live Industry Project Coverage\n');
  
  let mentionCount = 0;
  const results = [];
  
  for (const [i, query] of testQueries.entries()) {
    console.log(`\n${i + 1}. "${query}"`);
    
    try {
      const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          enablePersonaDetection: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const text = data.response || '';
        
        // Check for Live Industry Project mentions
        const lipMentions = [
          'live industry project',
          '6-week',
          '6-12 week',
          'optional project',
          'real clients',
          'after the bootcamp'
        ];
        
        const foundMentions = lipMentions.filter(mention => 
          text.toLowerCase().includes(mention.toLowerCase())
        );
        
        const hasMention = foundMentions.length > 0;
        if (hasMention) mentionCount++;
        
        console.log(`   ${hasMention ? '✅' : '❌'} LIP mentioned: ${foundMentions.join(', ') || 'None'}`);
        console.log(`   🤖 Agent: ${data.agent}`);
        console.log(`   📝 Response: ${text.substring(0, 150)}...`);
        
        results.push({
          query,
          mentioned: hasMention,
          mentions: foundMentions,
          agent: data.agent,
          response: text
        });
      } else {
        console.log(`   ❌ Failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 LIVE INDUSTRY PROJECT COVERAGE ANALYSIS');
  console.log('='.repeat(60));
  
  console.log(`\n📈 Coverage Rate: ${mentionCount}/${testQueries.length} queries (${(mentionCount/testQueries.length*100).toFixed(1)}%)`);
  
  if (mentionCount === 0) {
    console.log('\n🚨 CRITICAL ISSUE: Live Industry Project is NOT being mentioned!');
    console.log('\n💡 This suggests:');
    console.log('   1. The vector database doesn\'t have LIP information');
    console.log('   2. The fallback responses don\'t include LIP details');
    console.log('   3. The response generation is missing key program components');
  } else if (mentionCount < testQueries.length / 2) {
    console.log('\n⚠️  LOW COVERAGE: Live Industry Project mentioned in less than 50% of relevant queries');
  } else {
    console.log('\n✅ GOOD COVERAGE: Live Industry Project being mentioned appropriately');
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Add specific vectors about Live Industry Project pricing and structure');
  console.log('2. Update agent response templates to include LIP information');
  console.log('3. Ensure all career track agents know about the optional 6-week extension');
  console.log('4. Add training data specifically about combined bootcamp + LIP offerings');
  
  return results;
}

// Run the test
testLiveIndustryProjectCoverage().catch(console.error);