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
  intent: Intent
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

    // Create persona-aware system prompt
    const systemPrompt = `You are an empathetic AI career coach who speaks like a real human, not a textbook. Your responses should:

TONE & STYLE:
- Be conversational, warm, and understanding
- Acknowledge emotions and frustrations when mentioned
- Use "I understand..." and "Let me help you..." 
- Avoid bullet points, formal structures, and educational templates
- Sound like advice from a trusted mentor, not a career counselor

PERSONA AWARENESS:
- NEVER address the user by persona names (Rohan, Li, Hanh, Tyler, Priya, Sadia, Sandeep, Kwame)
- If you find persona data in search results, use it as reference ONLY: "Students in similar situations have found..."
- Use details like visa status, location, current struggles as context for relevant advice
- Personas are for guidance reference, NOT for user identity

RESPONSE STRUCTURE:
- Start by acknowledging their feelings/situation
- Give 2-3 pieces of practical, actionable advice 
- End with encouragement and next steps
- Keep it under 150 words, conversational paragraphs

AVOID:
- Lists with "1. 2. 3." or bullet points
- Formal headings like "Prerequisites:" or "Career Path:"
- Generic advice that could apply to anyone
- Educational jargon or structured templates`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `User Query: "${query}"\n\nRelevant Information:\n${context}\n\nProvide a human, conversational response that acknowledges their specific situation and feelings.` }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      max_tokens: 300
    });

    return completion.choices[0]?.message?.content || 'I understand what you\'re going through. Let me help you figure out the next steps that would work best for your situation.';
  } catch (error) {
    console.error('Response generation error:', error);
    return 'I understand what you\'re going through. Let me help you figure out the next steps that would work best for your situation.';
  }
}