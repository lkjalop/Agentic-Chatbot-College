import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { PersonaDetector } from '@/lib/personas/persona-detector';
import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function debugPersonaDetection() {
  console.log('🔍 Debugging Persona Detection System...\n');
  
  try {
    // Test 1: Check database connection and persona data
    console.log('1️⃣ Checking persona database...');
    const personas = await db().select().from(studentPersonas);
    console.log(`Found ${personas.length} personas in database`);
    
    if (personas.length === 0) {
      console.log('❌ No personas found in database! Need to populate first.');
      return;
    }
    
    // Show a few persona examples
    console.log('\nSample personas:');
    personas.slice(0, 3).forEach(persona => {
      console.log(`- ${persona.archetypeName} (${persona.archetypeCode})`);
    });
    
    // Test 2: Check PersonaDetector initialization
    console.log('\n2️⃣ Testing PersonaDetector...');
    const detector = new PersonaDetector();
    
    // Test 3: Test signal extraction
    console.log('\n3️⃣ Testing signal extraction...');
    const testQuery = "I have a 485 visa and struggling to get interviews";
    const signals = detector.analyzeQuery(testQuery);
    console.log(`Query: "${testQuery}"`);
    console.log(`Signals: ${signals.signals.join(', ')}`);
    console.log(`Stage: ${signals.stage}`);
    console.log(`Emotions: ${signals.emotions.join(', ')}`);
    
    // Test 4: Full persona detection
    console.log('\n4️⃣ Testing full persona detection...');
    const detection = await detector.detectPersona(testQuery);
    console.log(`Detected persona: ${detection.persona?.archetypeName || 'None'}`);
    console.log(`Confidence: ${detection.confidence}%`);
    console.log(`Signals matched: ${detection.signals.join(', ')}`);
    console.log(`Journey stage: ${detection.journeyStage}`);
    console.log(`Emotional needs: ${detection.emotionalNeeds.join(', ')}`);
    
    // Test 5: Test multiple queries
    console.log('\n5️⃣ Testing multiple persona patterns...');
    const testQueries = [
      'I used to work in marketing but want to transition to tech',
      'I am a single mum with kids - can I realistically do this program?',
      'I already know React but my English is not confident'
    ];
    
    for (const query of testQueries) {
      const result = await detector.detectPersona(query);
      console.log(`\nQuery: "${query.substring(0, 50)}..."`);
      console.log(`Persona: ${result.persona?.archetypeName || 'None'} (${result.confidence}%)`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run debug
debugPersonaDetection().catch(console.error);