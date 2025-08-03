import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function populatePersonaDatabase() {
  console.log('📊 Populating Persona Database...\n');
  
  try {
    // Read the existing knowledge base to extract personas
    const knowledgeBasePath = path.join(process.cwd(), '..', 'data', 'processed', 'chatbot_knowledge_base_ALL_PERSONAS.json');
    
    if (!fs.existsSync(knowledgeBasePath)) {
      console.error('❌ Knowledge base file not found. Creating sample personas...');
      await createSamplePersonas();
      return;
    }
    
    const knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, 'utf-8'));
    console.log(`Found ${knowledgeBase.personas?.length || 0} personas in knowledge base`);
    
    if (!knowledgeBase.personas || knowledgeBase.personas.length === 0) {
      console.log('No personas in knowledge base, creating sample personas...');
      await createSamplePersonas();
      return;
    }
    
    // Transform and insert personas
    const personaInserts = knowledgeBase.personas.map((persona: any) => {
      // Extract visa type from background or key points
      let visaType = 'unknown';
      const fullText = `${persona.background} ${persona.key_points?.join(' ') || ''}`.toLowerCase();
      if (fullText.includes('485')) visaType = '485';
      else if (fullText.includes('500')) visaType = '500';
      else if (fullText.includes('pr') || fullText.includes('permanent')) visaType = 'PR';
      else if (fullText.includes('citizen')) visaType = 'citizen';
      
      // Extract location
      let location = 'unknown';
      let isRegional = false;
      if (fullText.includes('wollongong')) { location = 'Wollongong'; isRegional = true; }
      else if (fullText.includes('melbourne')) location = 'Melbourne';
      else if (fullText.includes('sydney')) location = 'Sydney';
      else if (fullText.includes('brisbane')) location = 'Brisbane';
      
      // Extract previous field
      let previousField = 'unknown';
      if (fullText.includes('mechanical engineering')) previousField = 'Mechanical Engineering';
      else if (fullText.includes('marketing')) previousField = 'Marketing';
      else if (fullText.includes('economics')) previousField = 'Economics';
      else if (fullText.includes('accounting')) previousField = 'Accounting';
      
      // Extract emotional state
      let emotionalState = 'uncertain';
      if (fullText.includes('frustrated') || fullText.includes('struggling')) emotionalState = 'frustrated';
      else if (fullText.includes('anxious') || fullText.includes('worried')) emotionalState = 'anxious';
      else if (fullText.includes('hopeful') || fullText.includes('motivated')) emotionalState = 'hopeful';
      else if (fullText.includes('overwhelmed')) emotionalState = 'overwhelmed';
      
      return {
        archetypeName: persona.name,
        archetypeCode: persona.name.toLowerCase().replace(/\s+/g, '_'),
        nationality: persona.demographics?.country || 'International',
        ageRange: persona.demographics?.age ? `${persona.demographics.age}-${parseInt(persona.demographics.age) + 5}` : '25-30',
        location,
        isRegional,
        previousField,
        currentStudy: 'Career Development Program',
        workExperience: persona.challenges?.[0] || 'Seeking experience',
        visaType,
        visaTimeLeft: visaType === '485' ? '2-3 years' : 'N/A',
        englishLevel: 'high',
        techConfidence: persona.category === 'Recent Graduate' ? 'intermediate' : 'basic',
        primaryMotivation: persona.motivations?.[0] || 'career_development',
        careerGoal: persona.category === 'Career Switcher' ? 'Career Transition' : 'Skill Development',
        urgencyLevel: emotionalState === 'frustrated' ? 'high' : 'medium',
        mainChallenge: persona.challenges?.[0] || 'Getting started',
        emotionalState,
        supportNeeds: ['mentoring', 'practical_guidance'],
        communicationStyle: 'supportive',
        culturalBackground: persona.demographics?.country || 'International'
      };
    });
    
    // Insert personas into database
    console.log(`Inserting ${personaInserts.length} personas...`);
    
    for (const persona of personaInserts) {
      try {
        await db().insert(studentPersonas).values(persona).onConflictDoNothing();
        console.log(`✓ Inserted: ${persona.archetypeName}`);
      } catch (error) {
        console.error(`✗ Failed to insert ${persona.archetypeName}:`, error);
      }
    }
    
    // Verify insertion
    const insertedPersonas = await db().select().from(studentPersonas);
    console.log(`\n✅ Database now contains ${insertedPersonas.length} personas`);
    
    // Show sample
    console.log('\nSample personas:');
    insertedPersonas.slice(0, 5).forEach(p => {
      console.log(`- ${p.archetypeName} (${p.nationality}, ${p.visaType} visa, ${p.emotionalState})`);
    });
    
  } catch (error) {
    console.error('❌ Population failed:', error);
  }
}

