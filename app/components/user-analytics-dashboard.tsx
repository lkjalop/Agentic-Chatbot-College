'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Clock, 
  Star,
  Target,
  BookOpen,
  Award,
  TrendingDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserAnalytics {
  userId: string;
  periodDays: number;
  totalConversations: number;
  avgSatisfaction: number;
  mostUsedAgents: Array<{agent: string, count: number}>;
  queryCategories: Record<string, number>;
  journeyStage: string;
  recommendations: string[];
  learningProgress: {
    stage: string;
    confidenceTrend: string;
    engagementLevel: string;
    totalInteractions: number;
  };
}

interface UserAnalyticsDashboardProps {
  userId: string;
}

export function UserAnalyticsDashboard({ userId }: UserAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    fetchAnalytics();
  }, [userId, selectedPeriod]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/analytics/user/${userId}?days=${selectedPeriod}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getJourneyStageInfo = (stage: string) => {
    const stages: Record<string, { label: string; color: string; icon: string }> = {
      new_visitor: { label: 'New Visitor', color: 'bg-gray-100 text-gray-800', icon: '👋' },
      exploring: { label: 'Exploring', color: 'bg-blue-100 text-blue-800', icon: '🔍' },
      visa_planning: { label: 'Visa Planning', color: 'bg-yellow-100 text-yellow-800', icon: '📄' },
      course_selection: { label: 'Course Selection', color: 'bg-green-100 text-green-800', icon: '📚' },
      engaged_learner: { label: 'Engaged Learner', color: 'bg-purple-100 text-purple-800', icon: '🎓' }
    };
    return stages[stage] || stages.new_visitor;
  };

  const getConfidenceTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const journeyInfo = getJourneyStageInfo(analytics.journeyStage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Learning Analytics</h2>
        <Tabs value={selectedPeriod.toString()} onValueChange={(v) => setSelectedPeriod(Number(v))}>
          <TabsList>
            <TabsTrigger value="7">Last 7 days</TabsTrigger>
            <TabsTrigger value="30">Last 30 days</TabsTrigger>
            <TabsTrigger value="90">Last 90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              <span className="text-2xl font-bold">{analytics.totalConversations}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Total Conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <Star className="w-8 h-8 text-yellow-600" />
              <span className="text-2xl font-bold">{analytics.avgSatisfaction.toFixed(1)}</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Average Satisfaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-2xl">{journeyInfo.icon}</div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${journeyInfo.color}`}>
                {journeyInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Journey Stage</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {getConfidenceTrendIcon(analytics.learningProgress.confidenceTrend)}
              <span className="text-lg font-medium capitalize">
                {analytics.learningProgress.confidenceTrend}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Confidence Trend</p>
          </CardContent>
        </Card>
      </div>

      {/* Learning Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Learning Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Learning Stage</h4>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-600" />
                <span className="capitalize font-medium">{analytics.learningProgress.stage}</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Engagement Level</h4>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="capitalize font-medium">{analytics.learningProgress.engagementLevel}</span>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Total Interactions</h4>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <span className="font-medium">{analytics.learningProgress.totalInteractions}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Most Used Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Your Preferred AI Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.mostUsedAgents.slice(0, 5).map((agent, index) => (
              <div key={agent.agent} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <span className="font-medium capitalize">{agent.agent.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(agent.count / analytics.totalConversations) * 100} 
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600 w-8 text-right">{agent.count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Query Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Question Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(analytics.queryCategories).map(([category, count]) => (
              <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{count}</div>
                <div className="text-sm text-gray-600 capitalize">{category.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {analytics.recommendations.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Personalized Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}