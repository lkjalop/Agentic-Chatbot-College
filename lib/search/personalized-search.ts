import { db } from '@/lib/db';
import { 
  users, 
  studentQueries, 
  queryFeedback,
  queryRecommendations,
  conversationAnalytics,
  User,
  StudentQuery
} from '@/lib/db/schema';
import { eq, and, or, inArray, gte, sql, desc } from 'drizzle-orm';
import { searchVectors } from '@/lib/vector';

export class PersonalizedSearchService {
  async searchWithPersonalization(
    query: string,
    user: User | null,
    filters?: {
      courseType?: string;
      programFormat?: string;
      studentType?: string;
      visaRelevant?: boolean;
    },
    limit: number = 10
  ) {
    // Base vector search
    const baseResults = await searchVectors({
      query,
      limit: limit * 2, // Get more to filter/rank
      filter: {
        type: 'student_query',
        ...(filters || {})
      }
    });
    
    if (!user) {
      return this.formatResults(baseResults.results || [], query);
    }
    
    // Personalize results based on user profile and history
    const personalizedResults = await this.personalizeResults(
      baseResults.results || [],
      user,
      query
    );
    
    // Get recommendations
    const recommendations = await this.getPersonalizedRecommendations(user);
    
    // Track search for analytics
    await this.trackPersonalizedSearch(user, query, personalizedResults);
    
    return {
      results: personalizedResults.slice(0, limit),
      recommendations,
      personalizationApplied: true,
      userContext: {
        studentType: user.studentType,
        courseInterest: user.courseInterest,
        journeyStage: await this.getUserJourneyStage(user)
      }
    };
  }
  
  private async personalizeResults(
    results: any[],
    user: User,
    query: string
  ) {
    // Get user's interaction history
    const userHistory = await this.getUserSearchHistory(user.id);
    
    // Score and rank results
    const scoredResults = await Promise.all(
      results.map(async (result) => {
        const score = await this.calculatePersonalizationScore(
          result,
          user,
          query,
          userHistory
        );
        
        return {
          ...result,
          personalizationScore: score,
          whyRecommended: await this.explainRecommendation(result, user)
        };
      })
    );
    
    // Sort by combined relevance and personalization score
    scoredResults.sort((a, b) => {
      const aTotal = (a.score || 0) + (a.personalizationScore || 0);
      const bTotal = (b.score || 0) + (b.personalizationScore || 0);
      return bTotal - aTotal;
    });
    
    return scoredResults;
  }
  
  private async calculatePersonalizationScore(
    result: any,
    user: User,
    query: string,
    history: any[]
  ): Promise<number> {
    let score = 0;
    
    // Get the full query data if we have an ID
    let queryData: StudentQuery | null = null;
    if (result.metadata?.queryId) {
      const [data] = await db().select()
        .from(studentQueries)
        .where(eq(studentQueries.id, result.metadata.queryId));
      queryData = data;
    }
    
    if (!queryData) return score;
    
    // Student type match
    if (queryData.studentType === user.studentType || queryData.studentType === 'all') {
      score += 2.0;
    }
    
    // Course interest match
    if (queryData.courseType === user.courseInterest || queryData.courseType === 'all') {
      score += 2.0;
    }
    
    // Visa relevance for international students
    if (user.studentType === 'international' && queryData.visaRelevant) {
      score += 1.5;
    }
    
    // Experience level match
    if (queryData.difficultyLevel === user.experienceLevel) {
      score += 1.0;
    }
    
    // Check if popular with similar users
    if (await this.isPopularWithSimilarUsers(queryData.id, user)) {
      score += 1.0;
    }
    
    // Quality scores
    if ((queryData.confidenceScore || 5) >= 7) {
      score += 0.5;
    }
    
    if ((queryData.freshnessScore || 5) >= 7) {
      score += 0.3;
    }
    
    return score;
  }
  
