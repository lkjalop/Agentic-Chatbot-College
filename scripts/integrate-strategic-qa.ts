import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

async function integrateStrategicQA() {
  console.log('🎯 Integrating 30 Strategic Q&As for All Tracks...\n');
  
  try {
    // Read the strategic Q&A file
    const qaFilePath = path.join(process.cwd(), '..', 'strategic_qa_comprehensive.md');
    
    if (!fs.existsSync(qaFilePath)) {
      console.error('❌ strategic_qa_comprehensive.md not found');
      return;
    }
    
    const content = fs.readFileSync(qaFilePath, 'utf-8');
    const qaResponses: any[] = [];
    
    // Define track-specific content blocks
    const tracks = {
      'business_analyst': 'Business Analyst Track',
      'data_ai': 'Data & AI Analyst Track', 
      'cybersecurity': 'Cybersecurity Track',
      'full_stack': 'Full Stack Developer Track',
      'general': 'General/Comparison'
    };
    
    Object.entries(tracks).forEach(([trackCode, trackName]) => {
      // Find the track section
      const sectionStart = content.indexOf(`## ${trackName}`);
      if (sectionStart === -1) return;
      
      const nextSectionStart = content.indexOf('## ', sectionStart + trackName.length);
      const sectionEnd = nextSectionStart === -1 ? content.length : nextSectionStart;
      const sectionContent = content.substring(sectionStart, sectionEnd);
      
      // Extract individual Q&As from this section
      const qaBlocks = sectionContent.split('### ').filter(block => block.trim());
      
      qaBlocks.forEach((block, index) => {
        if (!block.includes('**Q:**') || !block.includes('**A:**')) return;
        
        const lines = block.split('\n');
        const header = lines[0] || '';
        
        // Extract persona if mentioned
        let persona = 'General';
        const personaMatch = block.match(/\*\*Persona:\*\* ([^\n]+)/);
        if (personaMatch) {
          persona = personaMatch[1].trim();
        }
        
        // Extract question and answer
        const questionMatch = block.match(/\*\*Q:\*\* (.+?)(?=\*\*A:\*\*)/s);
        const answerMatch = block.match(/\*\*A:\*\* (.+?)(?=\n\n---|\n\n##|$)/s);
        
        if (!questionMatch || !answerMatch) return;
        
        const question = questionMatch[1].trim();
        const answer = answerMatch[1].trim();
        
        // Generate tags based on content
        const tags = generateStrategicTags(trackCode, question, answer, persona);
        
        qaResponses.push({
          id: `strategic_qa_${trackCode}_${index + 1}`,
          track: trackCode,
          trackName: trackName,
          persona: persona,
          question: question,
          answer: answer,
          tags: tags,
          header: header
        });
      });
    });
    
    console.log(`📊 Extracted ${qaResponses.length} strategic Q&As`);
    
    // Show breakdown by track
    const trackGroups = qaResponses.reduce((acc, qa) => {
      acc[qa.trackName] = (acc[qa.trackName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\\n📋 Q&A Breakdown by Track:');
    Object.entries(trackGroups).forEach(([track, count]) => {
      console.log(`  - ${track}: ${count} Q&As`);
    });
    
    // Convert to vector format
    const vectors = qaResponses.map(qa => {
      const metadata: VectorMetadata = {
        id: qa.id,
        title: `${qa.trackName}: ${qa.header.split(':')[0] || qa.question.substring(0, 50)}`,
        content: `Track: ${qa.trackName}\\nPersona: ${qa.persona}\\n\\nQ: ${qa.question}\\n\\nA: ${qa.answer}`,
        category: 'strategic_qa',
        contentType: 'course_guidance',
        difficulty: 'beginner',
        prerequisites: [],
        leadsTo: [],
        relatedConcepts: [qa.track, qa.persona],
        careerPaths: [qa.track],
        tags: qa.tags,
        confidenceScore: 0.98, // High confidence for strategic content
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        id: qa.id,
        content: `Track: ${qa.trackName}\\nPersona: ${qa.persona}\\n\\nQuestion: ${qa.question}\\n\\nAnswer: ${qa.answer}`,
        metadata
      };
    });
    
    console.log(`\\n🔄 Converting ${vectors.length} strategic Q&As to vector format...`);
    
    // Upload to vector database
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded strategic Q&As!');
      console.log(`📊 Total vectors uploaded: ${vectors.length}`);
      console.log('\\n🎯 Strategic Q&A integration complete! The system now knows about all 4 tracks.');
    } else {
      console.error('❌ Failed to upload:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Integration error:', error);
  }
}

function generateStrategicTags(track: string, question: string, answer: string, persona: string): string[] {
  const tags = ['strategic_qa', track];
  const fullText = `${question} ${answer}`.toLowerCase();
  
  // Track-specific tags
  if (track === 'business_analyst') tags.push('ba', 'agile', 'requirements', 'stakeholder');
  if (track === 'data_ai') tags.push('data', 'ai', 'python', 'sql', 'analytics');
  if (track === 'cybersecurity') tags.push('cyber', 'security', 'aws', 'compliance');
  if (track === 'full_stack') tags.push('developer', 'coding', 'frontend', 'backend');
  if (track === 'general') tags.push('comparison', 'pricing', 'schedule');
  
  // Persona-specific tags
  if (persona.includes('Sofia')) tags.push('marketing_background', 'career_changer');
  if (persona.includes('Lukas')) tags.push('academic_background', 'research');
  if (persona.includes('Priya')) tags.push('returning_workforce', 'family');
  if (persona.includes('Career Changer')) tags.push('career_change');
  
  // Content-based tags
  if (fullText.includes('pricing') || fullText.includes('$740') || fullText.includes('cost')) tags.push('pricing', 'payment');
  if (fullText.includes('visa') || fullText.includes('pr ') || fullText.includes('485')) tags.push('visa', 'immigration');
  if (fullText.includes('portfolio') || fullText.includes('project')) tags.push('portfolio', 'projects');
  if (fullText.includes('job') || fullText.includes('employment') || fullText.includes('hiring')) tags.push('employment', 'jobs');
  if (fullText.includes('beginner') || fullText.includes('no experience')) tags.push('beginner_friendly');
  if (fullText.includes('flexible') || fullText.includes('part-time') || fullText.includes('schedule')) tags.push('flexible_schedule');
  
  return tags;
}

integrateStrategicQA().catch(console.error);