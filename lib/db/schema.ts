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

// Export persona schemas
export * from '../personas/persona-schemas';