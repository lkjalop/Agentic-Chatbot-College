// Test explicit Business Analyst routing

async function testExplicitBA() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  const testQueries = [
    "Business Analyst program options",
    "What are the business analyst course options?", 
    "I want to learn about business analyst career",
    "Requirements for business analyst bootcamp"
  ];
  
  console.log('🚀 Testing Explicit Business Analyst Routing\n');
  
  for (const [i, query] of testQueries.entries()) {
    console.log(`${i + 1}. "${query}"`);
    
    try {
      const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, enablePersonaDetection: false })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   🤖 Agent: ${data.agent}`);
        console.log(`   ✅ Correct: ${data.agent === 'business_analyst'}`);
        
        if (data.agent === 'business_analyst') {
          const text = data.response || '';
          const hasOptions = text.includes('Option 1') || text.includes('Option 2') || text.includes('Option 3');
          const hasLIP = text.toLowerCase().includes('live industry project');
          console.log(`   📋 Has Options: ${hasOptions}`);
          console.log(`   🏭 Has LIP: ${hasLIP}`);
          if (hasOptions && hasLIP) {
            console.log(`   🎉 SUCCESS: Full 3-option structure working!`);
          }
        }
        console.log('');
      } else {
        console.log(`   ❌ Failed: ${response.status}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

testExplicitBA().catch(console.error);