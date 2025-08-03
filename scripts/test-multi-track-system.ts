import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function testMultiTrackSystem() {
  console.log('🎯 Testing Multi-Track Course Advisory System...\n');
  
  const apiUrl = 'http://localhost:3001/api/search/personalized';
  
  const testQueries = [
    {
      query: "I want to become a data analyst using AI tools",
      expectedTrack: "Data & AI"
    },
    {
      query: "I'm interested in cybersecurity but have no IT background",
      expectedTrack: "Cybersecurity"
    },
    {
      query: "Want to learn coding and build websites",
      expectedTrack: "Full Stack"
    },
    {
      query: "I have marketing experience and want to transition to tech without coding",
      expectedTrack: "Business Analyst"
    },
    {
      query: "What's the difference between your courses?",
      expectedTrack: "Comparison"
    },
    {
      query: "How much does it cost and can I pay in installments?",
      expectedTrack: "Pricing/General"
    }
  ];
  
  let successCount = 0;
  
  for (const test of testQueries) {
    console.log(`🧪 Testing: ${test.expectedTrack} Intent`);
    console.log(`📝 Query: "${test.query}"`);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: test.query,
          enablePersonaDetection: true
        })
      });
      
      const data = await response.json();
      const responseText = data.response || '';
      
      console.log(`📝 Response Preview: ${responseText.substring(0, 200)}...`);
      
      // Check if response mentions relevant track details
      let mentionsRelevantTrack = false;
      
      if (test.expectedTrack === "Data & AI" && 
          (responseText.includes('Data & AI') || responseText.includes('Python') || responseText.includes('analytics'))) {
        mentionsRelevantTrack = true;
      } else if (test.expectedTrack === "Cybersecurity" && 
                (responseText.includes('Cybersecurity') || responseText.includes('security') || responseText.includes('AWS'))) {
        mentionsRelevantTrack = true;
      } else if (test.expectedTrack === "Full Stack" && 
                (responseText.includes('Full Stack') || responseText.includes('developer') || responseText.includes('coding'))) {
        mentionsRelevantTrack = true;
      } else if (test.expectedTrack === "Business Analyst" && 
                (responseText.includes('Business Analyst') || responseText.includes('Agile') || responseText.includes('no coding'))) {
        mentionsRelevantTrack = true;
      } else if (test.expectedTrack === "Comparison" && 
                (responseText.includes('tracks') || responseText.includes('options') || responseText.includes('4 course'))) {
        mentionsRelevantTrack = true;
      } else if (test.expectedTrack === "Pricing/General" && 
                (responseText.includes('$740') || responseText.includes('$185') || responseText.includes('payment'))) {
        mentionsRelevantTrack = true;
      }
      
      // Check for course advisor style
      const isConversational = responseText.includes('I') || responseText.includes('you') || responseText.includes('Let') || responseText.includes('Hey');
      const hasSpecifics = responseText.includes('$740') || responseText.includes('$185') || responseText.includes('4-week');
      const hasNextStep = responseText.includes('book') || responseText.includes('consultation') || responseText.includes('enroll') || responseText.includes('chat');
      
      if (mentionsRelevantTrack) {
        console.log(`✅ TRACK RELEVANCE: Correctly identified ${test.expectedTrack}`);
        successCount++;
      } else {
        console.log(`❌ TRACK RELEVANCE: Failed to identify ${test.expectedTrack}`);
      }
      
      console.log(`📊 Quality Check:`);
      console.log(`  - Conversational: ${isConversational ? '✅' : '❌'}`);
      console.log(`  - Has Specifics: ${hasSpecifics ? '✅' : '❌'}`);
      console.log(`  - Has Next Step: ${hasNextStep ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`❌ Test failed: ${error}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  const successRate = (successCount / testQueries.length) * 100;
  console.log(`🎯 MULTI-TRACK SYSTEM RESULTS:`);
  console.log(`Track Recognition: ${successCount}/${testQueries.length} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 80) {
    console.log('🎉 EXCELLENT! Multi-track system is working well!');
  } else if (successRate >= 60) {
    console.log('✅ GOOD! Some improvements made but more tuning needed.');
  } else {
    console.log('⚠️ NEEDS WORK: Track recognition needs improvement.');
  }
}

testMultiTrackSystem().catch(console.error);