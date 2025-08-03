/**
 * COMPREHENSIVE BUG HUNTING TEST SUITE
 * 
 * This script tests for various types of bugs:
 * 1. Edge cases and error conditions
 * 2. User flow inconsistencies  
 * 3. Course recommendation accuracy
 * 4. Authentication and session issues
 * 5. API endpoint failures
 * 6. Security bypass attempts
 * 7. Performance and memory issues
 */

interface BugTestResult {
  category: string;
  testName: string;
  input: any;
  expected: string;
  actual: string;
  passed: boolean;
  bugFound?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  performance?: {
    responseTime: number;
    memoryUsage?: number;
  };
}

interface BugTestSuite {
  edgeCases: BugTestCase[];
  userFlows: BugTestCase[];
  courseAccuracy: BugTestCase[];
  apiErrors: BugTestCase[];
  authIssues: BugTestCase[];
  performanceTests: BugTestCase[];
}

interface BugTestCase {
  name: string;
  input: any;
  expected: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export async function runComprehensiveBugHunt(): Promise<BugTestResult[]> {
  console.log('🔍 COMPREHENSIVE BUG HUNTING SUITE');
  console.log('==================================');
  console.log('Testing for edge cases, user flow issues, API problems, and more...\n');

  const testSuite: BugTestSuite = {
    // Edge Cases and Error Conditions
    edgeCases: [
      {
        name: 'Empty Query',
        input: { query: '' },
        expected: 'ERROR_400',
        description: 'Should handle empty queries gracefully',
        severity: 'medium'
      },
      {
        name: 'Extremely Long Query',
        input: { query: 'a'.repeat(10000) + ' what courses do you offer?' },
        expected: 'HANDLED_OR_BLOCKED',
        description: 'Should handle very long queries without crashing',
        severity: 'high'
      },
      {
        name: 'Special Characters Query',
        input: { query: '!@#$%^&*()_+{}|:"<>?`~[]\\;\',./' },
        expected: 'SAFE_RESPONSE',
        description: 'Should handle special characters safely',
        severity: 'medium'
      },
      {
        name: 'Unicode and Emoji Query',
        input: { query: '🎓📚💻 What courses 你好 مرحبا हैलो do you offer? 🤔' },
        expected: 'NORMAL_RESPONSE',
        description: 'Should handle unicode and emojis properly',
        severity: 'low'
      },
      {
        name: 'Null Values in Request',
        input: { query: 'hello', agent: null, filters: null },
        expected: 'NORMAL_RESPONSE',
        description: 'Should handle null values in request body',
        severity: 'medium'
      },
      {
        name: 'Malformed JSON Simulation',
        input: 'malformed_json_test',
        expected: 'ERROR_400',
        description: 'Should handle malformed JSON gracefully',
        severity: 'high'
      },
      {
        name: 'Missing Required Fields',
        input: { agent: 'knowledge', filters: {} },
        expected: 'ERROR_400',
        description: 'Should validate required fields',
        severity: 'medium'
      },
      {
        name: 'Nested Object Injection',
        input: { query: 'hello', nested: { deep: { very: { deep: 'value' } } } },
        expected: 'NORMAL_RESPONSE',
        description: 'Should handle deeply nested objects',
        severity: 'low'
      }
    ],

    // User Flow Consistency Tests
    userFlows: [
      {
        name: 'Topic Switching Consistency',
        input: [
          { query: 'I want to learn data analysis' },
          { query: 'Actually, what about cybersecurity?' },
          { query: 'How about full stack development?' },
          { query: 'Back to data analysis please' }
        ],
        expected: 'CONSISTENT_PERSONA_REFERENCE',
        description: 'User should maintain identity across topic switches',
        severity: 'critical'
      },
      {
        name: 'Anonymous User Name Collection',
        input: [
          { query: 'What courses do you offer?' },
          { query: 'My name is Sarah' },
          { query: 'Tell me about data analysis' }
        ],
        expected: 'REMEMBERS_NAME_SARAH',
        description: 'Should remember user name after collection',
        severity: 'high'
      },
      {
        name: 'Session Persistence',
        input: [
          { query: 'I\'m interested in cybersecurity', wait: 30000 },
          { query: 'What did I just ask about?' }
        ],
        expected: 'REMEMBERS_PREVIOUS_CONTEXT',
        description: 'Should maintain context across time gaps',
        severity: 'medium'
      },
      {
        name: 'Course Recommendation Consistency',
        input: [
          { query: 'I have a marketing background and want to transition to tech' },
          { query: 'What would you recommend for someone like me?' },
          { query: 'Are you sure that\'s the best fit?' }
        ],
        expected: 'CONSISTENT_BA_RECOMMENDATION',
        description: 'Should consistently recommend Business Analyst for marketing background',
        severity: 'high'
      }
    ],

    // Course Recommendation Accuracy
    courseAccuracy: [
      {
        name: 'Marketing Background',
        input: { query: 'I have 5 years in marketing and want to move to tech, no coding experience' },
        expected: 'BUSINESS_ANALYST',
        description: 'Should recommend Business Analyst for marketing background',
        severity: 'high'
      },
      {
        name: 'Research Background',
        input: { query: 'I\'m a research scientist with Python experience, love working with data' },
        expected: 'DATA_AI_ANALYST',
        description: 'Should recommend Data & AI Analyst for research + Python',
        severity: 'high'
      },
      {
        name: 'IT Security Interest',
        input: { query: 'I work in banking and interested in AWS cloud security and compliance' },
        expected: 'CYBERSECURITY',
        description: 'Should recommend Cybersecurity for AWS security interest',
        severity: 'high'
      },
      {
        name: 'Creative Background',
        input: { query: 'I\'m a graphic designer who wants to build websites and mobile apps' },
        expected: 'FULL_STACK_DEVELOPER',
        description: 'Should recommend Full Stack for creative wanting to build apps',
        severity: 'high'
      },
      {
        name: 'Ambiguous Query',
        input: { query: 'I want to work in tech but not sure what' },
        expected: 'MULTIPLE_OPTIONS_OR_QUESTIONS',
        description: 'Should ask clarifying questions for ambiguous queries',
        severity: 'medium'
      },
      {
        name: 'Wrong Course Self-Assessment',
        input: { query: 'I want to be a full stack developer but I hate coding' },
        expected: 'GENTLE_REDIRECTION',
        description: 'Should gently redirect mismatched expectations',
        severity: 'medium'
      }
    ],

    // API Error Handling
    apiErrors: [
      {
        name: 'Rate Limit Testing',
        input: Array(25).fill({ query: 'test rate limit' }),
        expected: 'RATE_LIMITED_AFTER_20',
        description: 'Should enforce 20 requests/minute rate limit',
        severity: 'high'
      },
      {
        name: 'Invalid Agent Type',
        input: { query: 'hello', agent: 'invalid_agent_type' },
        expected: 'FALLS_BACK_TO_KNOWLEDGE',
        description: 'Should fallback to knowledge agent for invalid agent types',
        severity: 'low'
      },
      {
        name: 'Missing Environment Variables',
        input: { simulateEnvFailure: true, query: 'hello' },
        expected: 'GRACEFUL_FALLBACK',
        description: 'Should handle missing environment variables gracefully',
        severity: 'critical'
      },
      {
        name: 'Database Connection Failure',
        input: { simulateDbFailure: true, query: 'hello' },
        expected: 'WORKS_WITHOUT_DB',
        description: 'Should work when database is unavailable',
        severity: 'high'
      },
      {
        name: 'Vector DB Failure',
        input: { simulateVectorFailure: true, query: 'hello' },
        expected: 'FALLBACK_RESPONSES',
        description: 'Should use fallback when vector DB fails',
        severity: 'high'
      }
    ],

    // Authentication and Session Issues
    authIssues: [
      {
        name: 'Unauthenticated User',
        input: { query: 'hello', noAuth: true },
        expected: 'WORKS_WITHOUT_AUTH',
        description: 'Should work for unauthenticated users',
        severity: 'medium'
      },
      {
        name: 'Invalid Session Token',
        input: { query: 'hello', invalidSession: true },
        expected: 'HANDLES_INVALID_SESSION',
        description: 'Should handle invalid session tokens gracefully',
        severity: 'medium'
      },
      {
        name: 'Session Expiry',
        input: { query: 'hello', expiredSession: true },
        expected: 'HANDLES_EXPIRED_SESSION',
        description: 'Should handle expired sessions gracefully',
        severity: 'medium'
      }
    ],

    // Performance and Memory Tests
    performanceTests: [
      {
        name: 'Concurrent Requests',
        input: Array(10).fill({ query: 'performance test concurrent' }),
        expected: 'ALL_COMPLETE_UNDER_5S',
        description: 'Should handle 10 concurrent requests efficiently',
        severity: 'medium'
      },
      {
        name: 'Memory Leak Test',
        input: Array(100).fill({ query: 'memory test ' + Math.random() }),
        expected: 'NO_MEMORY_LEAK',
        description: 'Should not leak memory with many requests',
        severity: 'high'
      },
      {
        name: 'Response Time Consistency',
        input: Array(20).fill({ query: 'response time test' }),
        expected: 'CONSISTENT_TIMING',
        description: 'Response times should be consistent',
        severity: 'low'
      }
    ]
  };

  const results: BugTestResult[] = [];
  let totalTests = 0;
  let bugsFound = 0;

  // Run all test categories
  for (const [category, tests] of Object.entries(testSuite)) {
    console.log(`\\n🔍 Testing ${category.toUpperCase()}`);
    console.log('─'.repeat(50));
    
    for (const test of tests) {
      totalTests++;
      const startTime = Date.now();
      
      try {
        let testResult: BugTestResult;
        
        if (category === 'userFlows') {
          testResult = await runUserFlowTest(test);
        } else if (category === 'performanceTests') {
          testResult = await runPerformanceTest(test);
        } else if (category === 'apiErrors') {
          testResult = await runApiErrorTest(test);
        } else {
          testResult = await runStandardTest(test, category);
        }
        
        testResult.performance = {
          responseTime: Date.now() - startTime
        };
        
        results.push(testResult);
        
        if (!testResult.passed && testResult.bugFound) {
          bugsFound++;
          console.log(`🐛 BUG FOUND: ${test.name}`);
          console.log(`   Issue: ${testResult.bugFound}`);
          console.log(`   Severity: ${testResult.severity}`);
        } else {
          console.log(`✅ PASSED: ${test.name}`);
        }
        
      } catch (error) {
        console.error(`❌ ERROR: ${test.name}:`, error);
        results.push({
          category,
          testName: test.name,
          input: test.input,
          expected: test.expected,
          actual: `ERROR: ${error}`,
          passed: false,
          bugFound: `Test execution failed: ${error}`,
          severity: 'high',
          performance: { responseTime: Date.now() - startTime }
        });
        bugsFound++;
      }
    }
  }

  // Generate comprehensive bug report
  console.log('\\n🔍 COMPREHENSIVE BUG HUNT RESULTS');
  console.log('==================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Bugs Found: ${bugsFound}`);
  console.log(`Success Rate: ${Math.round((totalTests - bugsFound) / totalTests * 100)}%`);

  // Categorize bugs by severity
  const bugsBySeverity = results
    .filter(r => !r.passed && r.bugFound)
    .reduce((acc, result) => {
      acc[result.severity] = (acc[result.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  console.log('\\n🚨 BUGS BY SEVERITY:');
  Object.entries(bugsBySeverity).forEach(([severity, count]) => {
    const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
    console.log(`${icon} ${severity.toUpperCase()}: ${count} bugs`);
  });

  // Performance analysis
  const avgResponseTime = results.reduce((sum, r) => sum + (r.performance?.responseTime || 0), 0) / results.length;
  console.log(`\\n⚡ AVERAGE RESPONSE TIME: ${Math.round(avgResponseTime)}ms`);

  // Critical bugs requiring immediate attention
  const criticalBugs = results.filter(r => !r.passed && r.severity === 'critical');
  if (criticalBugs.length > 0) {
    console.log('\\n🔴 CRITICAL BUGS REQUIRING IMMEDIATE ATTENTION:');
    criticalBugs.forEach(bug => {
      console.log(`- ${bug.category}/${bug.testName}: ${bug.bugFound}`);
    });
  }

  console.log('\\n✅ Bug hunting complete! Check detailed results above.');
  return results;
}

async function runStandardTest(test: BugTestCase, category: string): Promise<BugTestResult> {
  try {
    // Handle special test cases
    if (test.input === 'malformed_json_test') {
      // Simulate malformed JSON by sending invalid content-type
      const response = await fetch('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'invalid json content'
      });
      
      return {
        category,
        testName: test.name,
        input: test.input,
        expected: test.expected,
        actual: response.ok ? 'ACCEPTED_INVALID' : 'REJECTED_PROPERLY',
        passed: !response.ok,
        bugFound: response.ok ? 'API accepted malformed JSON' : undefined,
        severity: test.severity
      };
    }

    const response = await fetch('http://localhost:3000/api/search/personalized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test.input),
    });

    const data = await response.json();
    
    // Analyze response based on expected outcome
    let passed = false;
    let bugFound: string | undefined;
    let actual = 'UNKNOWN';
    
    if (test.expected === 'ERROR_400' && response.status === 400) {
      passed = true;
      actual = 'ERROR_400';
    } else if (test.expected === 'SAFE_RESPONSE' && response.ok && data.response) {
      passed = !data.blocked;
      actual = data.blocked ? 'BLOCKED' : 'SAFE_RESPONSE';
      if (data.blocked) bugFound = 'Safe query was incorrectly blocked';
    } else if (test.expected === 'NORMAL_RESPONSE' && response.ok && data.response) {
      passed = true;
      actual = 'NORMAL_RESPONSE';
    } else if (test.expected === 'HANDLED_OR_BLOCKED') {
      passed = response.ok; // As long as it doesn't crash
      actual = response.ok ? 'HANDLED' : 'SERVER_ERROR';
      if (!response.ok) bugFound = 'Server crashed on long query';
    } else {
      passed = false;
      actual = `Status: ${response.status}, Data: ${JSON.stringify(data).substring(0, 100)}`;
      bugFound = `Unexpected response for ${test.name}`;
    }

    return {
      category,
      testName: test.name,
      input: test.input,
      expected: test.expected,
      actual,
      passed,
      bugFound,
      severity: test.severity
    };
    
  } catch (error) {
    return {
      category,
      testName: test.name,
      input: test.input,
      expected: test.expected,
      actual: `EXCEPTION: ${error}`,
      passed: false,
      bugFound: `Test threw exception: ${error}`,
      severity: 'high'
    };
  }
}

async function runUserFlowTest(test: BugTestCase): Promise<BugTestResult> {
  // Simulate user flow with multiple requests
  console.log(`   Running user flow: ${test.name}`);
  
  if (test.name === 'Topic Switching Consistency') {
    const queries = test.input as Array<{query: string}>;
    const responses = [];
    
    for (const queryObj of queries) {
      try {
        const response = await fetch('http://localhost:3000/api/search/personalized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryObj),
        });
        const data = await response.json();
        responses.push(data);
      } catch (error) {
        responses.push({ error: error.toString() });
      }
    }
    
    // Check if persona references are consistent
    const personaNames = responses
      .map(r => r.diagnostics?.personaMatch?.name)
      .filter(Boolean);
    
    // Should use "Reference: Similar to X" format consistently
    const hasProperFormat = personaNames.every(name => 
      name?.startsWith('Reference:') || name?.includes('Similar to')
    );
    
    return {
      category: 'userFlows',
      testName: test.name,
      input: test.input,
      expected: test.expected,
      actual: hasProperFormat ? 'CONSISTENT_PERSONA_REFERENCE' : 'INCONSISTENT_PERSONAS',
      passed: hasProperFormat,
      bugFound: hasProperFormat ? undefined : 'Persona references not properly formatted',
      severity: test.severity
    };
  }
  
  // Default user flow test
  return {
    category: 'userFlows',
    testName: test.name,
    input: test.input,
    expected: test.expected,
    actual: 'NOT_IMPLEMENTED',
    passed: false,
    bugFound: 'User flow test not implemented',
    severity: 'low'
  };
}

async function runPerformanceTest(test: BugTestCase): Promise<BugTestResult> {
  console.log(`   Running performance test: ${test.name}`);
  
  if (test.name === 'Concurrent Requests') {
    const startTime = Date.now();
    const queries = test.input as Array<{query: string}>;
    
    const promises = queries.map(queryObj => 
      fetch('http://localhost:3000/api/search/personalized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryObj),
      })
    );
    
    try {
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const passed = totalTime < 5000; // Should complete in under 5 seconds
      
      return {
        category: 'performanceTests',
        testName: test.name,
        input: test.input,
        expected: test.expected,
        actual: `COMPLETED_IN_${totalTime}MS`,
        passed,
        bugFound: passed ? undefined : 'Concurrent requests too slow',
        severity: test.severity,
        performance: { responseTime: totalTime }
      };
    } catch (error) {
      return {
        category: 'performanceTests',
        testName: test.name,
        input: test.input,
        expected: test.expected,
        actual: `FAILED: ${error}`,
        passed: false,
        bugFound: `Performance test failed: ${error}`,
        severity: 'high'
      };
    }
  }
  
  // Default performance test
  return {
    category: 'performanceTests',
    testName: test.name,
    input: test.input,
    expected: test.expected,
    actual: 'NOT_IMPLEMENTED',
    passed: false,
    bugFound: 'Performance test not implemented',
    severity: 'low'
  };
}

async function runApiErrorTest(test: BugTestCase): Promise<BugTestResult> {
  console.log(`   Running API error test: ${test.name}`);
  
  if (test.name === 'Rate Limit Testing') {
    const queries = test.input as Array<{query: string}>;
    let rateLimited = false;
    let requestCount = 0;
    
    for (const queryObj of queries) {
      try {
        const response = await fetch('http://localhost:3000/api/search/personalized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(queryObj),
        });
        
        const data = await response.json();
        requestCount++;
        
        if (data.response?.includes('sending messages too quickly') || 
            data.securityReason === 'rate_limit_exceeded') {
          rateLimited = true;
          break;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        break;
      }
    }
    
    const passed = rateLimited && requestCount <= 20;
    
    return {
      category: 'apiErrors',
      testName: test.name,
      input: test.input,
      expected: test.expected,
      actual: rateLimited ? `RATE_LIMITED_AFTER_${requestCount}` : 'NO_RATE_LIMITING',
      passed,
      bugFound: passed ? undefined : 'Rate limiting not working properly',
      severity: test.severity
    };
  }
  
  // Default API error test
  return {
    category: 'apiErrors',
    testName: test.name,
    input: test.input,
    expected: test.expected,
    actual: 'NOT_IMPLEMENTED',
    passed: false,
    bugFound: 'API error test not implemented',
    severity: 'low'
  };
}

// Run if executed directly
if (typeof window === 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveBugHunt().catch(console.error);
}