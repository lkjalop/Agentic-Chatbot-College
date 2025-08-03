import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

interface TestScenario {
  persona: string;
  queries: string[];
  expectedSignals: string[];
  minConfidence: number;
}

async function testTop6Personas() {
  console.log('🎯 Testing Top 6 Personas with Targeted Scenarios...\n');
  
  const apiUrl = 'http://localhost:3001/api/search/personalized';
  
  const testScenarios: TestScenario[] = [
    {
      persona: 'Rohan Patel',
      queries: [
        'I have a 485 visa and struggling to get interviews in Australia',
        'I am frustrated with job rejections - my engineering background from India is not helping',
        'I drive Uber while looking for tech jobs and my visa time is running out'
      ],
      expectedSignals: ['visa:485', 'emotional:frustrated', 'background:engineer'],
      minConfidence: 30
    },
    {
      persona: 'Li Wen', 
      queries: [
        'I am from China and want to transition from economics to tech career',
        'I have PR but unsure about changing from economics to programming',
        'I am uncertain about my career change from business to technology'
      ],
      expectedSignals: ['visa:PR', 'background:economics', 'emotional:uncertain'],
      minConfidence: 25
    },
    {
      persona: 'Sandeep Shrestha',
      queries: [
        'I have a 500 student visa and hopeful about getting into tech',
        'I am on student visa from Nepal and excited about programming',
        'I am motivated to learn technology and make career in Australia'
      ],
      expectedSignals: ['visa:500', 'emotional:hopeful', 'emotional:motivated'],
      minConfidence: 25
    },
    {
      persona: 'Sarah Thompson',
      queries: [
        'I am Australian citizen but cautious about career change',
        'I am careful about choosing the right tech program as Australian local',
        'I want to be sure this is right path as I am from Australia'
      ],
      expectedSignals: ['visa:citizen', 'emotional:cautious'],
      minConfidence: 25
    },
    {
      persona: 'Minh Nguyen',
      queries: [
        'I am from Vietnam with PR and need flexible study for family',
        'I have kids and work commitments - can I still do this program?',
        'I am hopeful but need to balance study with being a parent'
      ],
      expectedSignals: ['visa:PR', 'emotional:hopeful'],
      minConfidence: 25
    },
    {
      persona: 'Kwame Mensah',
      queries: [
        'I am interested in cybersecurity and have engineering background',
        'I want to specialize in cybersecurity with my mechanical engineering experience',
        'I am hopeful about moving from engineering to cybersecurity field'
      ],
      expectedSignals: ['background:engineer', 'emotional:hopeful'],
      minConfidence: 25
    }
  ];
  
  let overallResults = {
    totalTests: 0,
    successfulDetections: 0,
    averageConfidence: 0
  };
  
  for (const scenario of testScenarios) {
    console.log(`\n👤 Testing Persona: ${scenario.persona}`);
    console.log('=' .repeat(50));
    
    let personaResults = {
      tests: 0,
      detections: 0,
      confidences: [] as number[]
    };
    
    for (const query of scenario.queries) {
      console.log(`\n🧪 Query: "${query}"`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            enablePersonaDetection: true
          })
        });
        
        const data = await response.json();
        
        const detectedPersona = data.diagnostics?.personaMatch?.name;
        const confidence = data.diagnostics?.personaMatch?.similarity || 0;
        const isCorrectPersona = detectedPersona === scenario.persona;
        const meetsMinConfidence = confidence >= scenario.minConfidence;
        
        const status = isCorrectPersona && meetsMinConfidence ? '✅' : '❌';
        console.log(`${status} Detected: ${detectedPersona} (${confidence}% confidence)`);
        
        if (isCorrectPersona && meetsMinConfidence) {
          personaResults.detections++;
        }
        
        personaResults.tests++;
        personaResults.confidences.push(confidence);
        
        // Show response type
        const responseType = data.blocked ? 'security_blocked' : 
                           confidence > 25 ? 'personalized' : 'generic';
        console.log(`📋 Response Type: ${responseType}`);
        
        overallResults.totalTests++;
        if (isCorrectPersona && meetsMinConfidence) {
          overallResults.successfulDetections++;
        }
        
      } catch (error) {
        console.error(`❌ Test failed: ${error}`);
        personaResults.tests++;
        overallResults.totalTests++;
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const personaSuccessRate = (personaResults.detections / personaResults.tests) * 100;
    const avgConfidence = personaResults.confidences.reduce((a, b) => a + b, 0) / personaResults.confidences.length;
    
    console.log(`\n📊 ${scenario.persona} Results:`);
    console.log(`Success Rate: ${personaResults.detections}/${personaResults.tests} (${personaSuccessRate.toFixed(1)}%)`);
    console.log(`Average Confidence: ${avgConfidence.toFixed(1)}%`);
  }
  
  // Overall results
  const overallSuccessRate = (overallResults.successfulDetections / overallResults.totalTests) * 100;
  
  console.log('\n🎯 OVERALL RESULTS');
  console.log('=' .repeat(50));
  console.log(`Total Tests: ${overallResults.totalTests}`);
  console.log(`Successful Detections: ${overallResults.successfulDetections}`);
  console.log(`Success Rate: ${overallSuccessRate.toFixed(1)}%`);
  
  if (overallSuccessRate >= 80) {
    console.log('\n🎉 EXCELLENT! System ready for production!');
  } else if (overallSuccessRate >= 60) {
    console.log('\n✅ GOOD! System working well with minor tuning needed.');
  } else {
    console.log('\n⚠️ NEEDS IMPROVEMENT: Consider adding more signals or lowering thresholds.');
  }
}

testTop6Personas().catch(console.error);