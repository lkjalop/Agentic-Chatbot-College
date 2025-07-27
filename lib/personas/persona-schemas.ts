import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';

// Student Personas - WHO they are
export const studentPersonas = pgTable('student_personas', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Identity
  archetypeName: text('archetype_name').notNull(), // "Rohan Patel"
  archetypeCode: text('archetype_code').notNull(), // "career_switcher_regional"
  
  // Demographics
  nationality: text('nationality'),
  ageRange: text('age_range'), // "25-30"
  location: text('location'),
  isRegional: boolean('is_regional').default(false),
  
  // Background
  previousField: text('previous_field'), // "Mechanical Engineering"
  currentStudy: text('current_study'), // "Master of Business Analytics"
  workExperience: text('work_experience'), // "No ICT experience"
  
  // Status & Constraints
  visaType: text('visa_type'), // "485", "500", "PR", "citizen"
  visaTimeLeft: text('visa_time_left'), // "2.5 years"
  englishLevel: text('english_level'), // "high", "medium", "low"
  techConfidence: text('tech_confidence'), // "none", "basic", "intermediate", "advanced"
  
  // Motivations & Goals
  primaryMotivation: text('primary_motivation'), // "PR pathway"
  careerGoal: text('career_goal'), // "Business Analyst"
  urgencyLevel: text('urgency_level'), // "high", "medium", "low"
  
  // Challenges & Needs
  mainChallenge: text('main_challenge'), // "No local experience"
  emotionalState: text('emotional_state'), // "anxious", "hopeful", "frustrated"
  supportNeeds: jsonb('support_needs').$type<string[]>(), // ["mentoring", "visa guidance"]
  
  // Communication Preferences
  communicationStyle: text('communication_style'), // "direct", "gentle", "detailed"
  culturalBackground: text('cultural_background'),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  archetypeIdx: index('personas_archetype_idx').on(table.archetypeCode),
  nationalityIdx: index('personas_nationality_idx').on(table.nationality)
}));

// Journey-Specific Questions - WHAT they ask at each stage
export const personaJourneyQuestions = pgTable('persona_journey_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  personaId: uuid('persona_id').references(() => studentPersonas.id).notNull(),
  
  // Journey Context
  journeyStage: text('journey_stage', {
    enum: ['awareness', 'research', 'pre_consultation', 'consultation', 
           'decision', 'onboarding', 'bootcamp_start', 'engagement', 
           'delivery', 'post_completion']
  }).notNull(),
  stageOrder: integer('stage_order').notNull(), // 1-10
  
  // Question & Empathetic Answer
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  
  // Response Characteristics
  emotionalTone: text('emotional_tone'), // "reassuring", "encouraging", "practical"
  urgencyLevel: text('urgency_level'), // "immediate", "moderate", "relaxed"
  
  // Context & Keywords
  contextClues: jsonb('context_clues').$type<string[]>(), // ["485", "regional", "anxious"]
  keywords: jsonb('keywords').$type<string[]>(), // ["visa", "bootcamp", "experience"]
  followUpQuestions: jsonb('follow_up_questions').$type<string[]>(),
  
  // Usage Tracking
  usageCount: integer('usage_count').default(0),
  lastUsed: timestamp('last_used'),
  averageHelpfulness: integer('average_helpfulness').default(0), // 1-5 rating
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  personaIdx: index('journey_persona_idx').on(table.personaId),
  stageIdx: index('journey_stage_idx').on(table.journeyStage),
  keywordsIdx: index('journey_keywords_idx').on(table.keywords)
}));

// Response Pattern Library - HOW to communicate with each persona type
export const responsePatterns = pgTable('response_patterns', {
  id: uuid('id').defaultRandom().primaryKey(),
  personaId: uuid('persona_id').references(() => studentPersonas.id).notNull(),
  
  // Pattern Matching
  triggerPhrases: jsonb('trigger_phrases').$type<string[]>(), // ["I'm worried about", "What if"]
  emotionalIndicators: jsonb('emotional_indicators').$type<string[]>(), // ["anxious", "urgent"]
  
  // Response Strategy
  responseApproach: text('response_approach'), // "reassuring", "practical", "detailed"
  toneAdjustment: text('tone_adjustment'), // "warmer", "more_direct", "gentler"
  
  // Content Guidelines
  mustInclude: jsonb('must_include').$type<string[]>(), // ["visa timeline", "regional advantages"]
  mustAvoid: jsonb('must_avoid').$type<string[]>(), // ["complex jargon", "false promises"]
  culturalConsiderations: jsonb('cultural_considerations').$type<string[]>(),
  
  // Usage & Effectiveness
  successRate: integer('success_rate').default(0), // 0-100%
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  personaIdx: index('patterns_persona_idx').on(table.personaId),
  triggerIdx: index('patterns_trigger_idx').on(table.triggerPhrases)
}));

// Enhanced conversation tracking with persona context
export const personaConversations = pgTable('persona_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalConversationId: uuid('original_conversation_id').notNull(), // Links to existing conversations table
  
  // Persona Detection Results
  detectedPersonaId: uuid('detected_persona_id').references(() => studentPersonas.id),
  detectionConfidence: integer('detection_confidence').default(0), // 0-100%
  detectionSignals: jsonb('detection_signals').$type<string[]>(), // What triggered this persona match
  
  // Journey Context
  inferredJourneyStage: text('inferred_journey_stage'),
  stageConfidence: integer('stage_confidence').default(0),
  
  // Emotional Support Tracking
  emotionalNeedsDetected: jsonb('emotional_needs_detected').$type<string[]>(),
  supportProvidedType: text('support_provided_type'), // "reassurance", "practical", "referral"
  
  // Outcome Tracking
  queryResolved: boolean('query_resolved').default(false),
  followUpNeeded: boolean('follow_up_needed').default(false),
  satisfactionScore: integer('satisfaction_score'), // 1-5 if provided
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  conversationIdx: index('persona_conv_conversation_idx').on(table.originalConversationId),
  personaIdx: index('persona_conv_persona_idx').on(table.detectedPersonaId),
  stageIdx: index('persona_conv_stage_idx').on(table.inferredJourneyStage)
}));

// Type exports for TypeScript
export type StudentPersona = typeof studentPersonas.$inferSelect;
export type NewStudentPersona = typeof studentPersonas.$inferInsert;
export type PersonaJourneyQuestion = typeof personaJourneyQuestions.$inferSelect;
export type NewPersonaJourneyQuestion = typeof personaJourneyQuestions.$inferInsert;
export type ResponsePattern = typeof responsePatterns.$inferSelect;
export type NewResponsePattern = typeof responsePatterns.$inferInsert;
export type PersonaConversation = typeof personaConversations.$inferSelect;
export type NewPersonaConversation = typeof personaConversations.$inferInsert;