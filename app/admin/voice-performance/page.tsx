'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PerformanceMetrics {
  oldSystem: { latency: number; cost: number; satisfaction: number };
  newSystem: { latency: number; cost: number; satisfaction: number };
  improvement: { latency: string; cost: string; satisfaction: string };
}

export default function VoicePerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    oldSystem: { latency: 3500, cost: 0.15, satisfaction: 65 },
    newSystem: { latency: 1200, cost: 0.044, satisfaction: 89 },
    improvement: { latency: '71%', cost: '70%', satisfaction: '37%' }
  });

  const [liveCallCount, setLiveCallCount] = useState(0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Voice AI Performance Dashboard</h1>
        <div className="text-sm text-gray-600">
          Live Calls: <span className="font-bold text-green-600">{liveCallCount}</span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Response Latency</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Old System:</span>
              <span className="text-red-600">{metrics.oldSystem.latency}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>New System:</span>
              <span className="text-green-600">{metrics.newSystem.latency}ms</span>
            </div>
            <Progress value={71} className="h-2" />
            <div className="text-center text-2xl font-bold text-green-600">
              {metrics.improvement.latency} Faster
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cost Per Minute</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Old System:</span>
              <span className="text-red-600">${metrics.oldSystem.cost}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>New System:</span>
              <span className="text-green-600">${metrics.newSystem.cost}</span>
            </div>
            <Progress value={70} className="h-2" />
            <div className="text-center text-2xl font-bold text-green-600">
              {metrics.improvement.cost} Cheaper
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Student Satisfaction</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Old System:</span>
              <span className="text-red-600">{metrics.oldSystem.satisfaction}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>New System:</span>
              <span className="text-green-600">{metrics.newSystem.satisfaction}%</span>
            </div>
            <Progress value={89} className="h-2" />
            <div className="text-center text-2xl font-bold text-green-600">
              {metrics.improvement.satisfaction} Better
            </div>
          </div>
        </Card>
      </div>

      {/* ROI Calculator */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">ROI Calculator</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">$1,854</div>
            <div className="text-sm text-gray-600">Monthly Savings</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">$22K</div>
            <div className="text-sm text-gray-600">Annual Savings</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">40%</div>
            <div className="text-sm text-gray-600">Higher Conversion</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">60%</div>
            <div className="text-sm text-gray-600">Fewer Escalations</div>
          </div>
        </div>
      </Card>

      {/* Demo Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Live Demo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <h4 className="font-semibold mb-2">Old System</h4>
            <div className="text-sm text-gray-600 mb-3">
              Call: <span className="font-mono">+1 346 409 7732</span>
            </div>
            <div className="text-xs text-red-600">⚠️ 3.5 second responses</div>
          </div>
          <div className="text-center p-4 border rounded-lg bg-green-50">
            <h4 className="font-semibold mb-2">New System</h4>
            <div className="text-sm text-gray-600 mb-3">
              Call: <span className="font-mono">+1 XXX XXX XXXX</span>
            </div>
            <div className="text-xs text-green-600">✅ 1.2 second responses</div>
          </div>
        </div>
      </Card>
    </div>
  );
}