  private async getPersonalizedRecommendations(
    user: User,
    limit: number = 5
  ) {
    // Get existing unshown recommendations
    const existingRecs = await db().select()
      .from(queryRecommendations)
      .where(
        and(
          eq(queryRecommendations.userId, user.id),
          eq(queryRecommendations.shownToUser, false)
        )
      )
      .limit(limit);
    
    if (existingRecs.length >= limit) {
      return this.formatRecommendations(existingRecs);
    }
    
    // Generate new recommendations if needed
    await this.generateRecommendationsForUser(user);
    
    // Get updated recommendations
    const recommendations = await db().select()
      .from(queryRecommendations)
      .innerJoin(
        studentQueries,
        eq(queryRecommendations.queryId, studentQueries.id)
      )
      .where(
        and(
          eq(queryRecommendations.userId, user.id),
          eq(queryRecommendations.shownToUser, false)
        )
      )
      .limit(limit);
    
    return this.formatRecommendations(recommendations);
  }
  
  private async generateRecommendationsForUser(user: User) {
    // Get user's conversation history
    const conversations = await db().select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.userId, user.id))
      .orderBy(desc(conversationAnalytics.createdAt))
      .limit(20);
    
    // Find popular queries for similar users
    const similarUsers = await this.findSimilarUsers(user);
    const popularQueries = await this.getPopularQueriesForUsers(similarUsers);
    
    // Find next-step queries based on user journey
    const journeyStage = await this.getUserJourneyStage(user);
    const nextStepQueries = await this.getJourneyBasedQueries(journeyStage, user);
    
    // Find trending queries in user's area of interest
    const trendingQueries = await this.getTrendingQueries(
      user.courseInterest || 'all',
      user.studentType || 'all'
    );
    
    // Create recommendations
    const recommendationsToCreate: any[] = [];
    
    // Add popular with similar users
    for (const query of popularQueries.slice(0, 2)) {
      recommendationsToCreate.push({
        userId: user.id,
        queryId: query.id,
        recommendationReason: 'popular_with_similar_users',
        confidenceScore: 8
      });
    }
    
    // Add next-step recommendations
    for (const query of nextStepQueries.slice(0, 2)) {
      recommendationsToCreate.push({
        userId: user.id,
        queryId: query.id,
        recommendationReason: 'next_step',
        confidenceScore: 9
      });
    }
    
    // Add trending
    for (const query of trendingQueries.slice(0, 1)) {
      recommendationsToCreate.push({
        userId: user.id,
        queryId: query.id,
        recommendationReason: 'trending_in_area',
        confidenceScore: 6
      });
    }
    
    // Save unique recommendations only
    for (const recData of recommendationsToCreate) {
      const [existing] = await db().select()
        .from(queryRecommendations)
        .where(
          and(
            eq(queryRecommendations.userId, recData.userId),
            eq(queryRecommendations.queryId, recData.queryId)
          )
        );
      
      if (!existing) {
        await db().insert(queryRecommendations).values(recData);
      }
    }
  }
  
  async trackQueryInteraction(
    user: User | null,
    queryId: string,
    interactionType: 'view' | 'helpful' | 'not_helpful' | 'click',
    feedbackText?: string
  ) {
    // Update query stats
    const updates: any = {};
    
    if (interactionType === 'view') {
      updates.viewCount = sql`${studentQueries.viewCount} + 1`;
      updates.lastAccessed = new Date();
    } else if (interactionType === 'helpful') {
      updates.helpfulVotes = sql`${studentQueries.helpfulVotes} + 1`;
    } else if (interactionType === 'not_helpful') {
      updates.notHelpfulVotes = sql`${studentQueries.notHelpfulVotes} + 1`;
    }
    
    if (Object.keys(updates).length > 0) {
      await db().update(studentQueries)
        .set(updates)
        .where(eq(studentQueries.id, queryId));
    }
    
    // Record detailed feedback if user provided it
    if (user && interactionType in ['helpful', 'not_helpful']) {
      await db().insert(queryFeedback).values({
        queryId,
        userId: user.id,
        isHelpful: interactionType === 'helpful',
        feedbackText,
        userStudentType: user.studentType,
        userCourseInterest: user.courseInterest
      });
    }
    
    // Update recommendation tracking if this was a recommendation
    if (user && interactionType === 'click') {
      await db().update(queryRecommendations)
        .set({
          clickedByUser: true,
          clickedAt: new Date()
        })
        .where(
          and(
            eq(queryRecommendations.userId, user.id),
            eq(queryRecommendations.queryId, queryId),
            eq(queryRecommendations.shownToUser, true),
            eq(queryRecommendations.clickedByUser, false)
          )
        );
    }
  }
  
  private async findSimilarUsers(user: User): Promise<User[]> {
    return await db().select()
      .from(users)
      .where(
        and(
          eq(users.studentType, user.studentType || 'unknown'),
          eq(users.courseInterest, user.courseInterest || 'none'),
          sql`${users.id} != ${user.id}`
        )
      )
      .limit(50);
  }
  
  private async getPopularQueriesForUsers(similarUsers: User[]): Promise<StudentQuery[]> {
    if (similarUsers.length === 0) return [];
    
    const userIds = similarUsers.map(u => u.id);
    
    const popularQueries = await db().select({
      query: studentQueries,
      helpfulCount: sql<number>`count(${queryFeedback.id})`
    })
    .from(studentQueries)
    .innerJoin(
      queryFeedback,
      and(
        eq(queryFeedback.queryId, studentQueries.id),
        eq(queryFeedback.isHelpful, true)
      )
    )
    .where(
      and(
        inArray(queryFeedback.userId, userIds),
        eq(studentQueries.isPublic, true),
        eq(studentQueries.status, 'approved')
      )
    )
    .groupBy(studentQueries.id)
    .orderBy(desc(sql`count(${queryFeedback.id})`))
    .limit(10);
    
    return popularQueries.map(r => r.query);
  }
  
  private async getJourneyBasedQueries(
    journeyStage: string,
    user: User
  ): Promise<StudentQuery[]> {
    const stageQueryMap: Record<string, Array<'course_info' | 'visa' | 'career' | 'prerequisites' | 'general'>> = {
      'exploring': ['course_info', 'career'],
      'visa_planning': ['visa'],
      'course_selection': ['prerequisites', 'course_info'],
      'engaged_learner': ['career', 'general']
    };
    
    const categories = stageQueryMap[journeyStage] || ['course_info' as const];
    
    return await db().select()
      .from(studentQueries)
      .where(
        and(
          inArray(studentQueries.category, categories),
          or(
            eq(studentQueries.studentType, (user.studentType === 'unknown' ? 'all' : user.studentType) || 'all'),
            eq(studentQueries.studentType, 'all')
          ),
          eq(studentQueries.isPublic, true),
          eq(studentQueries.status, 'approved')
        )
      )
      .orderBy(desc(studentQueries.priority))
      .limit(5);
  }
  
  private async getTrendingQueries(
    courseInterest: string,
    studentType: string
  ): Promise<StudentQuery[]> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return await db().select()
      .from(studentQueries)
      .where(
        and(
          or(
            eq(studentQueries.courseType, courseInterest === 'none' ? 'all' : courseInterest as 'data_analyst' | 'full_stack' | 'cybersecurity' | 'business_analyst' | 'all'),
            eq(studentQueries.courseType, 'all')
          ),
          or(
            eq(studentQueries.studentType, studentType === 'unknown' ? 'all' : studentType as 'local' | 'international' | 'career_changer' | 'all'),
            eq(studentQueries.studentType, 'all')
          ),
          gte(studentQueries.lastAccessed, weekAgo),
          eq(studentQueries.isPublic, true),
          eq(studentQueries.status, 'approved')
        )
      )
      .orderBy(desc(studentQueries.viewCount))
      .limit(3);
  }
  
  private async getUserJourneyStage(user: User): Promise<string> {
    // Get recent conversations
    const recentConversations = await db().select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.userId, user.id))
      .orderBy(desc(conversationAnalytics.createdAt))
      .limit(10);
    
    if (!recentConversations.length) {
      return 'exploring';
    }
    
    const visaQueries = recentConversations.filter(c => c.visaRelated).length;
    const courseQueries = recentConversations.filter(c => c.courseRelated).length;
    
    if (visaQueries > courseQueries && user.studentType === 'international') {
      return 'visa_planning';
    } else if (courseQueries > 0) {
      return 'course_selection';
    } else if (recentConversations.length > 5) {
      return 'engaged_learner';
    } else {
      return 'exploring';
    }
  }
  
  private async isPopularWithSimilarUsers(
    queryId: string,
    user: User
  ): Promise<boolean> {
    const similarUsers = await this.findSimilarUsers(user);
    if (!similarUsers.length) return false;
    
    const userIds = similarUsers.slice(0, 20).map(u => u.id);
    
    const [result] = await db().select({
      helpfulCount: sql<number>`count(*)`
    })
    .from(queryFeedback)
    .where(
      and(
        eq(queryFeedback.queryId, queryId),
        inArray(queryFeedback.userId, userIds),
        eq(queryFeedback.isHelpful, true)
      )
    );
    
    return (result?.helpfulCount || 0) >= 3;
  }
  
  private async getUserSearchHistory(userId: string) {
    return await db().select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.userId, userId))
      .orderBy(desc(conversationAnalytics.createdAt))
      .limit(50);
  }
  
  private async trackPersonalizedSearch(
    user: User,
    query: string,
    results: any[]
  ) {
    // This would integrate with the analytics service
    // For now, just log
    console.log('Tracking personalized search:', {
      userId: user.id,
      query,
      resultCount: results.length
    });
  }
  
  private async explainRecommendation(result: any, user: User): Promise<string> {
    const reasons: string[] = [];
    
    if (result.metadata?.studentType === user.studentType) {
      reasons.push(`Relevant for ${user.studentType} students`);
    }
    
    if (result.metadata?.courseType === user.courseInterest) {
      reasons.push(`Matches your ${user.courseInterest} interest`);
    }
    
    if (user.studentType === 'international' && result.metadata?.visaRelevant) {
      reasons.push('Contains visa information');
    }
    
    return reasons.join(' • ') || 'Recommended for you';
  }
  
  private formatResults(results: any[], query: string) {
    return {
      results: results.map(r => ({
        ...r,
        personalizationScore: 0,
        whyRecommended: 'Matches your search'
      })),
      recommendations: [],
      personalizationApplied: false,
      userContext: null
    };
  }
  
  private formatRecommendations(recommendations: any[]) {
    return recommendations.map(rec => ({
      id: rec.queryRecommendations?.id || rec.id,
      query: {
        id: rec.studentQueries?.id || rec.queryId,
        question: rec.studentQueries?.question,
        category: rec.studentQueries?.category,
        courseType: rec.studentQueries?.courseType
      },
      reason: rec.queryRecommendations?.recommendationReason || rec.recommendationReason,
      confidence: rec.queryRecommendations?.confidenceScore || rec.confidenceScore,
      why: this.getRecommendationExplanation(
        rec.queryRecommendations?.recommendationReason || rec.recommendationReason
      )
    }));
  }
  
  private getRecommendationExplanation(reason: string): string {
    const explanations: Record<string, string> = {
      'popular_with_similar_users': 'Other students like you found this helpful',
      'next_step': 'This might be your next step based on your progress',
      'matches_interests': 'This matches your course interests',
      'trending_in_area': 'This is trending in your area of interest'
    };
    
    return explanations[reason] || 'Recommended for you';
  }
}