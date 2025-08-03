// Test script to verify course recommendations are working properly
async function testCourseRecommendations() {
  const testQueries = [
    'I want to learn data analysis and Python',
    'I am interested in cybersecurity and AWS',
    'I want to become a full stack developer',
    'I need help with business analysis and requirements',
    'What courses do you offer?'
  ];

  console.log('🧪 Testing Course Recommendation System\n');

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    
    try {
      const response = await fetch('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          enablePersonaDetection: false
        }),
      });

      if (!response.ok) {
        console.log(`❌ Error: ${response.status} ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      console.log(`Response: ${data.response || 'No response'}`);
      console.log(`Agent: ${data.agent || 'No agent'}`);
      
      if (data.results && data.results.length > 0) {
        console.log(`Top course: ${data.results[0].metadata?.title || 'No title'}`);
      }
      
      console.log('---\n');
    } catch (error) {
      console.error(`❌ Error testing query "${query}":`, error.message);
      console.log('---\n');
    }
  }
}

// Run the test if this is being executed directly
if (typeof window === 'undefined') {
  testCourseRecommendations().catch(console.error);
}