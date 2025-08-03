import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { PersonaDetector } from '@/lib/personas/persona-detector';

async function testRohanDetection() {
  console.log('🧪 Testing Rohan Patel persona detection...\n');
  
  const detector = new PersonaDetector();
  
  const testQueries = [
    "My 485 visa expires in 18 months and I haven't found a job. Is it worth starting a bootcamp now?",
    "I studied mechanical engineering but now switching to IT. Am I wasting my education?",
    "I drive Uber while job hunting and feel like a failure after 8 interview rejections",
    "I have 485 visa and struggling to get interviews",
    "Mechanical engineer switching to tech, frustrated with job hunt"
  ];
  
  for (const query of testQueries) {
    console.log(`\n🔍 Query: "${query}"`);
    
    // Test signal extraction
    const analysis = detector.analyzeQuery(query);
    console.log(`📊 Signals detected: ${analysis.signals.join(', ')}`);
    console.log(`🎯 Journey stage: ${analysis.stage}`);
    console.log(`😟 Emotions: ${analysis.emotions.join(', ')}`);
    
    // Test full persona detection
    const detection = await detector.detectPersona(query);
    console.log(`👤 Detected persona: ${detection.persona?.archetypeName || 'None'} (${detection.confidence}%)`);
    console.log(`🎯 Matched signals: ${detection.signals.join(', ')}`);
    
    if (detection.confidence < 25) {
      console.log('❌ LOW CONFIDENCE - would use default persona');
    } else {
      console.log('✅ SUFFICIENT CONFIDENCE');
    }
  }
}

testRohanDetection().catch(console.error);