import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { db } from '@/lib/db';
import { studentPersonas } from '@/lib/personas/persona-schemas';

async function listPersonas() {
  const personas = await db().select().from(studentPersonas);
  console.log('📊 All 25 Personas:\n');
  
  personas.forEach((p, i) => {
    console.log(`${i+1}. ${p.archetypeName} (${p.nationality}, ${p.visaType} visa, ${p.emotionalState}, ${p.previousField})`);
  });
  
  console.log('\n🎯 RECOMMENDED TOP 6 FOR TESTING:');
  console.log('1. Rohan Patel - 485 visa + frustrated (known working)');
  console.log('2. Li Wen - PR + career changer (different visa type)'); 
  console.log('3. Sandeep Shrestha - 500 visa + hopeful (student visa)');
  console.log('4. Sarah Thompson - citizen + cautious (local student)');
  console.log('5. Minh Nguyen - PR + working parent (different challenge)');
  console.log('6. Kwame Mensah - PR + cybersecurity (specialized field)');
  
  console.log('\n💡 Why these 6?');
  console.log('- Different visa types: 485, 500, PR, citizen');
  console.log('- Different emotional states: frustrated, hopeful, cautious');
  console.log('- Different backgrounds: CS, marketing, engineering');
  console.log('- Different demographics: India, China, Nepal, Australia, Vietnam, Ghana');
  console.log('- Different career paths: BA, Full Stack, Data, Cybersecurity');
}

listPersonas().catch(console.error);