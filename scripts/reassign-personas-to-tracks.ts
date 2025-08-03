import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';
import { eq } from 'drizzle-orm';

async function reassignPersonasToTracks() {
  console.log('🔧 Reassigning personas to specific course tracks...\n');
  
  try {
    // Data & AI Track assignments
    const dataAIUpdates = [
      { name: 'Sadia Rahman', goal: 'Data Analyst' },
      { name: 'Kwame Mensah', goal: 'Data Analyst / Business Analyst' },
      { name: 'Amina Ndlovu', goal: 'Data Analyst / Business Analyst' },
      { name: 'Lukas Meier', goal: 'Data Analyst / Data Scientist' },
      { name: 'Uche Tunde', goal: 'Data Analyst' }
    ];
    
    for (const update of dataAIUpdates) {
      await db().update(studentPersonas)
        .set({ careerGoal: update.goal })
        .where(eq(studentPersonas.archetypeName, update.name));
      console.log(`✅ Updated ${update.name} → Data & AI Track`);
    }
    
    // Full Stack Track assignments
    await db().update(studentPersonas)
      .set({ careerGoal: 'Full Stack Developer / UX Developer' })
      .where(eq(studentPersonas.archetypeName, 'Mey Lin'));
    console.log(`✅ Updated Mey Lin → Full Stack Track`);
    
    // Business Analyst Track confirmations
    const baUpdates = [
      { name: 'Chelsea Dela', goal: 'Business Analyst' },
      { name: 'Priya Singh', goal: 'Business Analyst' },
      { name: 'Sarah Thompson', goal: 'Business Analyst' },
      { name: 'Pema Tashi', goal: 'Business Analyst' }
    ];
    
    for (const update of baUpdates) {
      await db().update(studentPersonas)
        .set({ careerGoal: update.goal })
        .where(eq(studentPersonas.archetypeName, update.name));
      console.log(`✅ Updated ${update.name} → Business Analyst Track`);
    }
    
    console.log('\n🎯 Track assignments completed!');
    
  } catch (error) {
    console.error('Error reassigning personas:', error);
  }
}

reassignPersonasToTracks().catch(console.error);