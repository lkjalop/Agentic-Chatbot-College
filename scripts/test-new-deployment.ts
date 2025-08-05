// Test script to check if the new deployment is working

async function testNewDeployment() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  
  console.log('🧪 Testing new deployment with environment variables...\n');
  
  // Test 1: Check main page with Basic Auth
  console.log('1️⃣ Testing main page access (with Basic Auth)...');
  try {
    const authString = Buffer.from('student:ea2024').toString('base64');
    const mainResponse = await fetch(deploymentUrl, {
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    
    console.log(`   Status: ${mainResponse.status}`);
    if (mainResponse.ok) {
      console.log('   ✅ Main page accessible with auth!');
    } else {
      console.log('   ❌ Main page not accessible');
    }
  } catch (error) {
    console.log('   ❌ Failed to reach main page');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 2: Check if API is accessible
  console.log('\n2️⃣ Testing API endpoint...');
  try {
    const apiResponse = await fetch(`${deploymentUrl}/api/search/personalized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Hello, can you help me with Business Analysis?',
        enablePersonaDetection: true
      })
    });
    
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Status Text: ${apiResponse.statusText}`);
    
    if (apiResponse.ok) {
      const data = await apiResponse.json();
      console.log('   ✅ API is responding!');
      console.log(`   Response preview: ${data.response?.substring(0, 100)}...`);
      console.log(`   Agent: ${data.agent || 'Unknown'}`);
      console.log(`   Persona detected: ${data.diagnostics?.personaMatch?.name || 'None'}`);
    } else {
      console.log('   ❌ API returned error status');
      const errorText = await apiResponse.text();
      console.log(`   Error preview: ${errorText.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log('   ❌ Failed to reach API');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 3: Test with James Chen persona query
  console.log('\n3️⃣ Testing James Chen persona query...');
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
      console.log(`   Response preview: ${data.response?.substring(0, 150)}...`);
    } else {
      console.log('   ❌ Query failed');
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Failed to process query');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 4: Test with Hanh Nguyen Bui persona query
  console.log('\n4️⃣ Testing Hanh Nguyen Bui persona query...');
  try {
    const hanhQuery = "Do you work with structured companies or just chaotic startups? I prefer clear processes and defined roles.";
    
    const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: hanhQuery,
        enablePersonaDetection: true
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ Query processed successfully');
      console.log(`   Detected persona: ${data.diagnostics?.personaMatch?.name || 'Unknown'}`);
      console.log(`   Agent used: ${data.agent || 'Unknown'}`);
      console.log(`   Response preview: ${data.response?.substring(0, 150)}...`);
    } else {
      console.log('   ❌ Query failed');
      console.log(`   Status: ${response.status}`);
    }
  } catch (error) {
    console.log('   ❌ Failed to process query');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('- Main UI requires Basic Auth (username: student, password: ea2024)');
  console.log('- API endpoints should now be working with the added environment variables');
  console.log('- The chatbot should be able to respond to queries');
}

// Run the test
testNewDeployment().catch(console.error);