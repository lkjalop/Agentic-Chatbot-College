import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

async function integrateStrategicQAFixed() {
  console.log('🎯 Integrating 30 Strategic Q&As for All Tracks (Fixed Parser)...\n');
  
  try {
    // Read the strategic Q&A file
    const qaFilePath = path.join(process.cwd(), '..', 'strategic_qa_comprehensive.md');
    
    if (!fs.existsSync(qaFilePath)) {
      console.error('❌ strategic_qa_comprehensive.md not found');
      return;
    }
    
    const content = fs.readFileSync(qaFilePath, 'utf-8');
    const qaResponses: any[] = [];
    
    // Split by ### headers to get individual Q&As
    const qaSections = content.split(/### /);
    
    // Process each Q&A (skip first empty section)
    for (let i = 1; i < qaSections.length; i++) {
      const section = qaSections[i];
      
      // Extract header/title
      const lines = section.split('\n');
      const header = lines[0]?.trim() || '';
      
      // Skip sections without proper Q&A format
      if (!section.includes('**Q:**') || !section.includes('**A:**')) {
        continue;
      }
      
      // Extract persona
      let persona = 'General';
      const personaMatch = section.match(/\*\*Persona:\*\* ([^\n]+)/);
      if (personaMatch) {
        persona = personaMatch[1].trim();
      }
      
      // Extract question
      const questionMatch = section.match(/\*\*Q:\*\* (.+?)(?=\*\*A:\*\*)/s);
      if (!questionMatch) continue;
      const question = questionMatch[1].trim();
      
      // Extract answer
      const answerMatch = section.match(/\*\*A:\*\* (.+?)(?=\n\n---|\n\n##|$)/s);
      if (!answerMatch) continue;
      const answer = answerMatch[1].trim();
      
      // Determine track from section context
      let track = 'general';
      let trackName = 'General';
      
      if (header.startsWith('BA-') || section.includes('Business Analyst')) {
        track = 'business_analyst';
        trackName = 'Business Analyst';
      } else if (header.startsWith('DATA-') || section.includes('Data & AI')) {
        track = 'data_ai'; 
        trackName = 'Data & AI';
      } else if (header.startsWith('CYBER-') || section.includes('Cybersecurity')) {
        track = 'cybersecurity';
        trackName = 'Cybersecurity';
      } else if (header.startsWith('FULL-') || section.includes('Full Stack')) {
        track = 'full_stack';
        trackName = 'Full Stack Developer';
      } else if (header.startsWith('GEN-') || section.includes('General')) {
        track = 'general';
        trackName = 'General/Comparison';
      }
      
      // Generate tags
      const tags = generateStrategicTags(track, question, answer, persona);
      
      qaResponses.push({
        id: `strategic_qa_${track}_${i}`,
        track: track,
        trackName: trackName,
        persona: persona,
        question: question,
        answer: answer,
        tags: tags,
        header: header
      });
      
      console.log(`✓ Extracted: ${header} (${trackName})`);
    }
    
    console.log(`\n📊 Extracted ${qaResponses.length} strategic Q&As`);
    
    // Show breakdown by track
    const trackGroups = qaResponses.reduce((acc, qa) => {
      acc[qa.trackName] = (acc[qa.trackName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n📋 Q&A Breakdown by Track:');
    Object.entries(trackGroups).forEach(([track, count]) => {
      console.log(`  - ${track}: ${count} Q&As`);
    });
    
    // Convert to vector format
    const vectors = qaResponses.map(qa => {
      const metadata: VectorMetadata = {
        id: qa.id,
        title: `${qa.trackName}: ${qa.header}`,
        content: `Track: ${qa.trackName}\nPersona: ${qa.persona}\n\nQ: ${qa.question}\n\nA: ${qa.answer}`,
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
        content: `Track: ${qa.trackName}\nPersona: ${qa.persona}\n\nQuestion: ${qa.question}\n\nAnswer: ${qa.answer}`,
        metadata
      };
    });
    
    console.log(`\n🔄 Converting ${vectors.length} strategic Q&As to vector format...`);
    
    // Upload to vector database
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded strategic Q&As!');
      console.log(`📊 Total vectors uploaded: ${vectors.length}`);
      console.log('\n🎯 Strategic Q&A integration complete! The system now understands all 4 tracks with specific guidance.');
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
  
  // Content-based tags
  if (fullText.includes('pricing') || fullText.includes('$740') || fullText.includes('cost')) tags.push('pricing', 'payment');
  if (fullText.includes('visa') || fullText.includes('pr ') || fullText.includes('485')) tags.push('visa', 'immigration');
  if (fullText.includes('portfolio') || fullText.includes('project')) tags.push('portfolio', 'projects');
  if (fullText.includes('job') || fullText.includes('employment') || fullText.includes('hiring')) tags.push('employment', 'jobs');
  if (fullText.includes('beginner') || fullText.includes('no experience')) tags.push('beginner_friendly');
  if (fullText.includes('flexible') || fullText.includes('part-time') || fullText.includes('schedule')) tags.push('flexible_schedule');
  if (fullText.includes('success') || fullText.includes('hired') || fullText.includes('graduated')) tags.push('success_stories');
  
  return tags;
}

integrateStrategicQAFixed().catch(console.error);