async function createSamplePersonas() {
  console.log('Creating sample personas based on our Q&A data...');
  
  const samplePersonas = [
    {
      archetypeName: 'Raj Patel',
      archetypeCode: 'raj_patel_485_visa',
      nationality: 'India',
      ageRange: '25-30',
      location: 'Sydney',
      isRegional: false,
      previousField: 'Computer Science',
      currentStudy: 'Job Search',
      workExperience: 'Fresh Graduate',
      visaType: '485',
      visaTimeLeft: '2.5 years',
      englishLevel: 'high',
      techConfidence: 'intermediate',
      primaryMotivation: 'Employment',
      careerGoal: 'Software Developer',
      urgencyLevel: 'high',
      mainChallenge: 'Getting interviews',
      emotionalState: 'anxious',
      supportNeeds: ['interview_prep', 'local_experience'],
      communicationStyle: 'direct',
      culturalBackground: 'Indian'
    },
    {
      archetypeName: 'Sofia Martinez',
      archetypeCode: 'sofia_martinez_career_changer',
      nationality: 'Mexico',
      ageRange: '28-35',
      location: 'Melbourne',
      isRegional: false,
      previousField: 'Marketing',
      currentStudy: 'Tech Transition',
      workExperience: '5+ years Marketing',
      visaType: 'PR',
      visaTimeLeft: 'N/A',
      englishLevel: 'high',
      techConfidence: 'basic',
      primaryMotivation: 'Career Change',
      careerGoal: 'UX Designer',
      urgencyLevel: 'medium',
      mainChallenge: 'Explaining career change',
      emotionalState: 'determined',
      supportNeeds: ['skill_transition', 'portfolio_building'],
      communicationStyle: 'collaborative',
      culturalBackground: 'Latin American'
    },
    {
      archetypeName: 'Lin Zhang',
      archetypeCode: 'lin_zhang_technical_english',
      nationality: 'China',
      ageRange: '24-28',
      location: 'Brisbane',
      isRegional: false,
      previousField: 'Computer Science',
      currentStudy: 'Professional Development',
      workExperience: 'Some technical experience',
      visaType: '485',
      visaTimeLeft: '1.5 years',
      englishLevel: 'medium',
      techConfidence: 'intermediate',
      primaryMotivation: 'Communication Skills',
      careerGoal: 'Full Stack Developer',
      urgencyLevel: 'medium',
      mainChallenge: 'Technical communication in English',
      emotionalState: 'motivated',
      supportNeeds: ['communication_coaching', 'cultural_adaptation'],
      communicationStyle: 'gentle',
      culturalBackground: 'Chinese'
    },
    {
      archetypeName: 'Sarah Williams',
      archetypeCode: 'sarah_williams_working_parent',
      nationality: 'Australia',
      ageRange: '32-38',
      location: 'Perth',
      isRegional: false,
      previousField: 'Administration',
      currentStudy: 'Part-time Study',
      workExperience: 'Admin and childcare gap',
      visaType: 'citizen',
      visaTimeLeft: 'N/A',
      englishLevel: 'high',
      techConfidence: 'basic',
      primaryMotivation: 'Work-life balance',
      careerGoal: 'Business Analyst',
      urgencyLevel: 'low',
      mainChallenge: 'Balancing study with family',
      emotionalState: 'cautious',
      supportNeeds: ['flexible_scheduling', 'family_support'],
      communicationStyle: 'practical',
      culturalBackground: 'Australian'
    },
    {
      archetypeName: 'James Chen',
      archetypeCode: 'james_chen_recent_graduate',
      nationality: 'Taiwan',
      ageRange: '18-22',
      location: 'Adelaide',
      isRegional: false,
      previousField: 'High School',
      currentStudy: 'Exploring options',
      workExperience: 'No professional experience',
      visaType: '500',
      visaTimeLeft: '3 years',
      englishLevel: 'high',
      techConfidence: 'basic',
      primaryMotivation: 'Career exploration',
      careerGoal: 'Tech Industry',
      urgencyLevel: 'low',
      mainChallenge: 'Choosing career path',
      emotionalState: 'curious',
      supportNeeds: ['career_guidance', 'foundation_skills'],
      communicationStyle: 'enthusiastic',
      culturalBackground: 'Taiwanese'
    }
  ];
  
  for (const persona of samplePersonas) {
    try {
      await db().insert(studentPersonas).values(persona).onConflictDoNothing();
      console.log(`✓ Created: ${persona.archetypeName}`);
    } catch (error) {
      console.error(`✗ Failed to create ${persona.archetypeName}:`, error);
    }
  }
  
  console.log(`\n✅ Created ${samplePersonas.length} sample personas`);
}

// Run population
populatePersonaDatabase().catch(console.error);