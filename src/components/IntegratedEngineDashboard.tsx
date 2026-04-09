/**
 * INTEGRATED ENGINE DASHBOARD — Combined telemetry, recommendations, and threat testing
 * Central hub for Coast Guard operators to monitor all AI engines in real-time
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Activity, Zap, Settings } from 'lucide-react';
import RecommendationPanel from './RecommendationPanel';
import TelemetryDashboard from './TelemetryDashboard';
import ThreatSandbox from './ThreatSandbox';
import { telemetryEngine } from '../engines/telemetryEngine';
import { recommendationEngine } from '../engines/recommendationEngine';
import type { Recommendation } from '../engines/recommendationEngine';
import type { EngineMetrics } from '../engines/telemetryEngine';

export interface IntegratedDashboardProps {
  showTelemetry?: boolean;
  showRecommendations?: boolean;
  showSandbox?: boolean;
}

const IntegratedEngineDashboard: React.FC<IntegratedDashboardProps> = ({
  showTelemetry = true,
  showRecommendations = true,
  showSandbox = true
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'recommendations' | 'sandbox'>(
    'telemetry'
  );
  const [metrics, setMetrics] = useState<EngineMetrics[]>([]);
  const [healthScore, setHealthScore] = useState(100);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedRecs, setDismissedRecs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Update telemetry every second
    const telemetryInterval = setInterval(() => {
      const snapshot = telemetryEngine.snapshot();
      const metricsArray = Array.from(snapshot.engines.values());
      setMetrics(metricsArray);
      setHealthScore(telemetryEngine.getHealthScore());
    }, 1000);

    return () => clearInterval(telemetryInterval);
  }, []);

  useEffect(() => {
    // Simulate recommendations update every 3 seconds
    const recommendationInterval = setInterval(() => {
      const mockVessels = Array.from({ length: 5 }, (_, i) => ({
        aisId: `VESSEL-${i}`,
        boatId: `BOAT-${i}`,
        location: { lat: 12.5 + Math.random() * 0.1, lng: 80 + Math.random() * 0.1, timestamp: Date.now() },
        status: (Math.random() > 0.7 ? 'danger' : 'safe') as const,
        speed: Math.random() * 25,
        heading: Math.random() * 360,
        lastUpdate: Date.now()
      }));

      const mockScores = new Map(
        mockVessels.map(v => [v.aisId, Math.random() * 100])
      );

      const newRecs = recommendationEngine.generateRecommendations(mockVessels, mockScores);
      setRecommendations(
        newRecs.filter(r => !dismissedRecs.has(r.id)).slice(0, 10)
      );
    }, 3000);

    return () => clearInterval(recommendationInterval);
  }, [dismissedRecs]);

  const handleDismissRecommendation = (id: string) => {
    setDismissedRecs(prev => new Set([...prev, id]));
    setRecommendations(prev => prev.filter(r => r.id !== id));
  };

  const handleRefreshMetrics = () => {
    // Simulate some engine activity
    telemetryEngine.recordExecution('anomaly-detector', Math.random() * 10, true, 5);
    telemetryEngine.recordExecution('cluster-engine', Math.random() * 20, true, 3);
    telemetryEngine.recordExecution('tensorflow-anomaly', Math.random() * 15, Math.random() > 0.1, 2);

    const snapshot = telemetryEngine.snapshot();
    const metricsArray = Array.from(snapshot.engines.values());
    setMetrics(metricsArray);
    setHealthScore(telemetryEngine.getHealthScore());
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <h1 className="text-2xl font-bold text-white">AI Engine Control Center</h1>
            <span className="text-xs font-mono text-slate-400">v1.0 • 12-Engine Stack</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full">
            <Activity className="h-3 w-3 text-green-400" />
            <span className="text-xs font-bold text-green-400">SYSTEM ONLINE</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 flex-wrap">
          {showTelemetry && (
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Zap className="h-4 w-4" />
              Telemetry
            </button>
          )}

          {showRecommendations && (
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'recommendations'
                  ? 'bg-red-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Recommendations
              {recommendations.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-mono">
                  {recommendations.length}
                </span>
              )}
            </button>
          )}

          {showSandbox && (
            <button
              onClick={() => setActiveTab('sandbox')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'sandbox'
                  ? 'bg-amber-600 text-white shadow-lg'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Settings className="h-4 w-4" />
              Threat Sandbox
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden p-6">
        {activeTab === 'telemetry' && (
          <TelemetryDashboard
            metrics={metrics}
            healthScore={healthScore}
            onRefresh={handleRefreshMetrics}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationPanel
            recommendations={recommendations}
            onClear={handleDismissRecommendation}
            isExpanded
          />
        )}

        {activeTab === 'sandbox' && <ThreatSandbox />}
      </div>

      {/* Footer Stats */}
      <div className="bg-slate-900 border-t border-slate-700 px-6 py-3 flex items-center justify-between">
        <div className="flex gap-4 text-xs">
          <div className="text-slate-400">
            <span className="font-mono">Engines:</span>{' '}
            <span className="text-white font-bold">{metrics.length}/12</span>
          </div>
          <div className="text-slate-400">
            <span className="font-mono">Active Recommendations:</span>{' '}
            <span className="text-white font-bold">{recommendations.length}</span>
          </div>
          <div className="text-slate-400">
            <span className="font-mono">System Health:</span>
            <span className={`ml-1 font-bold ${
              healthScore > 90 ? 'text-green-400' :
              healthScore > 70 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {healthScore}%
            </span>
          </div>
        </div>
        <span className="text-xs text-slate-500">
          Last update: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default IntegratedEngineDashboard;
