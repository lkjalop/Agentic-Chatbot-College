import { db } from '@/lib/db';
import { 
  userSessions, 
  conversationAnalytics, 
  agentPerformanceMetrics,
  users,
  User
} from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export class AnalyticsService {
  async createSession(
    userId?: string,
    userAgent?: string,
    ipAddress?: string,
    referrer?: string,
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'unknown'
  ) {
    // Hash IP address for privacy
    const ipAddressHash = ipAddress 
      ? crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16)
      : null;
    
    const sessionToken = nanoid(32);
    
    const [session] = await db().insert(userSessions).values({
      userId,
      sessionToken,
      userAgent: userAgent?.substring(0, 500),
      ipAddressHash,
      referrer: referrer?.substring(0, 200),
      deviceType,
      startedAt: new Date(),
      lastActivity: new Date()
    }).returning();
    
    return session;
  }
  
  async trackConversation(
    conversationId: string,
    sessionId: string,
    userId: string | undefined,
    userQuery: string,
    selectedAgent: string,
    responseText: string,
    responseTimeMs: number,
    confidenceScore: number,
    metadata?: {
      queryIntent?: string;
      routingReason?: string;
      fallbackUsed?: boolean;
      sourcesCount?: number;
      visaRelated?: boolean;
      courseRelated?: boolean;
      urgentQuery?: boolean;
      detectedLanguage?: string;
      culturalAdaptationApplied?: boolean;
      formalityLevel?: string;
    }
  ) {
    const [analytics] = await db().insert(conversationAnalytics).values({
      conversationId,
      sessionId,
      userId,
      userQuery,
      normalizedQuery: this.normalizeQuery(userQuery),
      selectedAgent,
      responseText: responseText.substring(0, 1000), // Truncate for storage
      responseTimeMs,
      confidenceScore,
      ...metadata
    }).returning();
    
    // Update agent performance metrics
    await this.updateAgentMetrics(selectedAgent, confidenceScore, responseTimeMs);
    
    return analytics;
  }
  
  async trackUserFeedback(
    conversationAnalyticsId: string,
    satisfaction: number,
    feedbackType: 'helpful' | 'not_helpful' | 'needs_improvement',
    followUpQuestion?: string
  ) {
    await db().update(conversationAnalytics)
      .set({
        userSatisfaction: satisfaction,
        feedbackType,
        followUpQuestion
      })
      .where(eq(conversationAnalytics.id, conversationAnalyticsId));
    
    // Get the agent name to update metrics
    const [analytics] = await db().select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.id, conversationAnalyticsId));
    
    if (analytics) {
      await this.updateAgentFeedbackMetrics(
        analytics.selectedAgent,
        satisfaction,
        feedbackType
      );
    }
  }
  
  async getUserAnalyticsDashboard(userId: string, days: number = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    
    // Get user's conversation history
    const conversations = await db().select()
      .from(conversationAnalytics)
      .where(
        and(
          eq(conversationAnalytics.userId, userId),
          gte(conversationAnalytics.createdAt, sinceDate)
        )
      );
    
    // Calculate user-specific metrics
    const totalConversations = conversations.length;
    const avgSatisfaction = this.calculateAvgSatisfaction(conversations);
    const mostUsedAgents = this.getMostUsedAgents(conversations);
    const queryCategories = this.categorizeUserQueries(conversations);
    
    // Get user data
    const [user] = await db().select()
      .from(users)
      .where(eq(users.id, userId));
    
    const journeyStage = await this.determineUserJourneyStage(user as User, conversations);
    
    return {
      userId,
      periodDays: days,
      totalConversations,
      avgSatisfaction,
      mostUsedAgents,
      queryCategories,
      journeyStage,
      recommendations: await this.generateUserRecommendations(user as User, conversations),
      learningProgress: this.calculateLearningProgress(conversations)
    };
  }
  
  async getSystemAnalyticsDashboard(days: number = 7) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    
    // Overall metrics
    const [userStats] = await db().select({
      totalUsers: sql<number>`count(*)`,
      activeUsers: sql<number>`count(*) filter (where ${users.lastLogin} >= ${sinceDate})`
    }).from(users);
    
    const [conversationStats] = await db().select({
      totalConversations: sql<number>`count(*)`
    }).from(conversationAnalytics)
      .where(gte(conversationAnalytics.createdAt, sinceDate));
    
    // Agent performance
    const agentMetrics = await db().select()
      .from(agentPerformanceMetrics)
      .where(gte(agentPerformanceMetrics.date, sinceDate));
    
    // User satisfaction trends
    const satisfactionTrends = await this.calculateSatisfactionTrends(sinceDate);
    
    // Most common queries
    const commonQueries = await this.getCommonQueryPatterns(sinceDate);
    
    return {
      periodDays: days,
      totalUsers: userStats.totalUsers,
      activeUsers: userStats.activeUsers,
      userRetentionRate: userStats.totalUsers > 0 
        ? (userStats.activeUsers / userStats.totalUsers * 100) 
        : 0,
      totalConversations: conversationStats.totalConversations,
      avgConversationsPerUser: userStats.activeUsers > 0 
        ? conversationStats.totalConversations / userStats.activeUsers 
        : 0,
      agentPerformance: this.formatAgentPerformance(agentMetrics),
      satisfactionTrends,
      commonQueries,
      systemHealth: await this.getSystemHealth()
    };
  }
  
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }
  
  private async updateAgentMetrics(
    agentName: string,
    confidence: number,
    responseTime: number
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hour = new Date().getHours();
    
    const [existing] = await db().select()
      .from(agentPerformanceMetrics)
      .where(
        and(
          eq(agentPerformanceMetrics.agentName, agentName),
          eq(sql`date_trunc('day', ${agentPerformanceMetrics.date})`, today),
          eq(agentPerformanceMetrics.hour, hour)
        )
      );
    
    if (existing) {
      // Update existing metrics
      const totalQueries = (existing.totalQueries || 0) + 1;
      const successfulQueries = (existing.successfulQueries || 0) + (confidence > 0.7 ? 1 : 0);
      
      await db().update(agentPerformanceMetrics)
        .set({
          totalQueries,
          successfulQueries,
          failedQueries: totalQueries - successfulQueries,
          avgResponseTimeMs: existing.avgResponseTimeMs 
            ? ((existing.avgResponseTimeMs * (totalQueries - 1) + responseTime) / totalQueries)
            : responseTime,
          avgConfidenceScore: existing.avgConfidenceScore
            ? ((existing.avgConfidenceScore * (totalQueries - 1) + confidence) / totalQueries)
            : confidence
        })
        .where(eq(agentPerformanceMetrics.id, existing.id));
    } else {
      // Create new metrics
      await db().insert(agentPerformanceMetrics).values({
        agentName,
        date: new Date(),
        hour,
        totalQueries: 1,
        successfulQueries: confidence > 0.7 ? 1 : 0,
        failedQueries: confidence > 0.7 ? 0 : 1,
        avgResponseTimeMs: responseTime,
        avgConfidenceScore: confidence
      });
    }
  }
  
  private async updateAgentFeedbackMetrics(
    agentName: string,
    satisfaction: number,
    feedbackType: string
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hour = new Date().getHours();
    
    const [existing] = await db().select()
      .from(agentPerformanceMetrics)
      .where(
        and(
          eq(agentPerformanceMetrics.agentName, agentName),
          eq(sql`date_trunc('day', ${agentPerformanceMetrics.date})`, today),
          eq(agentPerformanceMetrics.hour, hour)
        )
      );
    
    if (existing) {
      const totalFeedback = (existing.totalFeedbackReceived || 0) + 1;
      const positiveFeedback = (existing.positiveFeedback || 0) + 
        (feedbackType === 'helpful' ? 1 : 0);
      const negativeFeedback = (existing.negativeFeedback || 0) + 
        (feedbackType === 'not_helpful' ? 1 : 0);
      
      await db().update(agentPerformanceMetrics)
        .set({
          totalFeedbackReceived: totalFeedback,
          positiveFeedback,
          negativeFeedback,
          avgSatisfactionScore: existing.avgSatisfactionScore
            ? ((existing.avgSatisfactionScore * (totalFeedback - 1) + satisfaction) / totalFeedback)
            : satisfaction
        })
        .where(eq(agentPerformanceMetrics.id, existing.id));
    }
  }
  
  private calculateAvgSatisfaction(conversations: any[]): number {
    const satisfactionScores = conversations
      .filter(c => c.userSatisfaction)
      .map(c => c.userSatisfaction);
    
    return satisfactionScores.length > 0
      ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
      : 0;
  }
  
  private getMostUsedAgents(conversations: any[]): Array<{agent: string, count: number}> {
    const agentCounts: Record<string, number> = {};
    
    conversations.forEach(conv => {
      agentCounts[conv.selectedAgent] = (agentCounts[conv.selectedAgent] || 0) + 1;
    });
    
    return Object.entries(agentCounts)
      .map(([agent, count]) => ({ agent, count }))
      .sort((a, b) => b.count - a.count);
  }
  
  private categorizeUserQueries(conversations: any[]): Record<string, number> {
    const categories: Record<string, number> = {};
    
    conversations.forEach(conv => {
      const intent = conv.queryIntent || 'unknown';
      categories[intent] = (categories[intent] || 0) + 1;
    });
    
    return categories;
  }
  
  private async determineUserJourneyStage(user: User | null, conversations: any[]): Promise<string> {
    if (!conversations.length) {
      return 'new_visitor';
    }
    
    const totalConversations = conversations.length;
    const visaQueries = conversations.filter(c => c.visaRelated).length;
    const courseQueries = conversations.filter(c => c.courseRelated).length;
    
    if (totalConversations < 3) {
      return 'exploring';
    } else if (visaQueries > courseQueries && user?.studentType === 'international') {
      return 'visa_planning';
    } else if (courseQueries > 0) {
      return 'course_selection';
    } else {
      return 'engaged_learner';
    }
  }
  
  private async generateUserRecommendations(user: User | null, conversations: any[]): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (!conversations.length) {
      recommendations.push('Explore our course offerings to find the perfect fit for your career goals');
      return recommendations;
    }
    
    // Analyze patterns
    const recentConversations = conversations.slice(-5);
    const visaFocused = recentConversations.filter(c => c.visaRelated).length > 2;
    
    if (visaFocused && user?.studentType === 'international') {
      recommendations.push('Consider booking a visa consultation session');
      recommendations.push('Download our international student guide');
    }
    
    if (user?.courseInterest && user?.experienceLevel === 'beginner') {
      recommendations.push(`Check out our ${user.courseInterest} beginner resources`);
    }
    
    return recommendations;
  }
  
  private calculateLearningProgress(conversations: any[]) {
    if (!conversations.length) {
      return { stage: 'starting', confidenceTrend: 'stable', engagementLevel: 'low' };
    }
    
    // Analyze confidence trends
    const recentConfidence = conversations.slice(-10)
      .filter(c => c.confidenceScore)
      .map(c => c.confidenceScore);
    const olderConfidence = conversations.slice(0, -10)
      .filter(c => c.confidenceScore)
      .map(c => c.confidenceScore);
    
    let confidenceTrend = 'stable';
    if (recentConfidence.length && olderConfidence.length) {
      const recentAvg = recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length;
      const olderAvg = olderConfidence.reduce((a, b) => a + b, 0) / olderConfidence.length;
      
      if (recentAvg > olderAvg + 0.1) {
        confidenceTrend = 'improving';
      } else if (recentAvg < olderAvg - 0.1) {
        confidenceTrend = 'declining';
      }
    }
    
    // Engagement level
    const engagementLevel = conversations.length > 20 ? 'high' : 
                          conversations.length > 5 ? 'medium' : 'low';
    
    return {
      stage: this.getLearningStage(conversations.length),
      confidenceTrend,
      engagementLevel,
      totalInteractions: conversations.length
    };
  }
  
  private getLearningStage(conversationCount: number): string {
    if (conversationCount < 5) return 'exploring';
    if (conversationCount < 15) return 'learning';
    return 'advanced';
  }
  
  private async calculateSatisfactionTrends(sinceDate: Date) {
    // Group satisfaction scores by day
    const trends = await db().select({
      date: sql`date_trunc('day', ${conversationAnalytics.createdAt})`,
      avgSatisfaction: sql<number>`avg(${conversationAnalytics.userSatisfaction})`
    })
    .from(conversationAnalytics)
    .where(
      and(
        gte(conversationAnalytics.createdAt, sinceDate),
        sql`${conversationAnalytics.userSatisfaction} is not null`
      )
    )
    .groupBy(sql`date_trunc('day', ${conversationAnalytics.createdAt})`)
    .orderBy(sql`date_trunc('day', ${conversationAnalytics.createdAt})`);
    
    return trends;
  }
  
  private async getCommonQueryPatterns(sinceDate: Date) {
    const patterns = await db().select({
      queryIntent: conversationAnalytics.queryIntent,
      count: sql<number>`count(*)`
    })
    .from(conversationAnalytics)
    .where(
      and(
        gte(conversationAnalytics.createdAt, sinceDate),
        sql`${conversationAnalytics.queryIntent} is not null`
      )
    )
    .groupBy(conversationAnalytics.queryIntent)
    .orderBy(sql`count(*) desc`)
    .limit(10);
    
    return patterns;
  }
  
  private formatAgentPerformance(metrics: any[]) {
    const agentMap: Record<string, any> = {};
    
    metrics.forEach(metric => {
      if (!agentMap[metric.agentName]) {
        agentMap[metric.agentName] = {
          totalQueries: 0,
          successfulQueries: 0,
          avgResponseTimeMs: 0,
          avgConfidenceScore: 0,
          avgSatisfactionScore: 0
        };
      }
      
      const agent = agentMap[metric.agentName];
      agent.totalQueries += metric.totalQueries || 0;
      agent.successfulQueries += metric.successfulQueries || 0;
      agent.avgResponseTimeMs = metric.avgResponseTimeMs || 0;
      agent.avgConfidenceScore = metric.avgConfidenceScore || 0;
      agent.avgSatisfactionScore = metric.avgSatisfactionScore || 0;
    });
    
    return Object.entries(agentMap).map(([name, stats]) => ({
      agentName: name,
      ...stats,
      successRate: stats.totalQueries > 0 
        ? (stats.successfulQueries / stats.totalQueries * 100) 
        : 0
    }));
  }
  
  private async getSystemHealth() {
    // This would typically check actual system metrics
    return {
      status: 'healthy',
      responseTimeP50: 120,
      responseTimeP95: 450,
      errorRate: 0.2,
      activeConnections: 42
    };
  }
}