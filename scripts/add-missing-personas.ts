import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function addMissingPersonas() {
  console.log('➕ Adding missing bootcamp personas...\n');
  
  try {
    // Check if Sofia Martinez exists
    const existingSofia = await db().select()
      .from(studentPersonas)
      .where(eq(studentPersonas.archetypeName, 'Sofia Martinez'))
      .limit(1);
    
    if (existingSofia.length === 0) {
      console.log('Adding Sofia Martinez...');
      await db().insert(studentPersonas).values({
        archetypeName: 'Sofia Martinez',
        archetypeCode: 'sofia_martinez_marketing_career_changer',
        nationality: 'Mexican',
        ageRange: '30-35',
        location: 'Sydney',
        isRegional: false,
        previousField: 'Marketing',
        currentStudy: null,
        workExperience: '8 years marketing experience',
        visaType: 'PR',
        visaTimeLeft: null,
        englishLevel: 'high',
        techConfidence: 'basic',
        primaryMotivation: 'career_change',
        careerGoal: 'Business Analyst',
        urgencyLevel: 'medium',
        mainChallenge: 'Age concerns and family responsibilities',
        emotionalState: 'uncertain',
        supportNeeds: ['family_balance', 'age_advantage_positioning'],
        communicationStyle: 'supportive',
        culturalBackground: 'Hispanic'
      });
      console.log('✅ Sofia Martinez added');
    } else {
      console.log('Sofia Martinez already exists');
    }
    
    // Check if Dr. Anjali Menon exists
    const existingAnjali = await db().select()
      .from(studentPersonas)
      .where(eq(studentPersonas.archetypeName, 'Dr. Anjali Menon'))
      .limit(1);
    
    if (existingAnjali.length === 0) {
      console.log('Adding Dr. Anjali Menon...');
      await db().insert(studentPersonas).values({
        archetypeName: 'Dr. Anjali Menon',
        archetypeCode: 'dr_anjali_menon_healthcare_professional',
        nationality: 'Indian',
        ageRange: '35-40',
        location: 'Melbourne',
        isRegional: false,
        previousField: 'Healthcare/Physiotherapy',
        currentStudy: null,
        workExperience: 'Senior healthcare professional',
        visaType: 'PR',
        visaTimeLeft: null,
        englishLevel: 'high',
        techConfidence: 'basic',
        primaryMotivation: 'career_diversification',
        careerGoal: 'Health Tech Business Analyst',
        urgencyLevel: 'low',
        mainChallenge: 'Transitioning from healthcare domain',
        emotionalState: 'confident',
        supportNeeds: ['domain_expertise_transfer', 'health_tech_pathway'],
        communicationStyle: 'professional',
        culturalBackground: 'South Asian'
      });
      console.log('✅ Dr. Anjali Menon added');
    } else {
      console.log('Dr. Anjali Menon already exists');
    }
    
    console.log('\n🎉 Missing personas check complete!');
    
  } catch (error) {
    console.error('Error adding personas:', error);
  }
}

import { eq } from 'drizzle-orm';
addMissingPersonas().catch(console.error);