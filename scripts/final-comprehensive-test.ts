// Final comprehensive test to verify all fixes

async function finalTest() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  const tests = [
    {
      name: "Direct BA Query",
      query: "I want business analyst training",
      expectAgent: "business_analyst"
    },
    {
      name: "BA Options Query", 
      query: "Business analyst course options",
      expectAgent: "business_analyst"
    },
    {
      name: "Data Science Query",
      query: "I want to learn data science",
      expectAgent: "data_ai"
    },
    {
      name: "Options Query Generic",
      query: "What are my options for fullstack developer?",
      expectAgent: "fullstack" 
    }
  ];
  
  console.log('🔬 FINAL COMPREHENSIVE TEST');
  console.log('========================================');
  console.log(`Testing: ${deploymentUrl}`);
  console.log('');
  
  for (const [i, test] of tests.entries()) {
    console.log(`${i + 1}. ${test.name}: "${test.query}"`);
    
    try {
      const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: test.query, 
          enablePersonaDetection: false 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const text = data.response || '';
        
        // Check routing
        const routingCorrect = data.agent === test.expectAgent;
        console.log(`   🎯 Agent: ${data.agent} (Expected: ${test.expectAgent}) ${routingCorrect ? '✅' : '❌'}`);
        
        // Check for 3-option structure
        const hasOptions = text.includes('Option 1') && text.includes('Option 2') && text.includes('Option 3');
        const hasLIP = text.toLowerCase().includes('live industry project');
        const hasPricing = text.includes('$740');
        const hasGeneric = text.includes('I understand what you');
        
        console.log(`   📋 3-Options: ${hasOptions ? '✅' : '❌'}`);
        console.log(`   🏭 Live Industry Project: ${hasLIP ? '✅' : '❌'}`);
        console.log(`   💰 Pricing: ${hasPricing ? '✅' : '❌'}`);
        console.log(`   ⚠️  Generic Response: ${hasGeneric ? '❌' : '✅'}`);
        
        if (hasOptions && hasLIP && !hasGeneric) {
          console.log(`   🎉 SUCCESS: Full 3-option structure working!`);
        } else if (hasGeneric) {
          console.log(`   💬 Response: "${text.substring(0, 80)}..."`);
        }
        
        console.log('');
      } else {
        console.log(`   ❌ API Error: ${response.status}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}\n`);
    }
  }
  
  console.log('========================================');
  console.log('🎯 EXPECTED RESULTS:');
  console.log('✅ All queries should route to correct career track agents');
  console.log('✅ All responses should include Option 1, Option 2, Option 3');
  console.log('✅ All responses should mention Live Industry Project');
  console.log('✅ No generic "I understand what you\'re going through" responses');
  console.log('========================================');
}

finalTest().catch(console.error);