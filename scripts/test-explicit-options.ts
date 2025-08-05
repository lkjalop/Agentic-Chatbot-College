// Test very explicit options query

async function testExplicitOptions() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  const explicitQuery = "What are the options for Business Analyst program?";
  
  console.log('🚀 Testing Explicit Options Query');
  console.log(`Query: "${explicitQuery}"`);
  
  try {
    const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: explicitQuery, 
        enablePersonaDetection: false 
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const text = data.response || '';
      
      console.log(`🤖 Agent: ${data.agent}`);
      console.log(`📝 Response Length: ${text.length} characters`);
      console.log(`📊 Analysis:`);
      console.log(`   Option 1: ${text.includes('Option 1')}`);
      console.log(`   Option 2: ${text.includes('Option 2')}`);
      console.log(`   Option 3: ${text.includes('Option 3')}`);
      console.log(`   Live Industry Project: ${text.toLowerCase().includes('live industry project')}`);
      console.log(`   4-week: ${text.includes('4-week')}`);
      console.log(`   6-week: ${text.includes('6-week')}`);
      console.log(`   10-week: ${text.includes('10-week')}`);
      console.log(`   $740 AUD: ${text.includes('$740 AUD')}`);
      
      console.log(`\n💬 Full Response:`);
      console.log(`"${text}"`);
      
    } else {
      console.log(`❌ Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testExplicitOptions().catch(console.error);