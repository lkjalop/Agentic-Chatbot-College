import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';
import { eq } from 'drizzle-orm';

async function fixPersonaFields() {
  console.log('🔧 Fixing persona background fields...\n');
  
  try {
    // Update Callum Hudson
    await db().update(studentPersonas)
      .set({ 
        previousField: 'Administrative/Office Work',
        techConfidence: 'none',
        urgencyLevel: 'medium'
      })
      .where(eq(studentPersonas.archetypeName, 'Callum Hudson'));
    
    console.log('✅ Updated Callum Hudson - Admin background');
    
    // Update Tyler Brooks  
    await db().update(studentPersonas)
      .set({ 
        previousField: 'Recent High School Graduate',
        techConfidence: 'none',
        urgencyLevel: 'low',
        ageRange: '17-19'
      })
      .where(eq(studentPersonas.archetypeName, 'Tyler Brooks'));
    
    console.log('✅ Updated Tyler Brooks - High school background');
    
    // Check updated values
    console.log('\n📋 Checking updated personas...');
    
    const updatedPersonas = await db().select({
      name: studentPersonas.archetypeName,
      background: studentPersonas.previousField,
      visa: studentPersonas.visaType,
      tech: studentPersonas.techConfidence,
      urgency: studentPersonas.urgencyLevel
    }).from(studentPersonas)
    .where(eq(studentPersonas.archetypeName, 'Callum Hudson'))
    .unionAll(
      db().select({
        name: studentPersonas.archetypeName,
        background: studentPersonas.previousField,
        visa: studentPersonas.visaType,
        tech: studentPersonas.techConfidence,
        urgency: studentPersonas.urgencyLevel
      }).from(studentPersonas)
      .where(eq(studentPersonas.archetypeName, 'Tyler Brooks'))
    );
    
    updatedPersonas.forEach(p => {
      console.log(`- ${p.name}: ${p.background} | ${p.visa} | Tech: ${p.tech}`);
    });
    
  } catch (error) {
    console.error('Error fixing personas:', error);
  }
}

fixPersonaFields().catch(console.error);