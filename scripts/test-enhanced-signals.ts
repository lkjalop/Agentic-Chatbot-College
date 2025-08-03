import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { PersonaDetector } from '@/lib/personas/persona-detector';

async function testEnhancedSignals() {
  console.log('🧪 Testing Enhanced Signal Detection...\n');
  
  const detector = new PersonaDetector();
  
  const testQueries = [
    "I have a 485 visa and struggling to get interviews",
    "I have a 485 visa and I'm frustrated with getting interviews", 
    "I'm from India on 485 visa and can't get job interviews",
    "I used to work in marketing but want to transition to tech",
    "I'm a single mum with kids - can I realistically do this program?",
    "I already know React but my English is not confident"
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    
    // Test signal extraction
    const analysis = detector.analyzeQuery(query);
    console.log(`Signals: ${analysis.signals.join(', ')}`);
    console.log(`Stage: ${analysis.stage}`);
    console.log(`Emotions: ${analysis.emotions.join(', ')}`);
    
    // Test full persona detection
    const detection = await detector.detectPersona(query);
    console.log(`Persona: ${detection.persona?.archetypeName || 'None'} (${detection.confidence}%)`);
    console.log(`Matched: ${detection.signals.join(', ')}`);
  }
}

testEnhancedSignals().catch(console.error);