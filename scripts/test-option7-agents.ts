#!/usr/bin/env tsx

/**
 * Comprehensive testing for Option 7: Smart Career Track + Essential Support
 * Tests all 6 agents with various query types and scenarios
 */

import { routeToAgent, getFeatureFlags, getAgentMapping } from '@/lib/ai/router';
import { analyzeIntent } from '@/lib/ai/groq';

interface TestCase {
  query: string;
  expectedAgent: string;
  category: string;
  description: string;
}

interface TestResult {
  query: string;
  expectedAgent: string;
  actualAgent: string;
  passed: boolean;
  category: string;
  description: string;
  intent?: any;
}

const testCases: TestCase[] = [
  // Career Track Tests - Data & AI
  {
    query: "what Python skills do I need for data science",
    expectedAgent: "data_ai",
    category: "Career Track - Data & AI",
    description: "Data science Python skills query"
  },
  {
    query: "machine learning career path requirements",
    expectedAgent: "data_ai", 
    category: "Career Track - Data & AI",
    description: "ML career guidance"
  },
  {
    query: "SQL database skills for analytics role",
    expectedAgent: "data_ai",
    category: "Career Track - Data & AI", 
    description: "Analytics skills query"
  },

  // Career Track Tests - Cybersecurity
  {
    query: "cybersecurity bootcamp prerequisites",
    expectedAgent: "cybersecurity",
    category: "Career Track - Cybersecurity",
    description: "Security bootcamp inquiry"
  },
  {
    query: "ethical hacking certification path",
    expectedAgent: "cybersecurity",
    category: "Career Track - Cybersecurity",
    description: "Ethical hacking guidance"
  },
  {
    query: "AWS security compliance training",
    expectedAgent: "cybersecurity",
    category: "Career Track - Cybersecurity",
    description: "Cloud security query"
  },

  // Career Track Tests - Business Analyst
  {
    query: "business analyst requirements gathering skills",
    expectedAgent: "business_analyst",
    category: "Career Track - Business Analyst",
    description: "BA core skills"
  },
  {
    query: "stakeholder management techniques",
    expectedAgent: "business_analyst",
    category: "Career Track - Business Analyst", 
    description: "Stakeholder management"
  },
  {
    query: "process improvement methodologies",
    expectedAgent: "business_analyst",
    category: "Career Track - Business Analyst",
    description: "Process improvement"
  },

  // Career Track Tests - Full Stack
  {
    query: "full stack developer roadmap with React",
    expectedAgent: "fullstack",
    category: "Career Track - Full Stack",
    description: "Full stack career path"
  },
  {
    query: "JavaScript and Node.js backend development",
    expectedAgent: "fullstack",
    category: "Career Track - Full Stack",
    description: "Backend development skills"
  },
  {
    query: "web development frontend frameworks",
    expectedAgent: "fullstack",
    category: "Career Track - Full Stack",
    description: "Frontend frameworks"
  },

  // Essential Support Tests - Booking
  {
    query: "book appointment with career advisor",
    expectedAgent: "booking",
    category: "Essential Support - Booking",
    description: "Appointment booking"
  },
  {
    query: "schedule consultation about bootcamp options",
    expectedAgent: "booking",
    category: "Essential Support - Booking",
    description: "Consultation scheduling"
  },
  {
    query: "meet with advisor for career guidance",
    expectedAgent: "booking",
    category: "Essential Support - Booking",
    description: "Advisor meeting request"
  },

  // Essential Support Tests - Cultural
  {
    query: "visa requirements for international students",
    expectedAgent: "cultural",
    category: "Essential Support - Cultural",
    description: "Visa guidance"
  },
  {
    query: "485 visa work authorization options",
    expectedAgent: "cultural",
    category: "Essential Support - Cultural",
    description: "Work authorization"
  },
  {
    query: "international student cultural adaptation",
    expectedAgent: "cultural",
    category: "Essential Support - Cultural",
    description: "Cultural support"
  },

  // Communication/Voice Queries (should route to career tracks with context)
  {
    query: "presentation skills for business analyst role",
    expectedAgent: "business_analyst",
    category: "Communication Context",
    description: "BA presentation skills"
  },
  {
    query: "technical communication for developers",
    expectedAgent: "fullstack",
    category: "Communication Context", 
    description: "Developer communication"
  },

  // Edge Cases and Mixed Queries
  {
    query: "compare data science vs cybersecurity career paths",
    expectedAgent: "data_ai", // Should pick first match or default to business_analyst
    category: "Mixed Query",
    description: "Career comparison"
  },
  {
    query: "general career advice for tech transition",
    expectedAgent: "business_analyst", // Default career track
    category: "General Query",
    description: "Default routing test"
  }
];

