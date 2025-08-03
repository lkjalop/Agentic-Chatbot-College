import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function debugResponseGeneration() {
  console.log('🔍 Debugging Response Generation System...\n');
  
  const testQueries = [
    "I want to become a data analyst using AI tools",
    "I'm interested in cybersecurity but have no IT background",
    "Want to learn coding and build websites"
  ];
  
  for (const query of testQueries) {
    console.log(`\n🧪 Testing Query: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:3002/api/search/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          enablePersonaDetection: true
        })
      });
      
      const data = await response.json();
      
      console.log(`📊 Response Agent: ${data.agent}`);
      console.log(`📊 Intent Type: ${data.intent?.type}`);
      console.log(`📊 Persona Detection: ${data.personaMatch?.name} (${data.personaMatch?.similarity}%)`);
      console.log(`📊 Results Count: ${data.results?.length || 0}`);
      console.log(`📝 Response: ${data.response?.substring(0, 150)}...`);
      
      // Check if response is using fallback pattern
      if (data.response?.includes("Hey! I'd love to help you figure out if our Business Analyst bootcamp")) {
        console.log('⚠️ USING FALLBACK RESPONSE - Not using empathetic response generation');
      } else {
        console.log('✅ Using proper response generation');
      }
      
    } catch (error) {
      console.error(`❌ Error testing query: ${error}`);
    }
    
    console.log('─'.repeat(80));
  }
}

debugResponseGeneration().catch(console.error);