import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getVectorIndex } from '@/lib/vector';

async function debugVectorStructure() {
  console.log('🔍 Debugging vector database structure...\n');
  
  try {
    const index = getVectorIndex();
    
    // Get raw results from Upstash
    const rawResults = await index.query({
      data: 'Callum Hudson bootcamp',
      topK: 3,
      includeMetadata: true
    });
    
    console.log('Raw Upstash results:');
    console.log('Length:', rawResults.length);
    console.log('First result structure:', JSON.stringify(rawResults[0], null, 2));
    
    if (rawResults.length > 0) {
      const firstResult = rawResults[0];
      console.log('\n📊 First result analysis:');
      console.log('- ID:', firstResult.id);
      console.log('- Has data field:', !!firstResult.data);
      console.log('- Data type:', typeof firstResult.data);
      console.log('- Data content:', firstResult.data?.substring(0, 200));
      console.log('- Metadata exists:', !!firstResult.metadata);
      console.log('- Metadata title:', firstResult.metadata?.title);
      console.log('- Metadata category:', firstResult.metadata?.category);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugVectorStructure().catch(console.error);