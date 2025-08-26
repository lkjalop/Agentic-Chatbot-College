import Groq from 'groq-sdk';
import { z } from 'zod';

// Initialize Groq client with fallback for build time
const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    // Allow build to proceed without API key during static generation
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      console.warn('GROQ_API_KEY not defined, using mock client for build');
      return null;
    }
    throw new Error('GROQ_API_KEY is not defined');
  }
  
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
};

const groq = getGroqClient();

export const IntentSchema = z.object({
  type: z.enum([
    'definition',
    'comparison',
    'prerequisite',
    'career_path',
    'next_steps',
    'relationship',
    'tutorial',
    'recommendation',
    'clarification'
  ]),
  confidence: z.number().min(0).max(1),
  entities: z.array(z.string()),
  searchStrategy: z.enum(['semantic', 'relationship', 'hybrid', 'career']),
  clarificationNeeded: z.boolean(),
  suggestedQueries: z.array(z.string()).optional()
});

export type Intent = z.infer<typeof IntentSchema>;

export async function analyzeIntent(query: string): Promise<Intent> {
  try {
    // Return fallback if groq client is not available (build time)
    if (!groq) {
      return {
        type: 'definition',
        confidence: 0.5,
        entities: query.split(' ').filter(w => w.length > 3),
        searchStrategy: 'semantic',
        clarificationNeeded: false
      };
    }

    const systemPrompt = `You are an intent analyzer for an educational RAG system. Analyze the user's query and return a JSON object with:
- type: the intent type (definition, comparison, prerequisite, career_path, next_steps, relationship, tutorial, recommendation, clarification)
- confidence: confidence score 0-1
- entities: key concepts/topics mentioned
- searchStrategy: best search approach (semantic, relationship, hybrid, career)
- clarificationNeeded: if the query is unclear
- suggestedQueries: alternative queries if clarification needed

Examples:
"What is React?" -> type: "definition", entities: ["react"], searchStrategy: "semantic"
"What do I need to know before learning machine learning?" -> type: "prerequisite", entities: ["machine-learning"], searchStrategy: "relationship"
"How to become a data scientist?" -> type: "career_path", entities: ["data-scientist"], searchStrategy: "career"`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('No response from Groq');

    const parsed = JSON.parse(response);
    return IntentSchema.parse(parsed);
  } catch (error) {
    console.error('Intent analysis error:', error);
    return {
      type: 'definition',
      confidence: 0.5,
      entities: query.split(' ').filter(w => w.length > 3),
      searchStrategy: 'semantic',
      clarificationNeeded: false
    };
  }
}

export async function enhanceQuery(query: string, intent: Intent): Promise<string> {
  try {
    // Return original query if groq client is not available
    if (!groq) {
      return query;
    }

    const prompts: Record<string, string> = {
      prerequisite: `List the fundamental prerequisites needed before learning: ${query}`,
      career_path: `Career progression path and skills required for: ${query}`,
      next_steps: `Advanced topics and next learning steps after: ${query}`,
      relationship: `Explain the relationship and connections between: ${query}`,
      comparison: `Compare and contrast the key differences in: ${query}`
    };

    const enhancedPrompt = prompts[intent.type] || query;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a query enhancer. Expand the user query to capture better search results. Keep it concise (under 50 words) and focused on key concepts.'
        },
        { role: 'user', content: enhancedPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 100
    });

    return completion.choices[0]?.message?.content || query;
  } catch (error) {
    console.error('Query enhancement error:', error);
    return query;
  }
}

export async function generateResponse(
  query: string,
  searchResults: any[],
  intent: Intent,
  conversationHistory: any[] = []
): Promise<string> {
  try {
    // Return fallback response if groq client is not available
    if (!groq) {
      return 'I found relevant information in the search results. Please review them for details.';
    }

    // Extract persona information from search results
    const personaData = searchResults.find(r => 
      r.content.includes('Persona:') || r.metadata?.contentType === 'career'
    );

    const context = searchResults.map(r => r.content).join('\n\n---\n\n');
    
    // Build conversation context (last 3 messages only)
    const recentHistory = conversationHistory.slice(-3).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    // Create natural conversation system prompt
    const systemPrompt = `You are a helpful AI assistant for a tech bootcamp. Use natural conversation flow:

RESPONSE STYLE - Natural & Engaging:
- Mix sentence lengths: Short punchy sentences (5-10 words). Medium explanations (15-20 words). Longer context when needed (up to 30 words).
- Match conversation tone: Professional for career questions, casual for general chat
- Start with key info, add helpful details, end with engagement
- Maximum 4 lines total per response

CONVERSATION RULES:
1. NEVER assume user background, emotions, visa status, or personal details
2. ONLY reference what the user explicitly told you in THIS conversation
3. Remember previous messages in our current chat
4. If unsure, ask clarifying questions

PROGRAMS (mention when relevant):
- 4 career tracks: Data & AI, Cybersecurity, Business Analyst, Full Stack  
- Pricing: $740 AUD bootcamp (only if asked about cost)
- Don't repeat program info unless specifically requested

JOB EXPECTATIONS & DISCLAIMERS (for placement questions):
- "We help build skills and portfolio, but can't guarantee job placement"
- "Our program provides Australian work experience to strengthen applications"
- "Individual results vary based on effort, market conditions, and background"
- Suggest booking consultation for personalized career guidance

ENGAGEMENT TACTICS:
- Ask follow-up questions to understand their goals
- Suggest next steps or booking consultation
- Be genuinely helpful, not pushy

HANDLE EDGE CASES:
- Irrelevant topics: "We focus on tech bootcamps. Which of our 4 tracks interests you?"
- PII/Credit cards: "Security alert: Never share payment details in chat. Contact our admin team."
- Unclear input: "Could you clarify what you're looking for?"
- Mental health: "Please contact Lifeline 13 11 14 or our counselors for support."
- GDPR requests: "For data deletion requests, contact our privacy team. I'll connect you with them."

Be conversational but focused. Quality over quantity.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Conversation History:\n${recentHistory}\n\nCurrent Query: "${query}"\n\nRelevant Info: ${context.substring(0, 300)}\n\nProvide a natural, conversational response. Maximum 4 lines.` }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4,
      max_tokens: 120
    });

    const response = completion.choices[0]?.message?.content;
    console.log(`🤖 Groq raw response length: ${response?.length || 0}`);
    console.log(`🤖 Groq response preview: "${response?.substring(0, 100) || 'null'}"`);
    
    if (!response || response.trim().length < 10) {
      console.log('❌ Groq response too short or empty, throwing error to trigger fallback');
      throw new Error('Empty or too short response from Groq API');
    }
    
    // Check for generic fallback responses that shouldn't be used
    if (response.includes('I understand what you\'re going through') ||
        response.includes('Let me help you figure out the next steps') ||
        response.length < 50) {
      console.log('❌ Groq returned generic/short response, throwing error to trigger proper fallback');
      throw new Error('Groq returned generic fallback instead of proper response');
    }
    
    return response;
  } catch (error) {
    console.error('Response generation error:', error);
    throw error; // Re-throw error to trigger proper fallback system
  }
}