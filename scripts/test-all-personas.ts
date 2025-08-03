import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { PersonaDetector } from '@/lib/personas/persona-detector';

async function testAllPersonas() {
  console.log('🧪 Testing all bootcamp persona detection patterns...\n');
  
  const detector = new PersonaDetector();
  
  const personaTests = [
    {
      name: 'Sofia Martinez',
      queries: [
        "I have 8 years marketing experience. Will my skills transfer to tech?",
        "I'm 34 with family responsibilities. Am I too old to switch to tech?", 
        "Marketing professional looking to transition to business analysis"
      ]
    },
    {
      name: 'Callum Hudson', 
      queries: [
        "I'm Australian with admin background. Do I need a uni degree to become a BA?",
        "Local Australian worker wanting to get into business analysis",
        "Admin background, looking at career change to tech"
      ]
    },
    {
      name: 'Tyler Brooks',
      queries: [
        "I just finished high school. Do I need uni or can I get into tech directly?",
        "Recent graduate, should I go to university or start working?",
        "High school graduate interested in tech career"
      ]
    },
    {
      name: 'Dr. Anjali Menon',
      queries: [
        "I'm a physiotherapist. Can I switch to health tech or digital health roles?",
        "Healthcare professional looking to move into tech",
        "Physiotherapy background, interested in health technology"
      ]
    },
    {
      name: 'Camila Ribeiro',
      queries: [
        "I have marketing and creative background. Can I move into UX or BA roles?",
        "Creative professional transitioning to tech",
        "Marketing background, interested in UX design"
      ]
    }
  ];
  
  for (const personaTest of personaTests) {
    console.log(`\n🎯 Testing ${personaTest.name} detection:`);
    console.log('=' .repeat(50));
    
    for (const query of personaTest.queries) {
      console.log(`\n📝 Query: "${query}"`);
      
      // Test signal extraction
      const analysis = detector.analyzeQuery(query);
      console.log(`📊 Signals: ${analysis.signals.join(', ')}`);
      
      // Test full detection
      const detection = await detector.detectPersona(query);
      console.log(`👤 Detected: ${detection.persona?.archetypeName} (${detection.confidence}%)`);
      console.log(`🎯 Matched: ${detection.signals.join(', ')}`);
      
      if (detection.persona?.archetypeName?.includes(personaTest.name.split(' ')[0])) {
        console.log(`✅ CORRECT persona detected`);
      } else {
        console.log(`❌ WRONG persona (expected ${personaTest.name})`);
      }
    }
  }
}

testAllPersonas().catch(console.error);