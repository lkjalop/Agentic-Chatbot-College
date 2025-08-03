import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { PersonaDetector } from '@/lib/personas/persona-detector';

async function testPersonaImprovements() {
  console.log('🧪 Testing persona detection improvements...\n');
  
  const detector = new PersonaDetector();
  
  const tests = [
    {
      query: "I have 8 years marketing experience. Will my skills transfer to tech?",
      expectedPersona: "Sofia Martinez"
    },
    {
      query: "I'm Australian with admin background. Do I need a uni degree to become a BA?", 
      expectedPersona: "Callum Hudson"
    },
    {
      query: "I just finished high school. Do I need uni or can I get into tech directly?",
      expectedPersona: "Tyler Brooks"
    },
    {
      query: "I'm a physiotherapist. Can I switch to health tech roles?",
      expectedPersona: "Dr. Anjali Menon"
    },
    {
      query: "I have marketing and creative background. Can I move into UX?",
      expectedPersona: "Camila Ribeiro"
    }
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    console.log(`🎯 Testing: ${test.expectedPersona}`);
    console.log(`📝 Query: "${test.query}"`);
    
    // Get signals  
    const analysis = detector.analyzeQuery(test.query);
    console.log(`📊 Signals: ${analysis.signals.join(', ')}`);
    
    // Run detection
    const detection = await detector.detectPersona(test.query);
    console.log(`👤 Detected: ${detection.persona?.archetypeName} (${detection.confidence}%)`);
    
    const expectedFirstName = test.expectedPersona.split(' ')[0];
    if (detection.persona?.archetypeName?.includes(expectedFirstName)) {
      console.log(`✅ SUCCESS!`);
      successCount++;
    } else {
      console.log(`❌ FAILED - Expected ${test.expectedPersona}`);
    }
    
    console.log('');
  }
  
  const successRate = (successCount / tests.length) * 100;
  console.log(`\n🎯 Overall Success Rate: ${successCount}/${tests.length} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 80) {
    console.log('🎉 EXCELLENT! Persona detection is working well!');
  } else if (successRate >= 60) {
    console.log('✅ GOOD! Some improvements made but more tuning needed.');
  } else {
    console.log('⚠️ NEEDS MORE WORK: Significant improvements required.');
  }
}

testPersonaImprovements().catch(console.error);