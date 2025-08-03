import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';
import { extractQAResponses } from './extract-qa-responses';

async function uploadQAToVector() {
  console.log('🚀 Starting Q&A responses upload to vector database...');
  
  try {
    // Extract Q&A responses
    const qaResponses = extractQAResponses();
    
    if (qaResponses.length === 0) {
      console.error('❌ No Q&A responses found to upload');
      return;
    }
    
    // Convert to vector format
    const vectors = qaResponses.map(qa => {
      const metadata: VectorMetadata = {
        id: qa.id,
        title: `Q: ${qa.question}`,
        content: `Question: ${qa.question}\n\nAnswer: ${qa.answer}`,
        category: 'persona_qa',
        contentType: 'persona_qa',
        difficulty: 'beginner',
        prerequisites: [],
        leadsTo: [],
        relatedConcepts: [qa.persona],
        careerPaths: [],
        tags: qa.tags,
        confidenceScore: 0.95, // High confidence for curated Q&A
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Custom fields for persona Q&A
        personaCode: qa.personaCode,
        journeyStage: qa.stage,
        questionType: 'persona_specific'
      };
      
      return {
        id: qa.id,
        content: `Question: ${qa.question}\n\nAnswer: ${qa.answer}`,
        metadata
      };
    });
    
    console.log(`🔄 Converting ${vectors.length} Q&A responses to vector format...`);
    
    // Upload in batches
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded Q&A responses to vector database!');
      console.log(`📊 Total Q&A vectors uploaded: ${vectors.length}`);
      console.log('🎯 Enhanced persona responses now searchable via API');
      
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
      console.error('❌ Failed to upload Q&A vectors:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error);
  }
}

// Run the upload
uploadQAToVector().catch(console.error);