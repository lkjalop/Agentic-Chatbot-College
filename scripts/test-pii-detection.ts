import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';

async function testPIIDetection() {
  console.log('🔍 Testing PII Detection Directly...\n');
  
  const security = new BasicSecurityAgent();
  
  const testCases = [
    {
      name: "Credit Card",
      content: "My credit card is 4532-1234-5678-9012",
      expectedThreat: true
    },
    {
      name: "SSN",
      content: "My SSN is 123-45-6789",
      expectedThreat: true
    },
    {
      name: "Australian TFN", 
      content: "My TFN is 123 456 789",
      expectedThreat: true
    },
    {
      name: "Safe content",
      content: "I want to learn about business analysis",
      expectedThreat: false
    }
  ];
  
  for (const test of testCases) {
    console.log(`Testing: ${test.name}`);
    console.log(`Content: "${test.content}"`);
    
    const result = await security.quickScan({
      content: test.content,
      channel: 'chat',
      sessionId: 'test',
      userId: 'test'
    });
    
    console.log(`Allowed: ${result.allowed}`);
    console.log(`Reason: ${result.reason || 'None'}`);
    console.log(`Flags: [${result.flags?.join(', ') || 'None'}]`);
    
    const testPassed = (!result.allowed) === test.expectedThreat;
    console.log(`Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log('─'.repeat(50));
  }
}

testPIIDetection().catch(console.error);