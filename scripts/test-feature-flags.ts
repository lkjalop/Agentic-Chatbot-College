// Test feature flags on live system

async function testFeatureFlags() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  console.log('🚀 Testing Feature Flags on Live System');
  
  try {
    // Make a request that would trigger different routing
    const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: "What is Business Analyst training?", 
        enablePersonaDetection: false 
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`🤖 Agent Returned: ${data.agent}`);
      console.log(`📊 Intent Type: ${data.intent?.type || 'unknown'}`);
      console.log(`🎯 Reasoning: ${data.diagnostics?.reasoning || 'none'}`);
      
      // Check if the response indicates legacy or new system
      const reasoning = data.diagnostics?.reasoning || '';
      const isLegacySystem = reasoning.includes('legacy') || reasoning.includes('rollback');
      const isNewSystem = reasoning.includes('Option 7') || reasoning.includes('Career Track');
      
      console.log(`\n📈 System Analysis:`);
      console.log(`   Legacy System: ${isLegacySystem}`);
      console.log(`   New System (Option 7): ${isNewSystem}`);
      console.log(`   Expected Agent for BA query: business_analyst`);
      console.log(`   Actual Agent: ${data.agent}`);
      console.log(`   Routing Working: ${data.agent === 'business_analyst'}`);
      
      // Expected: business_analyst agent with new system
      if (data.agent === 'business_analyst' && isNewSystem) {
        console.log(`\n✅ SUCCESS: New routing system is active!`);
      } else if (data.agent === 'knowledge' && isLegacySystem) {
        console.log(`\n⚠️  LEGACY: System is using legacy routing`);
        console.log(`   This means feature flags are not properly configured`);
      } else {
        console.log(`\n❌ UNEXPECTED: Routing behavior is inconsistent`);
      }
      
    } else {
      console.log(`❌ API Failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

testFeatureFlags().catch(console.error);