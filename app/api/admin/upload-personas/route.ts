import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting personas upload to Upstash Vector...');
    
    // Read the generated knowledge base JSON
    const knowledgeBasePath = path.join(process.cwd(), '..', 'data', 'processed', 'chatbot_knowledge_base_ALL_PERSONAS.json');
    
    if (!fs.existsSync(knowledgeBasePath)) {
      return Response.json({ 
        error: 'Knowledge base file not found', 
        path: knowledgeBasePath 
      }, { status: 404 });
    }
    
    const knowledgeBase = JSON.parse(fs.readFileSync(knowledgeBasePath, 'utf-8'));
    console.log(`📚 Loaded knowledge base with ${knowledgeBase.chunks?.length || 0} chunks`);
    
    if (!knowledgeBase.chunks || knowledgeBase.chunks.length === 0) {
      return Response.json({ error: 'No chunks found in knowledge base' }, { status: 400 });
    }
    
    // Convert chunks to vector format
    const vectors = knowledgeBase.chunks.map((chunk: any) => {
      const tags = chunk.tags || [];
      const careerPaths = [];
      const category = chunk.category || 'general';
      
      // Extract career paths from tags
      if (tags.includes('role_ba') || tags.includes('role_business_analyst')) careerPaths.push('business-analyst');
      if (tags.includes('role_data_analyst')) careerPaths.push('data-analyst');
      if (tags.includes('role_full_stack') || tags.includes('role_developer')) careerPaths.push('full-stack-developer');
      if (tags.includes('role_ui')) careerPaths.push('ui-ux-designer');
      
      // Determine content type and difficulty
      let contentType: 'concept' | 'skill' | 'career' | 'tutorial' | 'example' = 'concept';
      let difficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
      
      if (chunk.type === 'persona') contentType = 'career';
      if (chunk.type === 'bootcamp') contentType = 'skill';
      if (chunk.type === 'journey') contentType = 'tutorial';
      
      if (tags.includes('experience_intermediate')) difficulty = 'intermediate';
      if (tags.includes('experience_advanced')) difficulty = 'advanced';
      
      const metadata: VectorMetadata = {
        id: chunk.id,
        title: chunk.persona || chunk.title || 'Career Guidance',
        content: chunk.content || chunk.content_preview || '',
        category: category,
        contentType: contentType,
        difficulty: difficulty,
        prerequisites: [],
        leadsTo: [],
        relatedConcepts: [],
        careerPaths: careerPaths,
        tags: tags,
        confidenceScore: 0.9,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        id: chunk.id,
        content: chunk.content || chunk.content_preview || '',
        metadata: metadata
      };
    });
    
    console.log(`🔄 Converting ${vectors.length} chunks to vector format...`);
    
    // Upload in batches
    const result = await batchUpsertVectors(vectors);
    
    if (result.success) {
      console.log('✅ Successfully uploaded all personas to vector database!');
      return Response.json({
        success: true,
        message: 'Successfully uploaded all personas to vector database',
        totalVectors: vectors.length,
        results: result.results
      });
    } else {
      console.error('❌ Failed to upload vectors:', result.error);
      return Response.json({ 
        success: false, 
        error: result.error 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ Upload error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}