import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

async function integrateBootcampQAFixed() {
  console.log('🎓 Integrating Bootcamp Q&A Content (Fixed Parser)...\n');
  
  try {
    // Read the bootcamp Q&A file
    const qaFilePath = path.join(process.cwd(), '..', 'bootcamp_qa_comprehensive.md');
    
    if (!fs.existsSync(qaFilePath)) {
      console.error('❌ bootcamp_qa_comprehensive.md not found');
      return;
    }
    
    const content = fs.readFileSync(qaFilePath, 'utf-8');
    const qaResponses: any[] = [];
    
    // Split by ### Q pattern
    const qaSections = content.split(/### Q\d+:/);
    
    // Process each Q&A (skip first empty section)
    for (let i = 1; i < qaSections.length; i++) {
      const section = qaSections[i];
      
      // Extract question and answer
      const lines = section.split('\n').filter(line => line.trim());
      if (lines.length < 2) continue;
      
      const questionLine = lines[0].trim().replace(/^[""]/, '').replace(/[""]$/, '');
      
      // Find the answer (after **A:**)
      const answerStartIndex = section.indexOf('**A:**');
      if (answerStartIndex === -1) continue;
      
      const answerText = section.substring(answerStartIndex + 6).trim();
      
      // Determine persona from context (look backwards for persona headers)
      const beforeSection = content.substring(0, content.indexOf(section));
      let persona = 'Unknown';
      let personaCode = 'unknown';
      
      if (beforeSection.includes('🇦🇺 CALLUM HUDSON')) {
        persona = 'Callum Hudson';
        personaCode = 'callum_hudson_local_australian';
      } else if (beforeSection.includes('🎓 TYLER BROOKS')) {
        persona = 'Tyler Brooks';
        personaCode = 'tyler_brooks_recent_graduate';
      } else if (beforeSection.includes('🇧🇷 CAMILA RIBEIRO')) {
        persona = 'Camila Ribeiro';
        personaCode = 'camila_ribeiro_brazilian_creative';
      } else if (beforeSection.includes('🏥 DR. ANJALI MENON')) {
        persona = 'Dr. Anjali Menon';
        personaCode = 'dr_anjali_menon_healthcare';
      } else if (beforeSection.includes('🇮🇳 ROHAN PATEL')) {
        persona = 'Rohan Patel';
        personaCode = 'rohan_patel_485_visa';
      } else if (beforeSection.includes('🇲🇽 SOFIA MARTINEZ')) {
        persona = 'Sofia Martinez';
        personaCode = 'sofia_martinez_marketing_career_changer';
      }
      
      if (persona === 'Unknown') continue;
      
      // Generate tags
      const tags = generateTags(persona, questionLine, answerText);
      
      // Humanize the answer
      const humanizedAnswer = humanizeResponse(answerText, persona);
      
      qaResponses.push({
        id: `bootcamp_qa_${personaCode}_q${i}`,
        persona,
        question: questionLine,
        answer: humanizedAnswer,
        tags,
        personaCode
      });
    }
    
    console.log(`📊 Extracted ${qaResponses.length} total Q&As`);
    
    // Show breakdown by persona
    const personaGroups = qaResponses.reduce((acc, qa) => {
      acc[qa.persona] = (acc[qa.persona] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📋 Q&A Breakdown:');
    Object.entries(personaGroups).forEach(([persona, count]) => {
      console.log(`  - ${persona}: ${count} Q&As`);
    });
    
    // Convert to vector format
    const vectors = qaResponses.map(qa => {
      const metadata: VectorMetadata = {
        id: qa.id,
        title: `${qa.persona} Q&A`,
        content: `Q: ${qa.question}\n\nA: ${qa.answer}`,
        category: 'bootcamp_qa',
        contentType: 'persona_qa',
        difficulty: 'beginner',
        prerequisites: [],
        leadsTo: [],
        relatedConcepts: [qa.persona],
        careerPaths: [],
        tags: qa.tags,
        confidenceScore: 0.95,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        id: qa.id,
        content: `Question: ${qa.question}\n\nAnswer: ${qa.answer}`,
        metadata
      };
    });
    
    console.log(`\n🔄 Converting ${vectors.length} Q&As to vector format...`);
    
    // Upload to vector database  
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded bootcamp Q&As!');
      console.log(`📊 Total vectors uploaded: ${vectors.length}`);
    } else {
      console.error('❌ Failed to upload:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Integration error:', error);
  }
}

function generateTags(persona: string, question: string, answer: string): string[] {
  const tags = ['bootcamp_qa'];
  const fullText = `${question} ${answer}`.toLowerCase();
  
  // Persona-specific tags
  if (persona.includes('Callum')) tags.push('local_australian', 'admin_background');
  if (persona.includes('Tyler')) tags.push('recent_graduate', 'high_school');
  if (persona.includes('Camila')) tags.push('creative_background', 'marketing_transition');
  if (persona.includes('Anjali')) tags.push('healthcare_professional', 'career_change');
  if (persona.includes('Rohan')) tags.push('485_visa', 'engineering_background');
  if (persona.includes('Sofia')) tags.push('marketing_experienced', 'family_responsibilities');
  
  // Content-based tags
  if (fullText.includes('visa')) tags.push('visa_related');
  if (fullText.includes('485')) tags.push('485_visa');
  if (fullText.includes('cost') || fullText.includes('$')) tags.push('financial_concern');
  if (fullText.includes('job') || fullText.includes('employ')) tags.push('employment_focus');
  if (fullText.includes('background') || fullText.includes('experience')) tags.push('background_concern');
  
  return tags;
}

function humanizeResponse(answer: string, persona: string): string {
  let humanized = answer
    .replace(/Absolutely!/g, "Absolutely! Look,")
    .replace(/The BA bootcamp/g, "Look, this program")
    .replace(/While we can't guarantee/g, "I can't promise anything, but")
    .replace(/Success story:/g, "Let me tell you about")
    .replace(/Your.*background is actually/g, "Your background is actually");
  
  // Add persona-specific empathy
  if (persona.includes('Rohan')) {
    humanized = `I get the visa pressure, Rohan. ${humanized}`;
  } else if (persona.includes('Sofia')) {
    humanized = `Sofia, I totally understand that concern. ${humanized}`;
  }
  
  return humanized;
}

integrateBootcampQAFixed().catch(console.error);