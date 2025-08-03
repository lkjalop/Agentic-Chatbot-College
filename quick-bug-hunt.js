// Quick Bug Hunt - Immediate Testing
// Tests for common bugs and edge cases

async function quickBugHunt() {
  console.log('🔍 QUICK BUG HUNT - Testing Common Issues');
  console.log('==========================================\n');

  const tests = [
    // Edge Cases
    {
      name: 'Empty Query',
      test: () => testQuery(''),
      expectError: true,
      severity: 'medium'
    },
    {
      name: 'Very Long Query',
      test: () => testQuery('a'.repeat(1000) + ' what courses do you offer?'),
      expectError: false,
      severity: 'high'
    },
    {
      name: 'Special Characters',
      test: () => testQuery('!@#$%^&*()_+ what courses?'),
      expectError: false,
      severity: 'medium'
    },
    {
      name: 'Unicode and Emojis',
      test: () => testQuery('🎓 What courses 你好 do you offer? 🤔'),
      expectError: false,
      severity: 'low'
    },

    // Course Recommendation Accuracy
    {
      name: 'Marketing Background',
      test: () => testQuery('I have marketing background, no coding experience'),
      expectCourse: 'business',
      severity: 'high'
    },
    {
      name: 'Data Science Interest',
      test: () => testQuery('I love Python and want to work with data analytics'),
      expectCourse: 'data',
      severity: 'high'
    },
    {
      name: 'Security Interest',
      test: () => testQuery('I want to learn AWS security and cybersecurity'),
      expectCourse: 'cyber',
      severity: 'high'
    },
    {
      name: 'Developer Interest',
      test: () => testQuery('I want to build websites and mobile apps'),
      expectCourse: 'fullstack',
      severity: 'high'
    },

    // User Flow Issues
    {
      name: 'Multiple Topics Same User',
      test: () => testMultipleQueries([
        'Tell me about data analysis',
        'What about cybersecurity?',
        'How about business analyst?'
      ]),
      checkPersonaConsistency: true,
      severity: 'critical'
    },

    // Security Tests
    {
      name: 'PII Detection',
      test: () => testQuery('My credit card is 4532-1234-5678-9012'),
      expectBlocked: true,
      severity: 'critical'
    },
    {
      name: 'SQL Injection',
      test: () => testQuery("What courses? '; DROP TABLE users; --"),
      expectBlocked: true,
      severity: 'critical'
    },

    // Performance Tests
    {
      name: 'Response Time',
      test: () => testResponseTime('What courses do you offer?'),
      expectFast: true,
      severity: 'medium'
    }
  ];

  let passed = 0;
  let failed = 0;
  let bugsFound = [];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    
    try {
      const result = await test.test();
      let testPassed = false;
      let issue = null;

      // Check expectations
      if (test.expectError && result.error) {
        testPassed = true;
      } else if (test.expectError && !result.error) {
        issue = 'Should have returned error but did not';
      } else if (!test.expectError && result.error) {
        issue = `Unexpected error: ${result.error}`;
      } else if (test.expectBlocked && !result.blocked) {
        issue = 'Security threat not blocked';
      } else if (test.expectBlocked && result.blocked) {
        testPassed = true;
      } else if (test.expectCourse) {
        const response = (result.response || '').toLowerCase();
        const hasCorrectCourse = response.includes(test.expectCourse) || 
                                 (result.results && result.results.some(r => 
                                   r.metadata?.title?.toLowerCase().includes(test.expectCourse)));
        if (hasCorrectCourse) {
          testPassed = true;
        } else {
          issue = `Should recommend ${test.expectCourse} course but did not`;
        }
      } else if (test.checkPersonaConsistency) {
        // Check if persona references are consistent
        const hasInconsistentPersonas = result.some((r, i) => {
          if (i === 0) return false;
          const prevPersona = result[i-1].diagnostics?.personaMatch?.name;
          const currPersona = r.diagnostics?.personaMatch?.name;
          return prevPersona && currPersona && 
                 !prevPersona.startsWith('Reference:') && 
                 !currPersona.startsWith('Reference:') &&
                 prevPersona !== currPersona;
        });
        
        if (!hasInconsistentPersonas) {
          testPassed = true;
        } else {
          issue = 'Persona references inconsistent across queries';
        }
      } else if (test.expectFast) {
        if (result.responseTime < 2000) {
          testPassed = true;
        } else {
          issue = `Response too slow: ${result.responseTime}ms`;
        }
      } else {
        // Default: if no error and got response, pass
        testPassed = !result.error && (result.response || result.data);
      }

      if (testPassed) {
        console.log(`✅ PASSED: ${test.name}`);
        passed++;
      } else {
        console.log(`🐛 FAILED: ${test.name}`);
        console.log(`   Issue: ${issue || 'Unknown issue'}`);
        console.log(`   Severity: ${test.severity}`);
        failed++;
        bugsFound.push({
          name: test.name,
          issue: issue || 'Unknown issue',
          severity: test.severity,
          result
        });
      }

    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
      failed++;
      bugsFound.push({
        name: test.name,
        issue: `Test execution failed: ${error.message}`,
        severity: 'high',
        error: error.toString()
      });
    }

    console.log('---');
  }

  // Summary
  console.log('\\n🔍 BUG HUNT SUMMARY');
  console.log('===================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round(passed / (passed + failed) * 100)}%`);

  if (bugsFound.length > 0) {
    console.log('\\n🐛 BUGS FOUND:');
    
    const criticalBugs = bugsFound.filter(b => b.severity === 'critical');
    const highBugs = bugsFound.filter(b => b.severity === 'high');
    const mediumBugs = bugsFound.filter(b => b.severity === 'medium');
    const lowBugs = bugsFound.filter(b => b.severity === 'low');

    if (criticalBugs.length > 0) {
      console.log('\\n🔴 CRITICAL ISSUES:');
      criticalBugs.forEach(bug => console.log(`  - ${bug.name}: ${bug.issue}`));
    }
    
    if (highBugs.length > 0) {
      console.log('\\n🟠 HIGH PRIORITY:');
      highBugs.forEach(bug => console.log(`  - ${bug.name}: ${bug.issue}`));
    }
    
    if (mediumBugs.length > 0) {
      console.log('\\n🟡 MEDIUM PRIORITY:');
      mediumBugs.forEach(bug => console.log(`  - ${bug.name}: ${bug.issue}`));
    }
    
    if (lowBugs.length > 0) {
      console.log('\\n🟢 LOW PRIORITY:');
      lowBugs.forEach(bug => console.log(`  - ${bug.name}: ${bug.issue}`));
    }
  } else {
    console.log('\\n✅ NO BUGS FOUND! System appears stable.');
  }

  return bugsFound;
}

// Helper functions
async function testQuery(query, options = {}) {
  try {
    const response = await fetch('http://localhost:3000/api/search/personalized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        enablePersonaDetection: false,
        ...options
      }),
    });

    if (!response.ok && response.status !== 400) {
      return { error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    return {
      response: data.response,
      blocked: data.blocked,
      agent: data.agent,
      results: data.results,
      diagnostics: data.diagnostics,
      error: data.error
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function testMultipleQueries(queries) {
  const results = [];
  for (const query of queries) {
    const result = await testQuery(query);
    results.push(result);
    // Small delay between queries
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return results;
}

async function testResponseTime(query) {
  const startTime = Date.now();
  const result = await testQuery(query);
  const responseTime = Date.now() - startTime;
  return {
    ...result,
    responseTime
  };
}

// Run the test
quickBugHunt().catch(console.error);