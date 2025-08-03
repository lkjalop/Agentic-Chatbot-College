import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function checkBootcampPersonas() {
  console.log('📋 Checking personas in database for bootcamp characters...\n');
  
  try {
    const personas = await db().select({
      id: studentPersonas.id,
      name: studentPersonas.archetypeName,
      code: studentPersonas.archetypeCode,
      nationality: studentPersonas.nationality,
      visaType: studentPersonas.visaType,
      previousField: studentPersonas.previousField,
      location: studentPersonas.location,
      emotionalState: studentPersonas.emotionalState
    }).from(studentPersonas);
    
    console.log(`Total personas in database: ${personas.length}\n`);
    
    // Find specific personas from bootcamp
    const targetPersonas = [
      'Callum Hudson', 'Tyler Brooks', 'Sofia Martinez', 
      'Rohan Patel', 'Camila Ribeiro', 'Dr. Anjali Menon'
    ];
    
    console.log('Looking for bootcamp personas:\n');
    
    targetPersonas.forEach(name => {
      const firstName = name.split(' ')[0];
      const persona = personas.find(p => 
        p.name?.toLowerCase().includes(firstName.toLowerCase())
      );
      
      if (persona) {
        console.log(`✅ ${name}:`);
        console.log(`   Full Name: ${persona.name}`);
        console.log(`   Code: ${persona.code}`);
        console.log(`   Visa: ${persona.visaType || 'N/A'}`);
        console.log(`   Background: ${persona.previousField || 'N/A'}`);
        console.log(`   Location: ${persona.location || 'N/A'}`);
        console.log(`   Emotional: ${persona.emotionalState || 'N/A'}`);
        console.log('');
      } else {
        console.log(`❌ ${name}: NOT FOUND`);
        console.log('');
      }
    });
    
    // Show a sample of other personas for reference
    console.log('📝 Sample of other personas in database:');
    personas.slice(0, 5).forEach(p => {
      console.log(`- ${p.name} (${p.code})`);
    });
    
  } catch (error) {
    console.error('Error checking personas:', error);
  }
}

checkBootcampPersonas().catch(console.error);