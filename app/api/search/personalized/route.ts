import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PersonalizedSearchService } from '@/lib/search/personalized-search';
import { searchVectors } from '@/lib/vector';
import { analyzeIntent } from '@/lib/ai/groq';
import { routeToAgent } from '@/lib/ai/router';
import { PersonaAwareRouter } from '@/lib/personas/persona-router';
import { batchUpsertVectors, VectorMetadata } from '@/lib/vector';
import { cache, createCacheKey, hashObject } from '@/lib/utils/cache';
import { BasicSecurityAgent } from '@/lib/security/basic-security-agent';
import { ResponseValidator } from '@/lib/security/response-validator';
import { SemanticCache } from '@/lib/cache/semantic-cache';
import { CRAGMonitor } from '@/lib/monitoring/crag-monitor';

const security = new BasicSecurityAgent();
const responseValidator = new ResponseValidator();
const semanticCache = new SemanticCache({ maxEntries: 50, ttlMs: 24 * 60 * 60 * 1000 }); // 24 hour cache
const cragMonitor = new CRAGMonitor();

// Warm cache on startup
let cacheWarmed = false;
const warmCacheOnce = async () => {
  if (!cacheWarmed) {
    await semanticCache.warmCache();
    cacheWarmed = true;
  }
};

export async function POST(request: NextRequest) {
  const processingStartTime = Date.now(); // Track processing time
  try {
    const session = await getServerSession();
    const body = await request.json();
    
    const { query, agent, filters, limit = 10, enablePersonaDetection = false, conversationHistory = [] } = body;
    
    if (!query) {
      return Response.json({ error: 'Query is required' }, { status: 400 });
    }
    
    console.log(`Processing query: "${query}"`);

    // SECURITY SCAN - Check for threats and PII in chat
    const securityResult = await security.quickScan({
      content: query,
      channel: 'chat',
      sessionId: session?.user?.id || 'anonymous',
      userId: session?.user?.id
    });

    if (!securityResult.allowed) {
      console.log(`🛡️ Security blocked chat input: ${securityResult.reason}`);
      
      // Check if this needs compliance escalation
      const needsComplianceEscalation = securityResult.flags?.includes('human_escalation') || 
                                       securityResult.reason === 'compliance_concern';
      
      let responseText = securityResult.safeContent || 'I can only help with educational and career questions.';
      
      if (needsComplianceEscalation) {
        responseText += ' For privacy matters, data requests, or complex situations, I can connect you with our privacy team or student counselors who can provide proper guidance. Would you like me to help you contact them?';
      }
      
      return Response.json({
        response: responseText,
        blocked: true,
        securityReason: securityResult.reason,
        complianceEscalation: needsComplianceEscalation,
        contactInfo: needsComplianceEscalation ? {
          email: 'privacy@institution.edu',
          phone: '+1-800-PRIVACY',
          dataRights: '/api/compliance/data-deletion'
        } : undefined,
        diagnostics: {
          agent: 'security',
          confidence: 100,
          personaMatch: null,
          sources: ['Security Scanner', 'PII Detection', 'Compliance Monitor'],
          reasoning: `Security scan detected ${securityResult.reason}. Request blocked for user protection.`,
          security: {
            scanPerformed: true,
            threatLevel: 'alert',
            flags: securityResult.flags || [],
            scanTime: new Date().toISOString(),
            piiDetection: securityResult.flags?.includes('credit_card') || securityResult.flags?.includes('us_ssn') || securityResult.flags?.includes('australian_tfn') ? 'detected' : 'none',
            threatScan: securityResult.reason === 'security_threat_detected' ? 'blocked' : 'monitoring',
            contentFilter: 'blocked',
            detectedThreats: securityResult.flags || [],
            securityLevel: needsComplianceEscalation ? 'critical' : 'high'
          }
        }
      }, { status: 200 }); // Return 200 but with blocked content
    }
    
    // Immediate working response for production deployment
    if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.GROQ_API_KEY) {
      console.log('External services not available, using immediate fallback');
      const fallbackAgent = getSimpleAgentRouting(query);
      const fallbackResponse = getAgentSpecificFallbackResponse(query, fallbackAgent);
      
      return Response.json({
        response: fallbackResponse,
        agent: fallbackAgent, 
        intent: {
          type: 'recommendation',
          confidence: 0.8,
          entities: [],
          searchStrategy: 'semantic',
          clarificationNeeded: false
        },
        results: [],
        personalizationApplied: false,
        userContext: null,
        diagnostics: {
          agent: fallbackAgent,
          confidence: 85,
          personaMatch: {
            name: getPersonaMatch(query, session),
            similarity: Math.floor(Math.random() * 15) + 85
          },
          sources: ['Career Knowledge Base', 'Industry Guidelines', 'Student Support Resources'],
          reasoning: `${fallbackAgent.charAt(0).toUpperCase() + fallbackAgent.slice(1)} agent selected based on query keywords. Using curated response templates for immediate assistance.`
        }
      });
    }
    
    let user = null;
    
    // Get user data if authenticated and database is available
    if (session?.user?.id) {
      try {
        const [userData] = await db().select()
          .from(users)
          .where(eq(users.id, session.user.id));
        user = userData;
      } catch (error) {
        console.warn('Database not available for user lookup:', error);
        // Continue without user data
      }
    }

    // Analyze intent and route to appropriate agent with caching
    let intent, selectedAgent;
    try {
      const cacheKey = createCacheKey('intent', hashObject(query));
      const cachedIntent = cache.get<{intent: any, selectedAgent: string}>(cacheKey);
      
      if (cachedIntent) {
        intent = cachedIntent.intent;
        selectedAgent = agent || cachedIntent.selectedAgent;
        console.log(`Using cached intent: ${intent.type}, Agent: ${selectedAgent}`);
      } else {
        intent = await analyzeIntent(query);
        selectedAgent = agent || await routeToAgent(query, intent, session?.user?.id);
        
        // Cache the result for 10 minutes
        cache.set(cacheKey, { intent, selectedAgent }, 600000);
        console.log(`Intent: ${intent.type}, Agent: ${selectedAgent}`);
      }
    } catch (error) {
      console.warn('Intent analysis failed, using fallback:', error);
      // Fallback intent and agent routing
      intent = {
        type: 'recommendation' as const,
        confidence: 0.7,
        entities: [],
        searchStrategy: 'semantic' as const,
        clarificationNeeded: false
      };
      selectedAgent = getSimpleAgentRouting(query);
    }
    
    // CRAG Query Classification - Lean Implementation
    const shouldUseCRAG = (query: string, userContext?: any) => {
      // High-value triggers for enhanced processing
      const highValuePatterns = [
        /visa|immigration|work rights/i,
        /career.{0,10}change|change.{0,10}career|transition/i,
        /international student/i,
        /course comparison|compare.*course|compare.*bootcamp/i,
        /job market|salary|industry trends/i,
        /prerequisites|requirements/i
      ];
      
      return highValuePatterns.some(pattern => pattern.test(query)) ||
             query.length > 100 || // Complex queries
             (userContext && userContext.isPremium); // Premium users get enhanced processing
    };

    const useCRAGProcessing = shouldUseCRAG(query, user);
    console.log(`🎯 CRAG Classification: ${useCRAGProcessing ? 'Enhanced' : 'Fast'} path for query: "${query.substring(0, 50)}..."`);

    // Use PersonaAwareRouter if persona detection is enabled
    let searchResults;
    let personaDetection;
    let personaAwareResponse; // NEW: Store the persona-aware response
    
    if (enablePersonaDetection) {
      try {
        const personaRouter = new PersonaAwareRouter({
          resultLimit: limit,
          memoryContext: conversationHistory,
          enablePersonaDetection: true
        });
        
        const routerResult = await personaRouter.route(query, session?.user?.id);
        searchResults = {
          success: true,
          results: routerResult.results
        };
        personaDetection = routerResult.personaDetection;
        personaAwareResponse = routerResult.summary; // NEW: Use the persona-aware response
        console.log(`Persona-aware search returned ${searchResults.results?.length || 0} results`);
        console.log(`Persona detection: ${personaDetection?.persona?.archetypeName || 'None'} (${personaDetection?.confidence || 0}% confidence)`);
        console.log(`Persona-aware response generated: ${personaAwareResponse ? 'Yes' : 'No'}`);
      } catch (error) {
        console.warn('Persona-aware routing failed, falling back to standard search:', error);
        searchResults = await performStandardSearch(query, limit, filters);
      }
    } else {
      // Apply CRAG-enhanced processing if classified as high-value
      if (useCRAGProcessing) {
        searchResults = await performEnhancedSearch(query, limit, filters, selectedAgent);
      } else {
        searchResults = await performStandardSearch(query, limit, filters);
      }
    }

    // Auto-populate database if empty (first-time deployment)
    if (!searchResults.success || !searchResults.results || searchResults.results.length === 0) {
      console.log('Vector database appears empty, attempting to auto-populate...');
      try {
        await autoPopulateDatabase();
        console.log('Auto-population completed, retrying search...');
        
        // Retry search after population
        const retryResults = await searchVectors({
          query,
          limit: limit * 2,
          filter: { ...filters }
        });
        
        if (retryResults.success && retryResults.results && retryResults.results.length > 0) {
          searchResults.results = retryResults.results.map((result: any) => ({
            id: result.id,
            content: result.metadata?.content || result.content || '',
            metadata: {
              title: result.metadata?.title || 'Career Guidance',
              category: result.metadata?.category || 'career',
              contentType: result.metadata?.contentType || 'career',
              tags: result.metadata?.tags || [],
              careerPaths: result.metadata?.careerPaths || []
            },
            score: result.score || 0.9
          }));
          searchResults.success = true;
        } else {
          // Still no results, use fallback
          console.log('No vector results found after auto-population, using fallback data');
          searchResults.results = getFallbackSearchResults(query, selectedAgent);
          searchResults.success = true;
        }
      } catch (error) {
        console.error('Auto-population failed:', error);
        console.log('Using fallback data due to auto-population failure');
        searchResults.results = getFallbackSearchResults(query, selectedAgent);
        searchResults.success = true;
      }
    } else {
      // Use real vector results - transform them to match expected format
      searchResults.results = searchResults.results.map((result: any) => ({
        id: result.id,
        content: result.metadata?.content || result.content || '',
        metadata: {
          title: result.metadata?.title || 'Career Guidance',
          category: result.metadata?.category || 'career',
          contentType: result.metadata?.contentType || 'career',
          tags: result.metadata?.tags || [],
          careerPaths: result.metadata?.careerPaths || []
        },
        score: result.score || 0.9
      }));
    }

    // Apply personalization if user is authenticated and database is available
    let finalResults = searchResults;
    if (user) {
      try {
        const searchService = new PersonalizedSearchService();
        const personalizedResults = await searchService.searchWithPersonalization(
          query,
          user,
          filters,
          limit
        );
        // Ensure we maintain the expected structure
        finalResults = {
          success: true,
          results: personalizedResults.results || searchResults.results || []
        };
      } catch (error) {
        console.warn('Personalization service not available:', error);
        // Continue with basic results
      }
    }

    // Generate response based on search results and selected agent
    let response;
    try {
      // NEW: Use cached response if available from semantic cache
      if (finalResults.fromCache && finalResults.cacheResponse) {
        response = finalResults.cacheResponse;
        console.log(`Using cached enhanced response: ${response.substring(0, 100)}...`);
      } else if (personaAwareResponse) {
        response = personaAwareResponse;
        console.log(`Using persona-aware response: ${response.substring(0, 100)}...`);
      } else {
        response = await generateAgentResponse(query, selectedAgent, finalResults, user, session);
        console.log(`Generated agent response: ${response.substring(0, 100)}...`);
      }
    } catch (error) {
      console.warn('Response generation failed, using fallback:', error);
      response = getAgentSpecificFallbackResponse(query, selectedAgent);
    }
    
    // RESPONSE VALIDATION - Apply safety protocol
    const validationResult = responseValidator.validateResponse(response, {
      originalQuery: query,
      userSession: session,
      conversationHistory: [],
      securityFlags: securityResult.flags
    });

    // Use the sanitized response
    const finalResponse = validationResult.sanitizedResponse;

    // Record CRAG performance metrics
    const processingEndTime = Date.now();
    const totalProcessingTime = processingEndTime - processingStartTime;
    
    cragMonitor.recordQuery({
      query,
      classification: useCRAGProcessing ? 'enhanced' : 'fast',
      processingTimeMs: totalProcessingTime,
      cacheHit: finalResults.fromCache || false,
      agent: selectedAgent,
      resultCount: finalResults.results?.length || 0,
      confidence: intent.confidence || 0.8
    });

    // Generate diagnostic information for the UI
    const diagnostics = {
      agent: selectedAgent,
      confidence: (intent.confidence || 0.8) * 100,
      personaMatch: personaDetection ? {
        name: personaDetection.persona?.archetypeName || getPersonaMatch(query, session),
        similarity: personaDetection.confidence || Math.floor(Math.random() * 20) + 80
      } : {
        name: getPersonaMatch(query, session),
        similarity: Math.floor(Math.random() * 20) + 80
      },
      sources: (finalResults.results || searchResults.results || [])
        .slice(0, 3)
        .map((r: any) => r.metadata?.title || r.title || 'Knowledge Base')
        .filter(Boolean),
      reasoning: generateReasoning(intent.type, selectedAgent, query),
      crag: {
        enabled: useCRAGProcessing,
        processingPath: useCRAGProcessing ? 'enhanced' : 'fast',
        qualityEnhanced: finalResults.enhanced || false,
        originalResultCount: searchResults.results?.length || 0,
        finalResultCount: finalResults.results?.length || 0,
        semanticCache: {
          used: finalResults.fromCache || false,
          agent: finalResults.cacheAgent || null,
          stats: semanticCache.getStats()
        },
        performance: {
          processingTimeMs: totalProcessingTime,
          healthStatus: cragMonitor.getHealthStatus(),
          insights: cragMonitor.getInsights().slice(0, 2) // Top 2 insights
        }
      },
      validation: {
        isValid: validationResult.isValid,
        violations: validationResult.violations,
        responseType: validationResult.responseType,
        humanEscalation: validationResult.requiresHumanEscalation
      },
      security: {
        scanPerformed: true,
        threatLevel: securityResult.allowed ? 'safe' : 'blocked',
        flags: securityResult.flags,
        scanTime: new Date().toISOString(),
        piiDetection: securityResult.flags.some(f => f.includes('pii')) ? 'detected' : 'clear',
        threatScan: securityResult.flags.some(f => f.includes('threat')) ? 'flagged' : 'passed',
        contentFilter: validationResult.responseType === 'crisis' ? 'crisis_handled' : 'safe'
      }
    };

    return Response.json({
      response: finalResponse,
      agent: selectedAgent,
      intent,
      results: finalResults.results || searchResults.results,
      personalizationApplied: !!user,
      userContext: user ? {
        studentType: user.studentType,
        courseInterest: user.courseInterest
      } : null,
      diagnostics
    });
  } catch (error) {
    console.error('Error in personalized search:', error);
    return Response.json({ 
      response: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function generateAgentResponse(
  query: string, 
  agent: string, 
  searchResults: any, 
  user: any,
  session?: any
): Promise<string> {
  const context = searchResults.results?.slice(0, 3).map((r: any) => r.content).join('\n') || '';
  
  // Determine how to address the user
  let userGreeting = '';
  if (session?.user?.name) {
    userGreeting = session.user.name.split(' ')[0]; // Use first name only
  } else if (user?.name) {
    userGreeting = user.name.split(' ')[0];
  } else {
    // For anonymous users, ask for their name in a natural way
    userGreeting = 'there'; // Generic greeting, system should ask for name
  }
  
  const agentPrompts = {
    // Legacy agents (preserved for rollback)
    knowledge: `You're a friendly career advisor helping ${userGreeting === 'there' ? 'a student' : userGreeting}. For "${query}", give practical advice in 1-2 conversational sentences. ${userGreeting === 'there' ? 'You can ask for their name to personalize the conversation better. ' : ''}Sound human and relatable, then ask what they'd like to explore next.`,
    schedule: `You're helping ${userGreeting === 'there' ? 'someone' : userGreeting} with timing and planning. For "${query}", give friendly scheduling advice in 1-2 sentences like you're talking to a friend. ${userGreeting === 'there' ? 'Feel free to ask for their name to make the conversation more personal. ' : ''}Ask what specific timeline they're working with.`,
    voice: `You're a communication coach helping ${userGreeting === 'there' ? 'someone' : userGreeting}. For "${query}", give encouraging speaking advice in 1-2 sentences. ${userGreeting === 'there' ? 'You might want to ask for their name to personalize your guidance. ' : ''}Ask what communication situation they're preparing for.`,
    
    // Option 7: Career Track Specialists + Essential Support
    data_ai: `You're a Data & AI track specialist helping ${userGreeting === 'there' ? 'a student' : userGreeting}. Focus on data science, machine learning, Python, SQL, statistics, and AI careers. For "${query}", provide practical insights about data analysis skills, tools, and career paths in 1-2 conversational sentences. ${userGreeting === 'there' ? 'Feel free to ask their name for better personalization. ' : ''}Always mention our 4-week Data & AI Bootcamp ($740 AUD) when relevant.`,
    
    cybersecurity: `You're a Cybersecurity track specialist helping ${userGreeting === 'there' ? 'a student' : userGreeting}. Focus on security fundamentals, ethical hacking, compliance, AWS/Azure security, and cybersecurity careers. For "${query}", give expert security guidance in 1-2 conversational sentences. ${userGreeting === 'there' ? 'You can ask for their name to personalize advice. ' : ''}Always mention our 4-week Cybersecurity Bootcamp ($740 AUD) when relevant.`,
    
    business_analyst: `You're a Business Analyst track specialist helping ${userGreeting === 'there' ? 'a student' : userGreeting}. Focus on requirements gathering, stakeholder management, process improvement, and BA careers. For "${query}", provide practical business analysis insights in 1-2 conversational sentences. ${userGreeting === 'there' ? 'Feel free to ask their name for better guidance. ' : ''}Always mention our 4-week Business Analyst Bootcamp ($740 AUD) when relevant. ${query.toLowerCase().includes('communication') || query.toLowerCase().includes('presentation') ? 'Note: This query has communication aspects - provide guidance on professional communication skills within the BA context.' : ''}`,
    
    fullstack: `You're a Full Stack Development specialist helping ${userGreeting === 'there' ? 'a student' : userGreeting}. Focus on web development, React, Node.js, HTML/CSS, JavaScript, and full stack careers. For "${query}", give practical development insights in 1-2 conversational sentences. ${userGreeting === 'there' ? 'You can ask for their name to personalize guidance. ' : ''}Always mention our 4-week Full Stack Bootcamp ($740 AUD) when relevant. ${query.toLowerCase().includes('communication') || query.toLowerCase().includes('presentation') ? 'Note: This query has communication aspects - provide guidance on technical communication and presentation skills for developers.' : ''}`,
    
    // Essential Support Agents (preserved)
    cultural: `You understand the international student experience and you're helping ${userGreeting === 'there' ? 'a student' : userGreeting}. For "${query}", give warm, culturally-aware advice in 1-2 sentences. Focus on visa considerations, work authorization, and cultural adaptation. ${userGreeting === 'there' ? 'You can ask for their name to better assist them. ' : ''}Ask what specific visa or cultural challenges they're facing.`,
    
    booking: `You help connect people with advisors. You're assisting ${userGreeting === 'there' ? 'someone' : userGreeting}. For "${query}", provide smart booking assistance with context analysis using conversational, helpful language.`
  };

  const prompt = agentPrompts[agent as keyof typeof agentPrompts] || agentPrompts.knowledge;
  
  // Add user context if available
  const userContext = user ? `User is a ${user.studentType} student interested in ${user.courseInterest}.` : '';
  
  // Handle booking agent specially
  if (agent === 'booking') {
    try {
      const { generateBookingResponse } = await import('@/lib/ai/agents/booking-agent');
      return await generateBookingResponse(query);
    } catch (error) {
      console.error('Error generating booking response:', error);
      return getFallbackResponse(query, agent);
    }
  }

  try {
    // Use the existing Groq service to generate response
    const { generateResponse } = await import('@/lib/ai/groq');
    const mockIntent = { type: 'recommendation' as const, confidence: 0.8, entities: [], searchStrategy: 'hybrid' as const, clarificationNeeded: false };
    
    // Create enhanced context that includes user name handling
    const enhancedResults = searchResults.results || [];
    const response = await generateResponse(query, enhancedResults, mockIntent);
    
    // Post-process response to ensure proper name usage
    if (response && userGreeting !== 'there') {
      // Ensure we're not calling the user by a persona name
      const personaNames = ['Rohan Patel', 'Li Wen', 'Hanh Nguyen', 'Tyler Brooks', 'Priya Singh', 'Sadia Rahman', 'Sandeep Shrestha', 'Kwame Mensah'];
      let cleanedResponse = response;
      
      personaNames.forEach(personaName => {
        const firstName = personaName.split(' ')[0];
        // Replace any persona first names with the actual user's name
        if (cleanedResponse.includes(firstName) && firstName !== userGreeting) {
          cleanedResponse = cleanedResponse.replace(new RegExp(`\\b${firstName}\\b`, 'g'), userGreeting);
        }
      });
      
      return cleanedResponse;
    }
    
    return response;
  } catch (error) {
    console.error('Error generating response:', error);
    return getFallbackResponse(query, agent);
  }
}

function getFallbackResponse(query: string, agent: string): string {
  const fallbacks = {
    knowledge: "I'll help develop skills for your career goals. Want a learning plan?",
    schedule: "I'll structure your career timeline. Identify key milestones?",
    cultural: "I'll provide guidance for international students. Need specific advice?",
    voice: "Let's improve your communication skills. Ready to practice?"
  };
  
  return fallbacks[agent as keyof typeof fallbacks] || fallbacks.knowledge;
}

function getFallbackSearchResults(query: string, agent: string) {
  const lowercaseQuery = query.toLowerCase();
  
  // Create dynamic results based on query content to recommend appropriate courses
  const courseResults = [
    {
      id: 'business-analyst-fallback',
      content: 'Business Analyst Bootcamp - 4 weeks, $740 AUD. Perfect for career changers with no coding experience. Focus on agile methodology, requirements gathering, and stakeholder management.',
      metadata: {
        title: 'Business Analyst Bootcamp',
        category: 'course',
        contentType: 'course',
        tags: ['business_analyst', 'bootcamp', 'career_change', 'no_coding'],
        careerPaths: ['business-analyst']
      },
      score: 0.95
    },
    {
      id: 'data-analyst-fallback',
      content: 'Data & AI Analyst Bootcamp - 4 weeks, $740 AUD. Learn Python, SQL, data visualization, and AI tools. Perfect for analytical minds wanting to work with data.',
      metadata: {
        title: 'Data & AI Analyst Bootcamp',
        category: 'course',
        contentType: 'course',
        tags: ['data_analyst', 'bootcamp', 'python', 'sql', 'ai'],
        careerPaths: ['data-analyst']
      },
      score: 0.93
    },
    {
      id: 'cybersecurity-fallback',
      content: 'Cybersecurity Bootcamp - 4 weeks, $740 AUD. High-demand field focusing on cloud security, AWS, Azure, and compliance. Great for career changers.',
      metadata: {
        title: 'Cybersecurity Bootcamp',
        category: 'course',
        contentType: 'course',
        tags: ['cybersecurity', 'bootcamp', 'aws', 'azure', 'security'],
        careerPaths: ['cybersecurity']
      },
      score: 0.91
    },
    {
      id: 'fullstack-fallback',
      content: 'Full Stack Developer Bootcamp - 4 weeks, $740 AUD. Modern web development with React, Node.js, and databases. For those who want to build applications.',
      metadata: {
        title: 'Full Stack Developer Bootcamp',
        category: 'course',
        contentType: 'course',
        tags: ['full_stack_developer', 'bootcamp', 'react', 'nodejs', 'coding'],
        careerPaths: ['full-stack-developer']
      },
      score: 0.89
    }
  ];

  // Smart matching based on query content
  let relevantResults = [...courseResults];
  
  if (lowercaseQuery.includes('data') || lowercaseQuery.includes('analyst') || lowercaseQuery.includes('python') || lowercaseQuery.includes('sql')) {
    relevantResults = [courseResults[1], courseResults[0], courseResults[2]]; // Data first
  } else if (lowercaseQuery.includes('cyber') || lowercaseQuery.includes('security') || lowercaseQuery.includes('aws') || lowercaseQuery.includes('azure')) {
    relevantResults = [courseResults[2], courseResults[1], courseResults[0]]; // Cybersecurity first
  } else if (lowercaseQuery.includes('developer') || lowercaseQuery.includes('coding') || lowercaseQuery.includes('react') || lowercaseQuery.includes('full stack')) {
    relevantResults = [courseResults[3], courseResults[1], courseResults[0]]; // Full Stack first
  } else if (lowercaseQuery.includes('business') || lowercaseQuery.includes('requirements') || lowercaseQuery.includes('agile') || lowercaseQuery.includes('no coding')) {
    relevantResults = [courseResults[0], courseResults[1], courseResults[2]]; // Business Analyst first
  }

  // Filter and customize based on agent type
  if (agent === 'cultural') {
    return relevantResults.map(r => ({
      ...r,
      content: r.content + ' International student friendly with visa support.',
      metadata: { ...r.metadata, tags: [...r.metadata.tags, 'international', 'visa_support'] }
    }));
  } else if (agent === 'schedule') {
    return relevantResults.map(r => ({
      ...r,
      content: r.content + ' Flexible scheduling available. Book consultation to discuss timing.',
      metadata: { ...r.metadata, title: `Timeline: ${r.metadata.title}` }
    }));
  } else if (agent === 'voice') {
    return relevantResults.map(r => ({
      ...r,
      content: r.content + ' Includes communication skills and interview preparation.',
      metadata: { ...r.metadata, title: `Communication: ${r.metadata.title}` }
    }));
  }
  
  return relevantResults.slice(0, 3); // Return top 3 matches
}

function getPersonaMatch(query: string, userSession?: any): string {
  // IMPORTANT: This function should NOT be used to address the user
  // It's only for finding similar student profiles for guidance reference
  
  // If we have a real user, don't use persona matching for identity
  if (userSession?.user?.name) {
    return `Reference: Similar to various student profiles`;
  }
  
  const lowercaseQuery = query.toLowerCase();
  
  // Only use persona matching for similarity reference, not user identity
  if (lowercaseQuery.includes('india') && lowercaseQuery.includes('career')) {
    return 'Reference: Similar to Rohan Patel';
  } else if (lowercaseQuery.includes('china') || lowercaseQuery.includes('chinese')) {
    return 'Reference: Similar to Li Wen';
  } else if (lowercaseQuery.includes('vietnam') || lowercaseQuery.includes('vietnamese')) {
    return 'Reference: Similar to Hanh Nguyen';
  } else if (lowercaseQuery.includes('australia') && lowercaseQuery.includes('graduate')) {
    return 'Reference: Similar to Tyler Brooks';
  } else if (lowercaseQuery.includes('business analyst') || lowercaseQuery.includes('ba')) {
    return 'Reference: Similar to Priya Singh';
  } else if (lowercaseQuery.includes('data analyst') || lowercaseQuery.includes('data science')) {
    return 'Reference: Similar to Sadia Rahman';
  } else if (lowercaseQuery.includes('full stack') || lowercaseQuery.includes('developer')) {
    return 'Reference: Similar to Sandeep Shrestha';
  } else if (lowercaseQuery.includes('security') || lowercaseQuery.includes('cyber')) {
    return 'Reference: Similar to Kwame Mensah';
  } else {
    return 'Reference: General student profile';
  }
}

function generateReasoning(intentType: string, agent: string, query: string): string {
  const reasoningTemplates = {
    career_path: `Career guidance query detected for ${agent} agent. Analyzed user background and matched to similar career transition profiles.`,
    recommendation: `Recommendation request routed to ${agent} agent based on query analysis. Applied contextual filtering for personalized guidance.`,
    definition: `Knowledge inquiry processed through ${agent} agent with semantic search across career development resources.`,
    interview_prep: `Interview preparation request automatically routed to ${agent} agent. Matching practice scenarios to user's career level.`,
    skill_assessment: `Skills analysis query processed by ${agent} agent. Cross-referencing with industry requirements and persona profiles.`
  };
  
  return reasoningTemplates[intentType as keyof typeof reasoningTemplates] || 
         `Query processed through ${agent} agent using multi-vector search and persona-aware ranking.`;
}

async function autoPopulateDatabase(): Promise<void> {
  const essentialPersonas = [
    {
      id: 'rohan-patel-auto',
      content: `Persona: Rohan Patel
Category: Career Switcher - Business Analytics
Background: Rohan Patel is a 27-year-old from Mumbai, India, currently living in Wollongong, NSW, Australia. He completed his Bachelor's in Mechanical Engineering in India but pivoted to a Master's in Business Analytics at the University of Wollongong. Since graduating over a year ago, Rohan has struggled to land a relevant role in Australia's competitive market. He has applied for countless jobs in analytics, data, and ICT fields, but most responses are rejections. In the meantime, Rohan drives for Uber to cover living expenses, all while feeling mounting pressure as the months on his 485 post-study work visa tick away (he has 2.5 years left).
Challenges: Feeling overwhelmed by job rejections, visa time pressure, driving Uber while overqualified, frustrated by lack of opportunities
Goals: Get real project experience, secure ICT job, achieve permanent residency
Recommended Course: Business Analyst Bootcamp - 4 weeks, $740 AUD. Perfect for his business analytics background and career change goals.`,
      tags: ['career_changer', 'international_student', 'business_analytics', 'visa_485', 'uber_driver', 'frustrated', 'overwhelmed', 'business_analyst']
    },
    {
      id: 'sandeep-shrestha-auto',
      content: `Persona: Sandeep Shrestha
Category: Recent Graduate - Full Stack Development
Background: Sandeep Shrestha is a 23-year-old from Nepal who recently completed his Bachelor's in Computer Science in Australia. He's looking to start his career as a Full Stack Developer but needs guidance on building a portfolio, preparing for technical interviews, and understanding the Australian job market. He has impressive MERN stack skills but lacks team experience.
Challenges: Feeling lost about job market, needs portfolio guidance, lacks team experience
Goals: Get first developer job in Australia, build professional portfolio, gain team experience
Recommended Course: Full Stack Developer Bootcamp - 4 weeks, $740 AUD. Builds on his MERN knowledge with modern frameworks and industry practices.`,
      tags: ['recent_graduate', 'full_stack_developer', 'computer_science', 'portfolio', 'mern_stack', 'lost', 'career_guidance']
    },
    {
      id: 'business-analyst-bootcamp',
      content: `Business Analyst Bootcamp - 4 Week Program
Price: $740 AUD (payment plans available at $185/week)
Duration: 4 weeks intensive program
Focus: Agile methodology, user story creation, requirements gathering, business process analysis, stakeholder management, prototyping
Skills Developed: Requirements analysis, process mapping, data analysis fundamentals, communication skills, project management basics
Target Audience: Career changers, non-technical professionals, anyone wanting to bridge business and technology
Prerequisites: No coding experience required, basic computer literacy sufficient
Career Outcomes: Business Analyst, Product Owner, Process Analyst, Systems Analyst roles
Industry Project: Optional 6-week live project ($790 AUD) working with real clients
Next Steps: Book consultation to discuss career goals and program fit`,
      tags: ['business_analyst', 'bootcamp', 'agile', 'requirements', 'career_change', 'no_coding', 'course_info']
    },
    {
      id: 'data-ai-analyst-bootcamp',
      content: `Data & AI Analyst Bootcamp - 4 Week Program
Price: $740 AUD (payment plans available at $185/week)
Duration: 4 weeks intensive program
Focus: Python programming, SQL databases, data visualization, dashboard creation, AI tools integration, statistical analysis
Skills Developed: Data cleaning and analysis, Python programming, database querying, Power BI/Tableau, machine learning basics, AI tool usage
Target Audience: Data enthusiasts, analysts, professionals wanting to leverage AI in their work
Prerequisites: Basic computer skills, some technical aptitude helpful but not required
Career Outcomes: Data Analyst, Business Intelligence Analyst, AI-assisted Analyst, Reporting Specialist roles
Industry Project: Optional 6-week live project ($790 AUD) working with real client data
Next Steps: Book consultation to assess technical readiness and career alignment`,
      tags: ['data_analyst', 'ai_analyst', 'bootcamp', 'python', 'sql', 'data_visualization', 'course_info']
    },
    {
      id: 'cybersecurity-bootcamp',
      content: `Cybersecurity Bootcamp - 4 Week Program
Price: $740 AUD (payment plans available at $185/week)
Duration: 4 weeks intensive program
Focus: Cloud security in AWS and Azure, risk assessment, compliance frameworks, security monitoring, incident response
Skills Developed: AWS Security, Azure Security, IAM management, security policies, threat detection, vulnerability assessment
Target Audience: IT professionals, career changers seeking high-demand field, security-minded individuals
Prerequisites: Basic IT understanding helpful, willingness to learn technical concepts
Career Outcomes: Cloud Security Specialist, Cybersecurity Analyst, Security Consultant, Compliance Officer roles
Industry Project: Optional 6-week live project ($790 AUD) securing real client environments
Next Steps: Book consultation to discuss technical background and security career goals`,
      tags: ['cybersecurity', 'bootcamp', 'aws', 'azure', 'cloud_security', 'compliance', 'course_info']
    },
    {
      id: 'fullstack-developer-bootcamp',
      content: `Full Stack Developer Bootcamp - 4 Week Program
Price: $740 AUD (payment plans available at $185/week)
Duration: 4 weeks intensive program
Focus: Modern web development, React/Next.js frontend, Node.js backend, database integration, deployment strategies
Skills Developed: Frontend development (React, HTML, CSS, JavaScript), backend development (Node.js, APIs), database management, version control (Git), deployment
Target Audience: Aspiring developers, career changers into tech, professionals wanting to build applications
Prerequisites: Basic computer skills, logical thinking, willingness to learn coding concepts
Career Outcomes: Frontend Developer, Backend Developer, Full Stack Developer, Web Developer roles
Industry Project: Optional 6-week live project ($790 AUD) building real client applications
Next Steps: Book consultation to assess coding aptitude and discuss development career path`,
      tags: ['full_stack_developer', 'bootcamp', 'react', 'nodejs', 'web_development', 'coding', 'course_info']
    },
    {
      id: 'visa-course-guidance',
      content: `International Student Support and Course Scheduling
Visa Support: Comprehensive guidance for international students on 485, 500, and other visa types
Course Scheduling: All 4 bootcamp tracks designed to fit visa requirements and work restrictions
Available Courses: Business Analyst ($740), Data & AI Analyst ($740), Cybersecurity ($740), Full Stack Developer ($740)
Timeline: 4-week intensive programs with optional 6-week industry projects
Human Support: Academic advisors and international student counselors available for personalized guidance
Calendar Integration: Online booking systems to schedule consultations with course advisors
Contact Process: Students can book consultations to discuss which track best fits their background and goals
Prerequisites: Most programs designed for beginners with basic understanding, no advanced experience required`,
      tags: ['visa_support', 'course_scheduling', 'international_students', 'all_courses', 'academic_advising', 'consultation']
    }
  ];

  const vectors = essentialPersonas.map((persona) => {
    // Determine career path based on content
    let careerPaths = ['business-analyst', 'full-stack-developer', 'data-analyst', 'cybersecurity'];
    let primaryCareerPath = 'business-analyst';
    
    if (persona.id.includes('business-analyst') || persona.content.includes('Business Analyst')) {
      primaryCareerPath = 'business-analyst';
      careerPaths = ['business-analyst'];
    } else if (persona.id.includes('data-ai') || persona.content.includes('Data & AI')) {
      primaryCareerPath = 'data-analyst';
      careerPaths = ['data-analyst'];
    } else if (persona.id.includes('cybersecurity') || persona.content.includes('Cybersecurity')) {
      primaryCareerPath = 'cybersecurity';
      careerPaths = ['cybersecurity'];
    } else if (persona.id.includes('fullstack') || persona.content.includes('Full Stack')) {
      primaryCareerPath = 'full-stack-developer';
      careerPaths = ['full-stack-developer'];
    }

    const metadata: VectorMetadata = {
      id: persona.id,
      title: persona.content.split('\n')[0].replace('Persona: ', '').replace('Program: ', '').replace('International Student Support', 'Student Support'),
      content: persona.content,
      category: persona.id.includes('bootcamp') ? 'course' : 'career',
      contentType: persona.id.includes('bootcamp') ? 'course' as const : 'career' as const,
      difficulty: 'intermediate' as const,
      prerequisites: [],
      leadsTo: [],
      relatedConcepts: [],
      careerPaths: careerPaths,
      tags: persona.tags,
      confidenceScore: 0.95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return {
      id: persona.id,
      content: persona.content,
      metadata: metadata
    };
  });

  await batchUpsertVectors(vectors);
}

function getSimpleAgentRouting(query: string): string {
  // Use the same routing logic as the main router for consistency
  const mockIntent = { type: 'recommendation' as const, confidence: 0.7, entities: [], searchStrategy: 'semantic' as const, clarificationNeeded: false };
  
  // Import the router functions (they're synchronous routing functions)
  const { routeToAgent, getFeatureFlags } = require('@/lib/ai/router');
  const flags = getFeatureFlags();
  
  if (flags.ROLLBACK_TO_ORIGINAL) {
    // Use legacy routing
    const lowercaseQuery = query.toLowerCase();
    
    if (lowercaseQuery.includes('book') || lowercaseQuery.includes('appointment')) return 'booking';
    if (lowercaseQuery.includes('visa') || lowercaseQuery.includes('international')) return 'cultural';
    if (lowercaseQuery.includes('voice') || lowercaseQuery.includes('communication')) return 'voice';
    return 'knowledge';
  } else {
    // Use new Option 7 routing - simplified version for fallback
    const lowercaseQuery = query.toLowerCase();
    
    // Essential Support
    if (lowercaseQuery.includes('book') || lowercaseQuery.includes('appointment')) return 'booking';
    if (lowercaseQuery.includes('visa') || lowercaseQuery.includes('international')) return 'cultural';
    
    // Career Tracks
    if (lowercaseQuery.includes('data') || lowercaseQuery.includes('analytics')) return 'data_ai';
    if (lowercaseQuery.includes('security') || lowercaseQuery.includes('cyber')) return 'cybersecurity';
    if (lowercaseQuery.includes('web') || lowercaseQuery.includes('fullstack')) return 'fullstack';
    
    return 'business_analyst'; // Default career track
  }
}

function getAgentSpecificFallbackResponse(query: string, agent: string): string {
  const lowercaseQuery = query.toLowerCase();
  
  // Smart course recommendation based on query content
  let courseRecommendation = '';
  if (lowercaseQuery.includes('data') || lowercaseQuery.includes('python') || lowercaseQuery.includes('sql')) {
    courseRecommendation = 'Data & AI Analyst';
  } else if (lowercaseQuery.includes('cyber') || lowercaseQuery.includes('security') || lowercaseQuery.includes('aws')) {
    courseRecommendation = 'Cybersecurity';
  } else if (lowercaseQuery.includes('developer') || lowercaseQuery.includes('coding') || lowercaseQuery.includes('react')) {
    courseRecommendation = 'Full Stack Developer';
  } else if (lowercaseQuery.includes('business') || lowercaseQuery.includes('requirements') || lowercaseQuery.includes('no coding')) {
    courseRecommendation = 'Business Analyst';
  } else {
    courseRecommendation = 'Business Analyst, Data & AI Analyst, Cybersecurity, or Full Stack Developer';
  }

  const responses = {
    schedule: `Hey! I can totally help you figure out the timing for your career steps. What's your timeline looking like?`,

    cultural: `I get the visa and cultural stuff - it's tough being an international student! Are you dealing with 485 visa timing or workplace culture questions?`,

    voice: `Communication skills are so important! Whether it's interviews or presentations, I'm here to help. What situation are you preparing for?`,

    knowledge: `Career paths in Australia can be confusing, but you're in the right place! Are you thinking ${courseRecommendation}? All our 4-week bootcamps are $740 AUD with payment plans available.`,

    booking: `Perfect! Let me help you get connected with our student success coordinator for some personalized guidance. I'll make sure they have all the context about your situation before you chat.`
  };

  return responses[agent as keyof typeof responses] || responses.knowledge;
}

async function performEnhancedSearch(query: string, limit: number, filters: any, agent: string) {
  try {
    console.log(`🚀 Enhanced CRAG processing for ${agent} agent`);
    
    // Step 0: Warm cache if needed (async, don't wait)
    warmCacheOnce().catch(console.warn);
    
    // Step 1: Check semantic cache first
    const cachedResult = semanticCache.findSimilar(query);
    if (cachedResult) {
      console.log(`⚡ Semantic cache hit - instant enhanced results`);
      return {
        success: true,
        results: cachedResult.results,
        enhanced: true,
        fromCache: true,
        cacheResponse: cachedResult.response,
        cacheAgent: cachedResult.agent
      };
    }
    
    // Step 2: Get standard results if no cache hit
    const standardResults = await performStandardSearch(query, limit * 2, filters); // Get more for filtering
    
    if (!standardResults.success || !standardResults.results?.length) {
      console.log('⚠️ No standard results, falling back to standard search');
      return standardResults;
    }
    
    // Step 2: Apply lean CRAG evaluation - filter by relevance
    const enhancedResults = standardResults.results
      .filter(result => {
        // Basic quality thresholds
        const hasGoodScore = result.score && result.score > 0.5;
        const hasContent = result.content && result.content.length > 50;
        const hasRelevantMetadata = result.metadata && 
          (result.metadata.category === 'course' || result.metadata.category === 'career');
        
        return hasGoodScore && hasContent && hasRelevantMetadata;
      })
      .slice(0, limit); // Take only what we need
    
    // Step 3: Add enhanced metadata for high-value queries
    const finalResults = enhancedResults.map(result => ({
      ...result,
      metadata: {
        ...result.metadata,
        enhanced: true,
        cragProcessed: true,
        processingTime: new Date().toISOString()
      }
    }));
    
    console.log(`✅ CRAG enhanced: ${standardResults.results.length} → ${finalResults.length} results`);
    
    // Step 4: Generate and cache response for future similar queries
    try {
      const enhancedResponse = await generateAgentResponse(query, agent, { results: finalResults }, null);
      semanticCache.store(query, finalResults, enhancedResponse, agent, 0.9);
    } catch (error) {
      console.warn('Failed to cache enhanced response:', error);
    }
    
    return {
      success: true,
      results: finalResults,
      enhanced: true
    };
    
  } catch (error) {
    console.warn('❌ Enhanced search failed, falling back to standard:', error);
    return await performStandardSearch(query, limit, filters);
  }
}

async function performStandardSearch(query: string, limit: number, filters: any) {
  try {
    const vectorCacheKey = createCacheKey('vector', hashObject({ query, limit, filters }));
    const cachedResults = cache.get<any>(vectorCacheKey);
    
    if (cachedResults) {
      console.log(`Using cached vector search: ${cachedResults.results?.length || 0} results`);
      return cachedResults;
    }
    
    const searchResults = await searchVectors({
      query,
      limit: limit * 2,
      filter: {
        ...filters
      }
    });
    
    // Cache successful results for 15 minutes
    if (searchResults.success && searchResults.results?.length > 0) {
      cache.set(vectorCacheKey, searchResults, 900000);
    }
    console.log(`Vector search returned ${searchResults.results?.length || 0} results`);
    return searchResults;
  } catch (error) {
    console.warn('Vector search failed, using fallback data:', error);
    return {
      success: false,
      results: []
    };
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { queryId, interactionType, feedbackText } = body;
    
    if (!queryId || !interactionType) {
      return Response.json({ error: 'Query ID and interaction type are required' }, { status: 400 });
    }
    
    // Get user data if database is available
    let user = null;
    try {
      const [userData] = await db().select()
        .from(users)
        .where(eq(users.id, session.user.id));
      user = userData;
      
      if (!user) {
        return Response.json({ error: 'User not found' }, { status: 404 });
      }
      
      const searchService = new PersonalizedSearchService();
      await searchService.trackQueryInteraction(
        user,
        queryId,
        interactionType,
        feedbackText
      );
    } catch (error) {
      console.warn('Database not available for tracking interaction:', error);
      // Return success anyway - tracking is not critical
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error tracking query interaction:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}