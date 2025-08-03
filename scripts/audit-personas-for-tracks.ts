import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function auditPersonasForTracks() {
  console.log('🔍 PERSONA AUDIT - 4 COURSE TRACKS COVERAGE');
  console.log('='.repeat(60));
  
  try {
    const personas = await db().select({
      name: studentPersonas.archetypeName,
      code: studentPersonas.archetypeCode,
      background: studentPersonas.previousField,
      goals: studentPersonas.careerGoal,
      nationality: studentPersonas.nationality,
      motivation: studentPersonas.primaryMotivation
    }).from(studentPersonas);
    
    const tracks = {
      'Business Analyst': [] as string[],
      'Data & AI': [] as string[],
      'Cybersecurity': [] as string[],
      'Full Stack': [] as string[],
      'Career Switchers': [] as string[],
      'Other/Unclear': [] as string[]
    };
    
    personas.forEach(p => {
      const goals = (p.goals || '').toLowerCase();
      const background = (p.background || '').toLowerCase();
      const name = p.name || 'Unknown';
      
      console.log(`\nAnalyzing: ${name}`);
      console.log(`  Background: ${p.background}`);
      console.log(`  Goals: ${p.goals}`);
      console.log(`  Motivation: ${p.motivation}`);
      
      // Categorize by career goals/interests
      if (goals.includes('business analyst') || goals.includes(' ba ')) {
        tracks['Business Analyst'].push(name);
        console.log('  → Business Analyst track');
      } else if (goals.includes('data') || goals.includes('ai') || goals.includes('analyst')) {
        tracks['Data & AI'].push(name);
        console.log('  → Data & AI track');
      } else if (goals.includes('cyber') || goals.includes('security')) {
        tracks['Cybersecurity'].push(name);
        console.log('  → Cybersecurity track');
      } else if (goals.includes('developer') || goals.includes('full stack') || goals.includes('software')) {
        tracks['Full Stack'].push(name);
        console.log('  → Full Stack track');
      } else {
        tracks['Other/Unclear'].push(name);
        console.log('  → Unclear/Other');
      }
      
      // Check for career switchers
      if (background.includes('engineer') || background.includes('marketing') || 
          background.includes('healthcare') || background.includes('admin')) {
        tracks['Career Switchers'].push(name);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 TRACK COVERAGE SUMMARY:');
    console.log('='.repeat(60));
    
    Object.entries(tracks).forEach(([track, people]) => {
      console.log(`\n${track}: ${people.length} personas`);
      people.forEach(name => console.log(`  - ${name}`));
    });
    
    console.log(`\n📈 FINAL COUNT:`);
    console.log(`Total Personas: ${personas.length}`);
    console.log(`Business Analyst: ${tracks['Business Analyst'].length}`);
    console.log(`Data & AI: ${tracks['Data & AI'].length}`);
    console.log(`Cybersecurity: ${tracks['Cybersecurity'].length}`);
    console.log(`Full Stack: ${tracks['Full Stack'].length}`);
    console.log(`Career Switchers: ${tracks['Career Switchers'].length}`);
    console.log(`Need Track Assignment: ${tracks['Other/Unclear'].length}`);
    
    // Identify gaps
    console.log(`\n🎯 RECOMMENDATIONS:`);
    if (tracks['Cybersecurity'].length === 0) {
      console.log(`❌ NO CYBERSECURITY PERSONAS - Need to create!`);
    }
    if (tracks['Full Stack'].length === 0) {
      console.log(`❌ NO FULL STACK PERSONAS - Need to create!`);
    }
    if (tracks['Data & AI'].length === 0) {
      console.log(`❌ NO DATA & AI PERSONAS - Need to create!`);
    }
    
  } catch (error) {
    console.error('Error auditing personas:', error);
  }
}

auditPersonasForTracks().catch(console.error);