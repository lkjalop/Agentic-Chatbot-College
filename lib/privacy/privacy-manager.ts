import crypto from 'crypto';
import { db } from '@/lib/db';
import { 
  users, 
  userSessions, 
  conversationAnalytics,
  queryFeedback,
  queryRecommendations
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export class PrivacyManager {
  static anonymizeIpAddress(ipAddress: string): string {
    if (!ipAddress) return '';
    return crypto.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16);
  }
  
  static anonymizeUserData(data: any, consentLevel: string = 'basic'): any {
    if (consentLevel === 'none') {
      // Remove all identifiable information
      return {
        userType: data.userType || 'unknown',
        timestamp: data.timestamp,
        sessionDuration: data.sessionDuration
      };
    }
    
    if (consentLevel === 'basic') {
      // Keep minimal data for service improvement
      return {
        userIdHash: data.userId 
          ? crypto.createHash('sha256').update(data.userId).digest('hex').substring(0, 16)
          : null,
        userType: data.userType,
        courseInterest: data.courseInterest,
        timestamp: data.timestamp,
        queryCategory: data.queryCategory
      };
    }
    
    if (consentLevel === 'analytics') {
      // Keep data needed for personalization and analytics
      const anonymized = { ...data };
      delete anonymized.email;
      delete anonymized.name;
      delete anonymized.picture;
      delete anonymized.googleId;
      return anonymized;
    }
    
    // Full consent
    return data;
  }
  
  static getDataRetentionPeriod(dataType: string): number {
    // Return retention period in days
    const retentionPeriods: Record<string, number> = {
      'session_data': 30,
      'analytics_data': 365,
      'user_profile': 2555, // 7 years
      'conversation_history': 365,
      'feedback_data': 730 // 2 years
    };
    
    return retentionPeriods[dataType] || 365;
  }
  
  static shouldDeleteData(createdAt: Date, dataType: string): boolean {
    const retentionDays = this.getDataRetentionPeriod(dataType);
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSinceCreation > retentionDays;
  }
  
  static async exportUserData(userId: string) {
    // Get user data
    const [user] = await db().select().from(users).where(eq(users.id, userId));
    if (!user) return null;
    
    // Get conversations
    const conversations = await db().select()
      .from(conversationAnalytics)
      .where(eq(conversationAnalytics.userId, userId));
    
    // Get sessions
    const sessions = await db().select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));
    
    // Get feedback
    const feedback = await db().select()
      .from(queryFeedback)
      .where(eq(queryFeedback.userId, userId));
    
    // Get recommendations
    const recommendations = await db().select()
      .from(queryRecommendations)
      .where(eq(queryRecommendations.userId, userId));
    
    return {
      userProfile: {
        id: user.id,
        email: user.email,
        name: user.name,
        studentType: user.studentType,
        courseInterest: user.courseInterest,
        experienceLevel: user.experienceLevel,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      conversations: conversations.map((c: any) => ({
        id: c.id,
        query: c.userQuery,
        agent: c.selectedAgent,
        satisfaction: c.userSatisfaction,
        createdAt: c.createdAt
      })),
      sessions: sessions.map(s => ({
        id: s.id,
        startedAt: s.startedAt,
        duration: s.durationSeconds,
        interactions: s.interactions
      })),
      feedback: feedback.map(f => ({
        id: f.id,
        isHelpful: f.isHelpful,
        feedbackText: f.feedbackText,
        createdAt: f.createdAt
      })),
      recommendations: recommendations.map(r => ({
        id: r.id,
        reason: r.recommendationReason,
        shown: r.shownToUser,
        clicked: r.clickedByUser,
        createdAt: r.createdAt
      })),
      exportDate: new Date().toISOString()
    };
  }
  
  static async deleteUserData(userId: string): Promise<boolean> {
    try {
      // Delete in reverse dependency order
      await db().delete(queryRecommendations)
        .where(eq(queryRecommendations.userId, userId));
      
      await db().delete(queryFeedback)
        .where(eq(queryFeedback.userId, userId));
      
      await db().delete(conversationAnalytics)
        .where(eq(conversationAnalytics.userId, userId));
      
      await db().delete(userSessions)
        .where(eq(userSessions.userId, userId));
      
      await db().delete(users)
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }
  
  static generatePrivacyPolicy(): string {
    return `
# Privacy Policy

## Data Collection
We collect the following types of data:
- Account information (email, name, profile picture) when you sign in with Google
- Usage data (search queries, interactions, preferences)
- Analytics data (session duration, feature usage) if you consent

## Data Usage
Your data is used to:
- Provide personalized learning recommendations
- Improve our service quality
- Generate anonymous analytics reports

## Data Protection
- All sensitive data is encrypted in transit and at rest
- IP addresses are anonymized
- You can export or delete your data at any time

## Data Retention
- Session data: 30 days
- Analytics data: 1 year
- Account data: 7 years or until deletion requested

## Your Rights
- Access your data via the export feature
- Delete your account and all associated data
- Opt out of analytics tracking
- Update your privacy preferences anytime

## Contact
For privacy concerns, contact: privacy@agentic-rag.example.com
    `.trim();
  }
  
  static generateCookiePolicy(): string {
    return `
# Cookie Policy

## Essential Cookies
We use essential cookies for:
- Authentication (keeping you signed in)
- Security (CSRF protection)
- User preferences

## Analytics Cookies (Optional)
If you consent, we use analytics cookies to:
- Understand how you use our service
- Improve user experience
- Track feature usage

## Managing Cookies
You can:
- Disable analytics cookies in your account settings
- Clear cookies via your browser settings
- Use incognito/private browsing mode
    `.trim();
  }
}