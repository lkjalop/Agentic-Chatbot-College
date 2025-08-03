import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { searchVectors } from '@/lib/vector';

async function testVectorContent() {
  console.log('🔍 Testing vector search for bootcamp content...\n');
  
  // Test 1: Search for Callum Hudson content
  console.log('1️⃣ Searching for Callum Hudson content:');
  const calumResult = await searchVectors({
    query: 'Callum Hudson Australian BA bootcamp admin background',
    limit: 5
  });
  console.log(`Results found: ${calumResult.results?.length || 0}`);
  calumResult.results?.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.metadata?.title || 'No title'}`);
    console.log(`     Content: ${r.content?.substring(0, 150)}...`);
    console.log(`     Category: ${r.metadata?.category}`);
    console.log('');
  });
  
  // Test 2: Search for specific bootcamp pricing
  console.log('2️⃣ Searching for bootcamp pricing ($740/$1430):');
  const priceResult = await searchVectors({
    query: '$740 $1430 AUD bootcamp cost pricing',
    limit: 5
  });
  console.log(`Results found: ${priceResult.results?.length || 0}`);
  priceResult.results?.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.metadata?.title || 'No title'}`);
    console.log(`     Content: ${r.content?.substring(0, 150)}...`);
    console.log('');
  });

  // Test 3: Search with category filter
  console.log('3️⃣ Searching for bootcamp_qa category:');
  const categoryResult = await searchVectors({
    query: 'bootcamp program',
    limit: 10,
    filter: { category: 'bootcamp_qa' }
  });
  console.log(`Results found: ${categoryResult.results?.length || 0}`);
  categoryResult.results?.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i+1}. ${r.metadata?.title || 'No title'}`);
    console.log(`     Content: ${r.content?.substring(0, 150)}...`);
    console.log('');
  });

  // Test 4: General search for any uploaded content
  console.log('4️⃣ General search for personas:');
  const generalResult = await searchVectors({
    query: 'Sofia Martinez Tyler Brooks Rohan Patel',
    limit: 8
  });
  console.log(`Results found: ${generalResult.results?.length || 0}`);
  generalResult.results?.forEach((r, i) => {
    console.log(`  ${i+1}. ${r.metadata?.title || 'No title'}`);
    console.log(`     Tags: ${r.metadata?.tags?.join(', ') || 'None'}`);
    console.log('');
  });
}

testVectorContent().catch(console.error);