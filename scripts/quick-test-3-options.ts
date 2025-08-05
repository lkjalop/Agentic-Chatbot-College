// Quick test to see if 3-option structure is working

async function quickTest() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  const testQueries = [
    "How much does the Business Analyst bootcamp cost?",
    "What are the pricing options for Full Stack Developer?",
    "What's the Live Industry Project?",
    "I'm an international student needing Australian work experience"
  ];
  
  console.log('🚀 Quick Test - 3-Option Structure\n');
  
  for (const [i, query] of testQueries.entries()) {
    console.log(`${i + 1}. "${query}"`);
    
    try {
      const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, enablePersonaDetection: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        const text = data.response || '';
        
        const hasOptions = text.includes('Option 1') || text.includes('Option 2') || text.includes('Option 3');
        const hasLIP = text.toLowerCase().includes('live industry project');
        const hasPricing = text.includes('$740');
        
        console.log(`   ${hasOptions ? '✅' : '❌'} Options: ${hasOptions}`);
        console.log(`   ${hasLIP ? '✅' : '❌'} Live Industry Project: ${hasLIP}`);
        console.log(`   ${hasPricing ? '✅' : '❌'} Pricing: ${hasPricing}`);
        console.log(`   🤖 Agent: ${data.agent}`);
        console.log(`   📝 Preview: ${text.substring(0, 100)}...`);
        console.log('');
      } else {
        console.log(`   ❌ Failed: ${response.status}\n`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }
}

quickTest().catch(console.error);