async function runAgentTests(): Promise<void> {
  console.log('🚀 Starting Option 7 Agent Testing Suite');
  console.log('=====================================');
  
  // Check feature flags first
  const flags = getFeatureFlags();
  console.log('🏁 Feature Flags Status:');
  console.log(`   FEATURE_CAREER_TRACKS: ${flags.USE_CAREER_TRACKS}`);
  console.log(`   ROLLBACK_TO_ORIGINAL: ${flags.ROLLBACK_TO_ORIGINAL}`);
  console.log(`   CAREER_TRACK_ROLLOUT: ${flags.CAREER_TRACK_ROLLOUT}%`);
  console.log('');

  const results: TestResult[] = [];
  let passed = 0;
  let total = testCases.length;

  for (const testCase of testCases) {
    try {
      // Analyze intent first
      const intent = await analyzeIntent(testCase.query);
      
      // Route to agent
      const actualAgent = await routeToAgent(testCase.query, intent, 'test-session');
      
      // Get agent mapping for monitoring
      const mapping = getAgentMapping(actualAgent);
      
      const result: TestResult = {
        query: testCase.query,
        expectedAgent: testCase.expectedAgent,
        actualAgent,
        passed: actualAgent === testCase.expectedAgent,
        category: testCase.category,
        description: testCase.description,
        intent
      };
      
      results.push(result);
      
      if (result.passed) {
        passed++;
        console.log(`✅ ${result.description}`);
        console.log(`   Query: "${result.query}"`);
        console.log(`   Agent: ${actualAgent} (expected: ${testCase.expectedAgent})`);
        console.log(`   Intent: ${intent.type} (${intent.confidence})`);
        console.log(`   Legacy mapping: ${mapping.legacy}`);
      } else {
        console.log(`❌ ${result.description}`);
        console.log(`   Query: "${result.query}"`);
        console.log(`   Expected: ${testCase.expectedAgent}, Got: ${actualAgent}`);
        console.log(`   Intent: ${intent.type} (${intent.confidence})`);
      }
      console.log('');
      
    } catch (error) {
      console.error(`💥 Error testing "${testCase.query}":`, error);
      results.push({
        query: testCase.query,
        expectedAgent: testCase.expectedAgent,
        actualAgent: 'ERROR',
        passed: false,
        category: testCase.category,
        description: testCase.description
      });
    }
  }

  // Summary by category
  console.log('📊 RESULTS BY CATEGORY');
  console.log('=======================');
  
  const categories = [...new Set(testCases.map(tc => tc.category))];
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    const percentage = Math.round((categoryPassed / categoryTotal) * 100);
    
    console.log(`${category}: ${categoryPassed}/${categoryTotal} (${percentage}%)`);
  }
  
  console.log('');
  console.log('🎯 OVERALL RESULTS');
  console.log('==================');
  console.log(`Passed: ${passed}/${total} (${Math.round((passed/total) * 100)}%)`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Option 7 routing is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review routing logic for failed cases.');
  }
  
  // Agent distribution analysis
  console.log('');
  console.log('📈 AGENT DISTRIBUTION');
  console.log('=====================');
  const agentCounts = results.reduce((acc, r) => {
    acc[r.actualAgent] = (acc[r.actualAgent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(agentCounts).forEach(([agent, count]) => {
    const percentage = Math.round((count / total) * 100);
    console.log(`${agent}: ${count} queries (${percentage}%)`);
  });
}

// Run the tests
if (require.main === module) {
  runAgentTests().catch(console.error);
}

export { runAgentTests };