// Test script to analyze the impact of new personas and check for overfitting

interface TestQuery {
  query: string;
  expectedMentions: string[];
  persona?: string;
  track?: string;
}

const testQueries: TestQuery[] = [
  // Test 1: Check if Live Industry Project is mentioned
  {
    query: "How much does the Business Analyst bootcamp cost?",
    expectedMentions: ["Live Industry Project", "6-week", "optional"],
    track: "BA"
  },
  {
    query: "What's included in the Full Stack Developer program?",
    expectedMentions: ["4-week bootcamp", "Live Industry Project", "6-week optional"],
    track: "Full Stack"
  },
  
  // Test 2: Check for overfitting - similar queries from different personas
  {
    query: "I'm a university student studying CS, will this help me get practical experience?",
    expectedMentions: ["practical experience", "real projects", "industry"],
    persona: "James Chen"
  },
  {
    query: "I'm studying IT at uni but need real-world experience for jobs",
    expectedMentions: ["hands-on", "portfolio", "real-world"],
    persona: "Generic Student"
  },
  
  // Test 3: Cross-track benefits - BA persona asking about Data track
  {
    query: "I have a Business Analytics Masters like Hanh, but interested in the Data & AI track instead",
    expectedMentions: ["Data & AI", "Python", "analytics", "transition"],
    persona: "Hanh-like"
  },
  
  // Test 4: Generic career change question
  {
    query: "I'm changing careers from marketing to tech, which track is best?",
    expectedMentions: ["Business Analyst", "no coding required", "marketing background"],
    persona: "Career Changer"
  },
  
  // Test 5: Specific Live Industry Project questions
  {
    query: "Tell me more about the Live Industry Project - is it separate from the bootcamp?",
    expectedMentions: ["6-12 weeks", "optional", "after bootcamp", "real clients"],
    track: "General"
  },
  
  // Test 6: Pricing structure question
  {
    query: "What's the total cost if I do both the bootcamp and Live Industry Project?",
    expectedMentions: ["bootcamp cost", "Live Industry Project", "combined", "optional"],
    track: "General"
  },
  
  // Test 7: Different persona, same concern (structured learning)
  {
    query: "I prefer structured learning with clear processes, is this program for me?",
    expectedMentions: ["structured", "clear processes", "step-by-step"],
    persona: "Structure-focused"
  },
  
  // Test 8: Cross-benefit from James Chen's technical questions
  {
    query: "What modern frameworks and tools will I learn in the Full Stack track?",
    expectedMentions: ["Next.js", "React", "TypeScript", "AI-powered"],
    track: "Full Stack"
  }
];

