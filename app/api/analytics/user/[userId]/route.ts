import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { AnalyticsService } from '@/lib/analytics/analytics-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession();
    
    // Check if user is authenticated and authorized
    if (!session?.user?.id || session.user.id !== params.userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    
    const analyticsService = new AnalyticsService();
    const analytics = await analyticsService.getUserAnalyticsDashboard(params.userId, days);
    
    return Response.json(analytics);
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}