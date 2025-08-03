import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

interface BootcampQA {
  id: string;
  persona: string;
  category: string;
  question: string;
  answer: string;
  tags: string[];
  personaCode: string;
}

async function integrateBootcampQA() {
  console.log('🎓 Integrating Bootcamp Q&A Content...\n');
  
  try {
    // Read the bootcamp Q&A file
    const qaFilePath = path.join(process.cwd(), '..', 'bootcamp_qa_comprehensive.md');
    
    if (!fs.existsSync(qaFilePath)) {
      console.error('❌ bootcamp_qa_comprehensive.md not found');
      return;
    }
    
    const content = fs.readFileSync(qaFilePath, 'utf-8');
    const qaResponses: BootcampQA[] = [];
    
    // Parse each persona section
    const personas = [
      { name: 'Callum Hudson', code: 'callum_hudson_local_australian', section: '🇦🇺 CALLUM HUDSON' },
      { name: 'Tyler Brooks', code: 'tyler_brooks_recent_graduate', section: '🎓 TYLER BROOKS' },
      { name: 'Camila Ribeiro', code: 'camila_ribeiro_brazilian_creative', section: '🇧🇷 CAMILA RIBEIRO' },
      { name: 'Dr. Anjali Menon', code: 'dr_anjali_menon_healthcare', section: '🏥 DR. ANJALI MENON' },
      { name: 'Rohan Patel', code: 'rohan_patel_485_visa', section: '🇮🇳 ROHAN PATEL' },
      { name: 'Sofia Martinez', code: 'sofia_martinez_marketing_career_changer', section: '🇲🇽 SOFIA MARTINEZ' }
    ];
    
    for (const persona of personas) {
      console.log(`📋 Processing ${persona.name}...`);
      
      // Find the persona section
      const sectionStart = content.indexOf(persona.section);
      if (sectionStart === -1) {
        console.warn(`⚠️ Section not found: ${persona.section}`);
        continue;
      }
      
      // Find next section or end
      const nextSectionIndex = content.indexOf('##', sectionStart + persona.section.length);
      const sectionEnd = nextSectionIndex === -1 ? content.length : nextSectionIndex;
      const sectionContent = content.substring(sectionStart, sectionEnd);
      
      // Extract Q&As using regex
      const qaMatches = sectionContent.matchAll(/### Q(\d+): "?([^"]*?)"?\n\*\*Q:\*\* "?([^"]*?)"?\n\n\*\*A:\*\* (.*?)(?=\n\n---|\n\n### Q|\n\n## |$)/gs);
      
      let qaCount = 0;
      for (const match of qaMatches) {
        const [, questionNum, category, question, answer] = match;
        
        // Generate tags based on content
        const tags = generateTags(persona.name, question, answer);
        
        // Humanize the answer
        const humanizedAnswer = humanizeResponse(answer, persona.name);
        
        qaResponses.push({
          id: `bootcamp_qa_${persona.code}_q${questionNum}`,
          persona: persona.name,
          category: category || `Question ${questionNum}`,
          question: question.trim(),
          answer: humanizedAnswer,
          tags,
          personaCode: persona.code
        });
        
        qaCount++;
      }
      
      console.log(`✓ Extracted ${qaCount} Q&As for ${persona.name}`);
    }
    
    // Convert to vector format
    const vectors = qaResponses.map(qa => {
      const metadata: VectorMetadata = {
        id: qa.id,
        title: `${qa.persona}: ${qa.category}`,
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
    
    console.log(`\n🔄 Converting ${vectors.length} bootcamp Q&As to vector format...`);
    
    // Upload to vector database
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded bootcamp Q&As to vector database!');
      console.log(`📊 Total vectors uploaded: ${vectors.length}`);
      
      // Log summary by persona
      const personaGroups = qaResponses.reduce((acc, qa) => {
        acc[qa.persona] = (acc[qa.persona] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📋 Q&A Distribution by Persona:');
      Object.entries(personaGroups).forEach(([persona, count]) => {
        console.log(`  - ${persona}: ${count} Q&As`);
      });
      
    } else {
      console.error('❌ Failed to upload bootcamp Q&A vectors:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Integration error:', error);
  }
}

function generateTags(persona: string, question: string, answer: string): string[] {
  const tags = ['bootcamp_qa'];
  const fullText = `${question} ${answer}`.toLowerCase();
  
  // Persona-specific tags
  if (persona.includes('Callum')) tags.push('local_australian', 'admin_background', 'ba_pathway');
  if (persona.includes('Tyler')) tags.push('recent_graduate', 'high_school', 'career_starter');
  if (persona.includes('Camila')) tags.push('creative_background', 'marketing_transition', 'ux_design');
  if (persona.includes('Anjali')) tags.push('healthcare_professional', 'career_change', 'health_tech');
  if (persona.includes('Rohan')) tags.push('485_visa', 'engineering_background', 'frustrated');
  if (persona.includes('Sofia')) tags.push('marketing_experienced', 'family_responsibilities', 'age_considerations');
  
  // Content-based tags
  if (fullText.includes('visa')) tags.push('visa_related');
  if (fullText.includes('485')) tags.push('485_visa');
  if (fullText.includes('bootcamp') || fullText.includes('program')) tags.push('program_inquiry');
  if (fullText.includes('cost') || fullText.includes('$') || fullText.includes('afford')) tags.push('financial_concern');
  if (fullText.includes('time') || fullText.includes('schedule')) tags.push('timing_logistics');
  if (fullText.includes('job') || fullText.includes('employ') || fullText.includes('hire')) tags.push('employment_focus');
  if (fullText.includes('family') || fullText.includes('age') || fullText.includes('old')) tags.push('personal_circumstances');
  if (fullText.includes('background') || fullText.includes('experience')) tags.push('background_concern');
  if (fullText.includes('portfolio') || fullText.includes('project')) tags.push('portfolio_building');
  
  return tags;
}

function humanizeResponse(answer: string, persona: string): string {
  // Replace corporate language with conversational tone
  let humanized = answer
    .replace(/The BA bootcamp is specifically designed/g, "Look, this program is perfect")
    .replace(/Many BA students have degrees/g, "Tons of people come from")
    .replace(/While we can't guarantee/g, "I can't promise anything, but")
    .replace(/Based on alumni outcomes/g, "Here's what I've seen work")
    .replace(/Success story:/g, "Let me tell you about")
    .replace(/Unlike online courses/g, "This isn't like those online courses")
    .replace(/You'll learn:/g, "You'll get hands-on with:")
    .replace(/After graduation, you join/g, "Once you're done, you'll be part of")
    .replace(/While specific/g, "Look, I can't guarantee specific")
    .replace(/The program teaches you/g, "We'll help you")
    .replace(/Your.*background is actually/g, "Your background is actually")
    .replace(/Absolutely!/g, "Absolutely! Look,");
  
  // Add persona-specific empathy
  if (persona.includes('Rohan')) {
    humanized = humanized.replace(/^/, "I get the visa pressure, Rohan. ");
  } else if (persona.includes('Sofia')) {
    humanized = humanized.replace(/^/, "Sofia, I totally understand that concern. ");
  } else if (persona.includes('Callum')) {
    humanized = humanized.replace(/^/, "Callum, that's a great question. ");
  } else if (persona.includes('Tyler')) {
    humanized = humanized.replace(/^/, "Tyler, you're asking the right questions. ");
  } else if (persona.includes('Camila')) {
    humanized = humanized.replace(/^/, "Camila, your creative background is actually perfect for this. ");
  } else if (persona.includes('Anjali')) {
    humanized = humanized.replace(/^/, "Dr. Menon, your healthcare experience is incredibly valuable. ");
  }
  
  // Add conversational connectors
  humanized = humanized
    .replace(/\. You'll/g, ". You'll")
    .replace(/\. The/g, ". Look, the")
    .replace(/\. Many/g, ". A lot of")
    .replace(/\. This/g, ". Here's the thing - this");
  
  return humanized;
}

// Run the integration
integrateBootcampQA().catch(console.error);