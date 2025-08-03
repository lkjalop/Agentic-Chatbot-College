import fs from 'fs';
import path from 'path';

interface QAResponse {
  id: string;
  persona: string;
  stage: string;
  question: string;
  answer: string;
  contentType: 'persona_qa';
  tags: string[];
  personaCode: string;
}

export function extractQAResponses(): QAResponse[] {
  console.log('🔍 Extracting Q&A responses from personas-1-6-complete.md...');
  
  const qaFilePath = path.join(process.cwd(), '..', 'personas-1-6-complete.md');
  
  if (!fs.existsSync(qaFilePath)) {
    console.error('❌ personas-1-6-complete.md file not found');
    return [];
  }
  
  const content = fs.readFileSync(qaFilePath, 'utf-8');
  const responses: QAResponse[] = [];
  
  // Parse the markdown structure
  const sections = content.split('## PERSONA ');
  
  sections.forEach((section, index) => {
    if (index === 0) return; // Skip header
    
    // Extract persona info
    const personaMatch = section.match(/(\d+): (.+?) - (.+)/);
    if (!personaMatch) return;
    
    const [, personaNum, personaName, personaDescription] = personaMatch;
    const personaCode = `persona_${personaNum}_${personaName.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Extract Q&A pairs
    const qaMatches = section.matchAll(/\*\*Q(\d+): "(.+?)"\*\*\n\n\*\*AI Response:\*\* (.+?)(?=\n\n---|\n\n\*\*Q|$)/gs);
    
    for (const match of qaMatches) {
      const [, questionNum, question, answer] = match;
      
      // Determine stage from context
      let stage = 'general';
      if (section.includes('Stage 1: Awareness')) stage = 'awareness';
      else if (section.includes('Stage 2: Research')) stage = 'research';
      else if (section.includes('Stage 3: Pre-Consultation')) stage = 'pre_consultation';
      else if (section.includes('Stage 4: Consultation')) stage = 'consultation';
      
      // Generate tags
      const tags = [
        'persona_qa',
        `persona_${personaNum}`,
        `stage_${stage}`,
        personaName.toLowerCase().replace(/\s+/g, '_')
      ];
      
      // Add context-specific tags
      if (question.includes('visa')) tags.push('visa_related');
      if (question.includes('485')) tags.push('485_visa');
      if (question.includes('international')) tags.push('international_student');
      if (question.includes('career')) tags.push('career_change');
      if (question.includes('workplace') || question.includes('culture')) tags.push('workplace_culture');
      
      responses.push({
        id: `qa_${personaCode}_q${questionNum}`,
        persona: personaName,
        stage,
        question,
        answer: answer.trim(),
        contentType: 'persona_qa',
        tags,
        personaCode
      });
    }
  });
  
  console.log(`✅ Extracted ${responses.length} Q&A responses`);
  return responses;
}

// Export for use in upload script
export default extractQAResponses;