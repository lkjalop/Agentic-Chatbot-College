import { pgTable, text, timestamp, uuid, jsonb, integer, boolean, index, real } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().default('anonymous'),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<{
    tags?: string[];
    intent?: string;
    satisfaction?: number;
  }>()
}, (table) => ({
  userIdIdx: index('conversations_user_id_idx').on(table.userId),
  createdAtIdx: index('conversations_created_at_idx').on(table.createdAt)
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').$type<{
    intent?: string;
    entities?: string[];
    searchResults?: any[];
    confidence?: number;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  conversationIdIdx: index('messages_conversation_id_idx').on(table.conversationId)
}));

export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').references(() => conversations.id),
  messageId: uuid('message_id').references(() => messages.id),
  userId: text('user_id').notNull().default('anonymous'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  feedbackType: text('feedback_type', { 
    enum: ['helpful', 'not_helpful', 'incorrect', 'incomplete', 'other'] 
  }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('feedback_user_id_idx').on(table.userId),
  ratingIdx: index('feedback_rating_idx').on(table.rating)
}));

export const syntheticDataMeta = pgTable('synthetic_data_meta', {
  id: uuid('id').defaultRandom().primaryKey(),
  vectorId: text('vector_id').notNull().unique(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  contentType: text('content_type').notNull(),
  difficulty: text('difficulty'),
  prerequisites: jsonb('prerequisites').$type<string[]>().default(sql`'[]'::jsonb`),
  leadsTo: jsonb('leads_to').$type<string[]>().default(sql`'[]'::jsonb`),
  relatedConcepts: jsonb('related_concepts').$type<string[]>().default(sql`'[]'::jsonb`),
  careerPaths: jsonb('career_paths').$type<string[]>().default(sql`'[]'::jsonb`),
  tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`),
  confidenceScore: real('confidence_score').default(1.0),
  usageCount: integer('usage_count').default(0),
  lastAccessed: timestamp('last_accessed'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  categoryIdx: index('synthetic_data_category_idx').on(table.category),
  contentTypeIdx: index('synthetic_data_content_type_idx').on(table.contentType),
  vectorIdIdx: index('synthetic_data_vector_id_idx').on(table.vectorId)
}));

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').$type<{
    ip?: string;
    userAgent?: string;
    duration?: number;
    error?: string;
    searchQuery?: string;
    resultCount?: number;
  }>(),
  success: boolean('success').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt)
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
export type SyntheticDataMeta = typeof syntheticDataMeta.$inferSelect;
export type NewSyntheticDataMeta = typeof syntheticDataMeta.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// User management tables
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // OAuth Information
  googleId: text('google_id').unique(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  picture: text('picture'),
  
  // Profile Information
  studentType: text('student_type', { 
    enum: ['local', 'international', 'career_changer', 'unknown'] 
  }).default('unknown'),
  courseInterest: text('course_interest', { 
    enum: ['data_analyst', 'full_stack', 'cybersecurity', 'business_analyst', 'none'] 
  }).default('none'),
  experienceLevel: text('experience_level', { 
    enum: ['beginner', 'intermediate', 'advanced'] 
  }).default('beginner'),
  visaStatus: text('visa_status'),
  
  // Preferences
  preferredLanguage: text('preferred_language').default('en'),
  communicationStyle: text('communication_style', { 
    enum: ['formal', 'casual', 'balanced'] 
  }).default('balanced'),
  notificationPreferences: jsonb('notification_preferences').$type<{
    email?: boolean;
    analytics?: boolean;
    recommendations?: boolean;
  }>().default({}),
  
  // Session & Security
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  loginCount: integer('login_count').default(1),
  
  // Privacy & Consent
  privacyConsent: boolean('privacy_consent').default(false),
  analyticsConsent: boolean('analytics_consent').default(true),
  marketingConsent: boolean('marketing_consent').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  googleIdIdx: index('users_google_id_idx').on(table.googleId),
  studentTypeIdx: index('users_student_type_idx').on(table.studentType)
}));

// User sessions for analytics
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').unique().notNull(),
  
  // Session Context
  userAgent: text('user_agent'),
  ipAddressHash: text('ip_address_hash'), // Hashed for privacy
  referrer: text('referrer'),
  deviceType: text('device_type', { 
    enum: ['mobile', 'tablet', 'desktop', 'unknown'] 
  }).default('unknown'),
  
  // Geographic Info (anonymized)
  country: text('country'),
  timezone: text('timezone'),
  
  // Session Metrics
  durationSeconds: integer('duration_seconds'),
  pageViews: integer('page_views').default(0),
  interactions: integer('interactions').default(0),
  
  // Timestamps
  startedAt: timestamp('started_at').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  endedAt: timestamp('ended_at')
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  sessionTokenIdx: index('user_sessions_token_idx').on(table.sessionToken),
  startedAtIdx: index('user_sessions_started_at_idx').on(table.startedAt)
}));

// Enhanced conversation analytics
export const conversationAnalytics = pgTable('conversation_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').references(() => userSessions.id),
  userId: uuid('user_id').references(() => users.id),
  conversationId: uuid('conversation_id').references(() => conversations.id).notNull(),
  
  // Query Information
  userQuery: text('user_query').notNull(),
  normalizedQuery: text('normalized_query'),
  queryIntent: text('query_intent'),
  confidenceScore: real('confidence_score'),
  
  // Agent Routing
  selectedAgent: text('selected_agent').notNull(),
  routingReason: text('routing_reason'),
  fallbackUsed: boolean('fallback_used').default(false),
  
  // Response Information
  responseText: text('response_text'),
  responseTimeMs: integer('response_time_ms'),
  sourcesCount: integer('sources_count').default(0),
  
  // User Interaction
  userSatisfaction: integer('user_satisfaction'), // 1-5 scale
  feedbackType: text('feedback_type', { 
    enum: ['helpful', 'not_helpful', 'needs_improvement'] 
  }),
  followUpQuestion: text('follow_up_question'),
  
  // Cultural Context
  detectedLanguage: text('detected_language'),
  culturalAdaptationApplied: boolean('cultural_adaptation_applied').default(false),
  formalityLevel: text('formality_level'),
  
  // Business Context
  visaRelated: boolean('visa_related').default(false),
  courseRelated: boolean('course_related').default(false),
  urgentQuery: boolean('urgent_query').default(false),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  sessionIdIdx: index('conv_analytics_session_id_idx').on(table.sessionId),
  userIdIdx: index('conv_analytics_user_id_idx').on(table.userId),
  conversationIdIdx: index('conv_analytics_conversation_id_idx').on(table.conversationId),
  queryIntentIdx: index('conv_analytics_query_intent_idx').on(table.queryIntent)
}));

// Agent performance metrics
export const agentPerformanceMetrics = pgTable('agent_performance_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentName: text('agent_name').notNull(),
  
  // Performance Metrics
  totalQueries: integer('total_queries').default(0),
  successfulQueries: integer('successful_queries').default(0),
  failedQueries: integer('failed_queries').default(0),
  avgResponseTimeMs: real('avg_response_time_ms'),
  avgConfidenceScore: real('avg_confidence_score'),
  
  // User Satisfaction
  totalFeedbackReceived: integer('total_feedback_received').default(0),
  positiveFeedback: integer('positive_feedback').default(0),
  negativeFeedback: integer('negative_feedback').default(0),
  avgSatisfactionScore: real('avg_satisfaction_score'),
  
  // Resource Usage
  avgTokensUsed: integer('avg_tokens_used'),
  avgCostPerQuery: real('avg_cost_per_query'),
  
  // Time Period
  date: timestamp('date').defaultNow().notNull(),
  hour: integer('hour')
}, (table) => ({
  agentNameIdx: index('agent_metrics_agent_name_idx').on(table.agentName),
  dateIdx: index('agent_metrics_date_idx').on(table.date)
}));

// Student queries management
export const studentQueries = pgTable('student_queries', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Content
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category', { 
    enum: ['course_info', 'visa', 'career', 'prerequisites', 'general'] 
  }).notNull(),
  
  // Course Information
  courseType: text('course_type', { 
    enum: ['data_analyst', 'full_stack', 'cybersecurity', 'business_analyst', 'all'] 
  }).notNull(),
  programFormat: text('program_format', { 
    enum: ['4_week', '6_week', '10_week', 'all'] 
  }).notNull(),
  difficultyLevel: text('difficulty_level', { 
    enum: ['beginner', 'intermediate', 'advanced'] 
  }).default('beginner'),
  
  // Target Audience
  studentType: text('student_type', { 
    enum: ['local', 'international', 'career_changer', 'all'] 
  }).notNull(),
  visaRelevant: boolean('visa_relevant').default(false),
  experienceRequired: text('experience_required', { 
    enum: ['none', 'some', 'experienced'] 
  }).default('none'),
  
  // Metadata
  keywords: jsonb('keywords').$type<string[]>().default([]),
  relatedQuestions: jsonb('related_questions').$type<string[]>().default([]),
  priority: integer('priority').default(5), // 1-10 scale
  tags: jsonb('tags').$type<string[]>().default([]),
  
  // User Context
  createdByUserId: uuid('created_by_user_id').references(() => users.id),
  approvedByUserId: uuid('approved_by_user_id').references(() => users.id),
  
  // Content Management
  status: text('status', { 
    enum: ['draft', 'review', 'approved', 'archived'] 
  }).default('approved'),
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  
  // Analytics
  viewCount: integer('view_count').default(0),
  helpfulVotes: integer('helpful_votes').default(0),
  notHelpfulVotes: integer('not_helpful_votes').default(0),
  lastAccessed: timestamp('last_accessed'),
  
  // Content Quality
  confidenceScore: integer('confidence_score').default(5), // 1-10
  freshnessScore: integer('freshness_score').default(10), // How up-to-date
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastReviewed: timestamp('last_reviewed')
}, (table) => ({
  categoryIdx: index('student_queries_category_idx').on(table.category),
  courseTypeIdx: index('student_queries_course_type_idx').on(table.courseType),
  statusIdx: index('student_queries_status_idx').on(table.status),
  publicIdx: index('student_queries_public_idx').on(table.isPublic)
}));

// Query feedback tracking
export const queryFeedback = pgTable('query_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  queryId: uuid('query_id').references(() => studentQueries.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  
  // Feedback
  isHelpful: boolean('is_helpful').notNull(),
  feedbackText: text('feedback_text'),
  suggestedImprovement: text('suggested_improvement'),
  missingInformation: text('missing_information'),
  
  // Context
  userStudentType: text('user_student_type'),
  userCourseInterest: text('user_course_interest'),
  sessionId: text('session_id'),
  
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  queryIdIdx: index('query_feedback_query_id_idx').on(table.queryId),
  userIdIdx: index('query_feedback_user_id_idx').on(table.userId)
}));

// Query recommendations
export const queryRecommendations = pgTable('query_recommendations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  queryId: uuid('query_id').references(() => studentQueries.id).notNull(),
  
  // Recommendation Logic
  recommendationReason: text('recommendation_reason', { 
    enum: ['popular_with_similar_users', 'matches_interests', 'next_step', 'trending_in_area'] 
  }).notNull(),
  confidenceScore: integer('confidence_score').notNull(), // 1-10
  
  // User Interaction
  shownToUser: boolean('shown_to_user').default(false),
  clickedByUser: boolean('clicked_by_user').default(false),
  helpfulRating: integer('helpful_rating'), // 1-5 if user rates it
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  shownAt: timestamp('shown_at'),
  clickedAt: timestamp('clicked_at')
}, (table) => ({
  userIdIdx: index('query_rec_user_id_idx').on(table.userId),
  queryIdIdx: index('query_rec_query_id_idx').on(table.queryId),
  shownIdx: index('query_rec_shown_idx').on(table.shownToUser)
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type ConversationAnalytics = typeof conversationAnalytics.$inferSelect;
export type NewConversationAnalytics = typeof conversationAnalytics.$inferInsert;
export type AgentPerformanceMetrics = typeof agentPerformanceMetrics.$inferSelect;
export type NewAgentPerformanceMetrics = typeof agentPerformanceMetrics.$inferInsert;
export type StudentQuery = typeof studentQueries.$inferSelect;
export type NewStudentQuery = typeof studentQueries.$inferInsert;
export type QueryFeedback = typeof queryFeedback.$inferSelect;
export type NewQueryFeedback = typeof queryFeedback.$inferInsert;
export type QueryRecommendation = typeof queryRecommendations.$inferSelect;
export type NewQueryRecommendation = typeof queryRecommendations.$inferInsert;

// Export persona schemas
export * from '../personas/persona-schemas';