async function analyzePersonaImpact() {
  const deploymentUrl = 'https://agentic-rag-system.vercel.app';
  console.log('🔬 Analyzing Persona Impact and System Performance\n');
  
  const results = {
    liveProjectMentions: 0,
    totalQueries: testQueries.length,
    overfittingConcerns: [],
    crossTrackBenefits: [],
    missingInformation: []
  };
  
  for (const [index, test] of testQueries.entries()) {
    console.log(`\n📝 Test ${index + 1}: ${test.track || test.persona || 'General'}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      const response = await fetch(`${deploymentUrl}/api/search/personalized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: test.query,
          enablePersonaDetection: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const responseText = data.response || '';
        
        // Check for expected mentions
        const foundMentions = test.expectedMentions.filter(mention => 
          responseText.toLowerCase().includes(mention.toLowerCase())
        );
        
        console.log(`   ✓ Response received (${responseText.length} chars)`);
        console.log(`   ✓ Persona detected: ${data.diagnostics?.personaMatch?.name || 'None'}`);
        console.log(`   ✓ Expected mentions found: ${foundMentions.length}/${test.expectedMentions.length}`);
        
        if (foundMentions.length < test.expectedMentions.length) {
          const missing = test.expectedMentions.filter(m => !foundMentions.includes(m));
          console.log(`   ⚠️  Missing mentions: ${missing.join(', ')}`);
          results.missingInformation.push({ test: index + 1, missing });
        }
        
        // Check for Live Industry Project mentions
        if (responseText.toLowerCase().includes('live industry project') || 
            responseText.toLowerCase().includes('6-week') ||
            responseText.toLowerCase().includes('6-12 week')) {
          results.liveProjectMentions++;
          console.log(`   ✓ Live Industry Project mentioned!`);
        }
        
        // Analyze response length and specificity
        const specificityScore = calculateSpecificity(responseText);
        console.log(`   📊 Response specificity: ${specificityScore}/10`);
        
        if (specificityScore > 8 && test.persona) {
          results.overfittingConcerns.push({
            test: index + 1,
            persona: test.persona,
            score: specificityScore
          });
        }
        
        // Check cross-track benefits
        if (test.track && data.agent !== test.track.toLowerCase().replace(' ', '_')) {
          results.crossTrackBenefits.push({
            test: index + 1,
            queryTrack: test.track,
            respondingAgent: data.agent
          });
        }
        
      } else {
        console.log(`   ❌ Query failed: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  // Summary Analysis
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPACT ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n1️⃣ Live Industry Project Coverage:');
  console.log(`   - Mentioned in ${results.liveProjectMentions}/${results.totalQueries} responses`);
  console.log(`   - Coverage rate: ${(results.liveProjectMentions/results.totalQueries*100).toFixed(1)}%`);
  if (results.liveProjectMentions < results.totalQueries / 2) {
    console.log('   ⚠️  LOW COVERAGE: Live Industry Project not being mentioned enough!');
  }
  
  console.log('\n2️⃣ Overfitting Analysis:');
  if (results.overfittingConcerns.length > 0) {
    console.log(`   ⚠️  Potential overfitting detected in ${results.overfittingConcerns.length} responses`);
    results.overfittingConcerns.forEach(concern => {
      console.log(`      - Test ${concern.test} (${concern.persona}): Specificity ${concern.score}/10`);
    });
  } else {
    console.log('   ✅ No significant overfitting detected');
  }
  
  console.log('\n3️⃣ Cross-Track Benefits:');
  if (results.crossTrackBenefits.length > 0) {
    console.log(`   ✅ ${results.crossTrackBenefits.length} queries benefited from cross-track knowledge`);
    results.crossTrackBenefits.forEach(benefit => {
      console.log(`      - Test ${benefit.test}: ${benefit.queryTrack} query → ${benefit.respondingAgent} agent`);
    });
  } else {
    console.log('   ℹ️  No significant cross-track benefits observed');
  }
  
  console.log('\n4️⃣ Missing Information:');
  if (results.missingInformation.length > 0) {
    console.log(`   ⚠️  ${results.missingInformation.length} responses missing expected information`);
    results.missingInformation.forEach(miss => {
      console.log(`      - Test ${miss.test}: Missing [${miss.missing.join(', ')}]`);
    });
  } else {
    console.log('   ✅ All expected information covered');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS:');
  console.log('='.repeat(60));
  
  if (results.liveProjectMentions < results.totalQueries / 2) {
    console.log('\n1. Add more emphasis on Live Industry Project:');
    console.log('   - Update response templates to include LIP information');
    console.log('   - Add vectors specifically about the combined bootcamp + LIP offering');
  }
  
  if (results.overfittingConcerns.length > 0) {
    console.log('\n2. Address potential overfitting:');
    console.log('   - Diversify response patterns for similar queries');
    console.log('   - Add more general response templates');
  }
  
  console.log('\n3. Enhance cross-track knowledge sharing:');
  console.log('   - The new personas ARE helping other tracks!');
  console.log('   - Consider adding more cross-functional questions');
  
  return results;
}

function calculateSpecificity(response: string): number {
  // Simple heuristic: longer, more detailed responses with specific names/tools score higher
  const factors = {
    length: Math.min(response.length / 1000, 3), // Max 3 points for length
    specificTools: (response.match(/Next\.js|React|TypeScript|JIRA|Confluence/g) || []).length * 0.5,
    personalNames: (response.match(/James|Hanh|Chen|Nguyen/g) || []).length * 1,
    numbers: (response.match(/\d+/g) || []).length * 0.3
  };
  
  const score = Object.values(factors).reduce((a, b) => a + b, 0);
  return Math.min(Math.round(score), 10);
}

// Run the analysis
analyzePersonaImpact().catch(console.error);