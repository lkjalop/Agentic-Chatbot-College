// Test script to check if the deployed API is working

async function testDeployedAPI() {
  const deploymentUrl = 'https://agentic-rag-system-iyp3hwbad-lkjalop-4738s-projects.vercel.app';
  
  console.log('🧪 Testing deployed API...\n');
  
  // Test 1: Check if API is accessible
  console.log('1️⃣ Testing API health...');
  try {
    const healthResponse = await fetch(`${deploymentUrl}/api/search/personalized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Hello, can you help me?',
        enablePersonaDetection: true
      })
    });
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Status Text: ${healthResponse.statusText}`);
    
    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('   ✅ API is responding!');
      console.log(`   Response preview: ${data.response?.substring(0, 100)}...`);
    } else {
      console.log('   ❌ API returned error status');
      const errorText = await healthResponse.text();
      console.log(`   Error: ${errorText}`);
    }
  } catch (error) {
    console.log('   ❌ Failed to reach API');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 2: Test with James Chen persona query
  console.log('\n2️⃣ Testing James Chen persona query...');
  try {
    const jamesQuery = "I'm studying Computer Science at university but have never worked on real industry projects - will this give me practical experience?";
    
    const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: jamesQuery,
        enablePersonaDetection: true
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Query processed successfully');
      console.log(`   Detected persona: ${data.diagnostics?.personaMatch?.name || 'Unknown'}`);
      console.log(`   Agent used: ${data.agent || 'Unknown'}`);
    } else {
      console.log('   ❌ Query failed');
    }
  } catch (error) {
    console.log('   ❌ Failed to process query');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 3: Check main page with Basic Auth
  console.log('\n3️⃣ Testing main page access (with Basic Auth)...');
  try {
    const authString = Buffer.from('student:ea2024').toString('base64');
    const mainResponse = await fetch(deploymentUrl, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    
    console.log(`   Status: ${mainResponse.status}`);
    if (mainResponse.ok) {
      console.log('   ✅ Main page accessible with auth');
    } else {
      console.log('   ❌ Main page not accessible');
    }
  } catch (error) {
    console.log('   ❌ Failed to reach main page');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('- The API endpoints should be accessible without authentication');
  console.log('- The main UI requires Basic Auth (username: student, password: ea2024)');
  console.log('- If API is failing, check Vercel environment variables');
}

// Run the test
testDeployedAPI().catch(console.error);