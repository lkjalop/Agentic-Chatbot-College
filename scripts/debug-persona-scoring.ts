import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { PersonaDetector } from '@/lib/personas/persona-detector';
import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function debugPersonaScoring() {
  console.log('🔍 Debugging Persona Scoring...\n');
  
  const detector = new PersonaDetector();
  const testQuery = "I have a 485 visa and struggling to get interviews";
  
  // Step 1: Extract signals
  const analysis = detector.analyzeQuery(testQuery);
  console.log(`Query: "${testQuery}"`);
  console.log(`Signals: ${analysis.signals.join(', ')}`);
  
  // Step 2: Get all personas from database
  const personas = await db().select().from(studentPersonas);
  console.log(`\nFound ${personas.length} personas in database\n`);
  
  // Step 3: Score each persona manually
  console.log('📊 Scoring all personas:');
  
  for (const persona of personas) {
    const score = calculatePersonaScore(persona, analysis.signals);
    const signals = getMatchedSignals(persona, analysis.signals);
    
    if (score > 0) {
      console.log(`${persona.archetypeName}: ${score}% (${persona.visaType} visa, ${persona.emotionalState})`);
      console.log(`  Matched: ${signals.join(', ')}`);
    }
  }
  
  // Step 4: Test specific personas
  console.log('\n🎯 Testing specific personas:');
  
  const rohanPatel = personas.find(p => p.archetypeName === 'Rohan Patel');
  if (rohanPatel) {
    console.log(`\nRohan Patel details:`);
    console.log(`- Visa Type: ${rohanPatel.visaType}`);
    console.log(`- Emotional State: ${rohanPatel.emotionalState}`);
    console.log(`- Previous Field: ${rohanPatel.previousField}`);
    console.log(`- Location: ${rohanPatel.location}`);
    
    const score = calculatePersonaScore(rohanPatel, analysis.signals);
    const signals = getMatchedSignals(rohanPatel, analysis.signals);
    console.log(`- Score: ${score}%`);
    console.log(`- Matched signals: ${signals.join(', ')}`);
  }
}

function calculatePersonaScore(persona: any, signals: string[]): number {
  let score = 0;
  const debug = [];
  
  // Visa type matching (high weight)
  const visaSignals = signals.filter(s => s.startsWith('visa:'));
  console.log(`  Visa signals: ${visaSignals.join(', ')}`);
  console.log(`  Persona visa: ${persona.visaType}`);
  
  if (visaSignals.some(s => s.includes(persona.visaType?.toLowerCase() || ''))) {
    score += 25;
    debug.push('visa_match:+25');
  }

  // Location matching (medium weight) 
  const locationSignals = signals.filter(s => s.startsWith('location:'));
  if (persona.location && locationSignals.some(s => 
      s.includes(persona.location.toLowerCase())
  )) {
    score += 20;
    debug.push('location_match:+20');
  }

  // Regional status matching
  if (persona.isRegional && signals.some(s => s.includes('regional'))) {
    score += 15;
    debug.push('regional_match:+15');
  }

  // Background field matching (medium weight)
  const backgroundSignals = signals.filter(s => s.startsWith('background:'));
  if (persona.previousField && backgroundSignals.some(s => 
      s.includes(persona.previousField.toLowerCase().split(' ')[0])
  )) {
    score += 15;
    debug.push('background_match:+15');
  }

  // Emotional state matching (low weight but important)
  const emotionalSignals = signals.filter(s => s.startsWith('emotional:'));
  if (persona.emotionalState && emotionalSignals.some(s => 
      s.includes(persona.emotionalState.toLowerCase())
  )) {
    score += 10;
    debug.push('emotional_match:+10');
  }

  if (debug.length > 0) {
    console.log(`  Debug for ${persona.archetypeName}: ${debug.join(', ')}`);
  }

  return Math.min(score, 100);
}

function getMatchedSignals(persona: any, signals: string[]): string[] {
  const matched: string[] = [];
  
  if (persona.visaType && signals.some(s => s.includes(persona.visaType.toLowerCase()))) {
    matched.push(`visa_type:${persona.visaType}`);
  }
  
  if (persona.location && signals.some(s => s.includes(persona.location.toLowerCase()))) {
    matched.push(`location:${persona.location}`);
  }
  
  if (persona.isRegional && signals.some(s => s.includes('regional'))) {
    matched.push('location:regional');
  }
  
  return matched;
}

debugPersonaScoring().catch(console.error);