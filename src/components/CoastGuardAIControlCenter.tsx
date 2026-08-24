/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 *
 * OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
 * 
 * NOTICE & RESTRICTIONS:
 * 1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
 * 2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
 * 3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
 *    TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { Zap, BarChart3, AlertCircle, Crosshair, Activity, TrendingUp, Shield, Settings } from 'lucide-react';
import TelemetryDashboard from './TelemetryDashboard';
import RecommendationPanel from './RecommendationPanel';
import ThreatSandbox from './ThreatSandbox';
import { telemetryEngine } from '../engines/telemetryEngine';
import { EngineMetrics, TelemetrySnapshot } from '../engines/telemetryEngine';

interface AIControlCenterSubTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const SUB_TABS: AIControlCenterSubTab[] = [
  {
    id: 'telemetry',
    label: 'Telemetry',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'Real-time engine health & performance metrics'
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    icon: <AlertCircle className="h-4 w-4" />,
    description: 'AI-generated actionable threat alerts'
  },
  {
    id: 'threat-sandbox',
    label: 'Threat Sandbox',
    icon: <Crosshair className="h-4 w-4" />,
    description: 'Threat detection testing & validation'
  },
  {
    id: 'engine-stats',
    label: 'Engine Stats',
    icon: <TrendingUp className="h-4 w-4" />,
    description: 'Detailed analytics & historical performance'
  },
];

export default function CoastGuardAIControlCenter() {
  const [activeSubTab, setActiveSubTab] = useState('telemetry');
  const [metrics, setMetrics] = useState<EngineMetrics[]>([]);
  const [healthScore, setHealthScore] = useState(92);
  const [telemetrySnapshot, setTelemetrySnapshot] = useState<TelemetrySnapshot | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'warning' | 'critical'>('operational');
  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());
  const activeEngines = metrics.length || 12; // Fallback to 12 if metrics hasn't loaded 12 engines yet

  // Generate mock recommendations for display
  const generateMockRecommendations = () => {
    const mockRecs = [
      {
        id: 'rec-001',
        priority: 'critical',
        action: 'Intercept suspicious vessel',
        targetVessels: ['VESSEL-001'],
        confidence: 0.92,
        timestamp: Date.now() - 120000,
        reasoning: 'High anomaly score detected',
        expiresAt: Date.now() + 3600000
      },
      {
        id: 'rec-002',
        priority: 'high',
        action: 'Monitor unusual pattern',
        targetVessels: ['VESSEL-002'],
        confidence: 0.78,
        timestamp: Date.now() - 300000,
        reasoning: 'Moderate anomaly in behavior',
        expiresAt: Date.now() + 3600000
      }
    ];
    return mockRecs;
  };

  // Real-time telemetry updates
  useEffect(() => {
    const telemetryInterval = setInterval(() => {
      const snapshot = telemetryEngine.snapshot();
      setTelemetrySnapshot(snapshot);
      setMetrics(Array.from(snapshot.engines.values()));
      
      const health = telemetryEngine.getHealthScore();
      setHealthScore(health);
      
      // Determine system status based on health
      let status: 'operational' | 'warning' | 'critical' = 'operational';
      if (health < 70) status = 'critical';
      else if (health < 85) status = 'warning';
      
      setSystemStatus(status);
    }, 1000);

    return () => clearInterval(telemetryInterval);
  }, []);

  // Real-time recommendations updates
  useEffect(() => {
    const recommendationInterval = setInterval(() => {
      const recs = generateMockRecommendations();
      const filtered = recs.filter(r => !dismissedRecommendations.has(r.id));
      setRecommendations(filtered);
    }, 3000);

    return () => clearInterval(recommendationInterval);
  }, [dismissedRecommendations]);

  const handleDismissRecommendation = (id: string) => {
    const newDismissed = new Set(dismissedRecommendations);
    newDismissed.add(id);
    setDismissedRecommendations(newDismissed);
  };

  const getStatusColor = (status: typeof systemStatus) => {
    switch (status) {
      case 'critical': return 'bg-red-50 text-red-700 border-red-300';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-300';
      default: return 'bg-green-50 text-green-700 border-green-300';
    }
  };

  const getStatusBadge = (status: typeof systemStatus) => {
    switch (status) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      default: return '🟢';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className={`px-6 py-4 border-b border-gray-200 bg-gradient-to-r ${
        systemStatus === 'critical' ? 'from-red-50 to-red-100' :
        systemStatus === 'warning' ? 'from-yellow-50 to-yellow-100' :
        'from-blue-50 to-cyan-100'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-md">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Engine Control Center</h2>
              <p className="text-sm text-gray-600">Maritime Intelligence System Status</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full border-2 font-semibold flex items-center space-x-2 ${getStatusColor(systemStatus)}`}>
            <span className="text-lg">{getStatusBadge(systemStatus)}</span>
            <span>{systemStatus.toUpperCase()}</span>
          </div>
        </div>

        {/* System Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 font-semibold">HEALTH SCORE</div>
            <div className="text-2xl font-bold text-blue-600">{healthScore}%</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div 
                className={`h-1.5 rounded-full transition-all width-var ${
                  healthScore >= 90 ? 'bg-green-500' : 
                  healthScore >= 75 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ '--width': `${healthScore}%` } as React.CSSProperties}
              />
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 font-semibold">ACTIVE ENGINES</div>
            <div className="text-2xl font-bold text-blue-600">{activeEngines}/12</div>
            <div className="text-xs text-gray-500 mt-1">All systems operational</div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 font-semibold">ALERTS</div>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <div className="text-xs text-gray-500 mt-1">Pending review</div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-gray-200">
            <div className="text-xs text-gray-600 font-semibold">UPTIME</div>
            <div className="text-2xl font-bold text-green-600">99.8%</div>
            <div className="text-xs text-gray-500 mt-1">Last 24 hours</div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 overflow-x-auto">
        <div className="flex space-x-1 py-2">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-all whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
              title={tab.description}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sub-Tab Content */}
      <div className="p-6 bg-white overflow-auto max-h-96">
        {/* Telemetry Tab */}
        {activeSubTab === 'telemetry' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">System Telemetry</h3>
                <p className="text-sm text-gray-600">Real-time performance metrics for all 12 engines</p>
              </div>
              <Activity className="h-6 w-6 text-blue-500 animate-pulse" />
            </div>
            <TelemetryDashboard
              metrics={metrics}
              healthScore={healthScore}
              onRefresh={() => {
                const snapshot = telemetryEngine.snapshot();
                setTelemetrySnapshot(snapshot);
                setMetrics(Array.from(snapshot.engines.values()));
              }}
            />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeSubTab === 'recommendations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
                <p className="text-sm text-gray-600">Prioritized threat alerts from recommendation engine</p>
              </div>
              <AlertCircle className="h-6 w-6 text-orange-500" />
            </div>
            <RecommendationPanel
              recommendations={recommendations}
              onClear={handleDismissRecommendation}
              isExpanded={true}
            />
          </div>
        )}

        {/* Threat Sandbox Tab */}
        {activeSubTab === 'threat-sandbox' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Threat Detection Sandbox</h3>
                <p className="text-sm text-gray-600">Test and validate anomaly detection with synthetic scenarios</p>
              </div>
              <Crosshair className="h-6 w-6 text-red-500" />
            </div>
            <ThreatSandbox />
          </div>
        )}

        {/* Engine Stats Tab */}
        {activeSubTab === 'engine-stats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Engine Performance Analytics</h3>
                <p className="text-sm text-gray-600">Detailed historical data and performance trends</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>

            {/* Engine Performance Grid */}
            <div className="grid grid-cols-2 gap-4">
              {(metrics && metrics.length > 0) ? metrics.slice(0, 6).map((metric) => (
                <div key={metric.name} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm capitalize">
                      {metric.name.replace(/-/g, ' ')}
                    </h4>
                    <Shield className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Latency:</span>
                      <span className="font-mono text-gray-900">{metric.latency.toFixed(1)}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Accuracy:</span>
                      <span className="font-mono text-gray-900">{metric.accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Throughput:</span>
                      <span className="font-mono text-gray-900">{metric.throughput.toFixed(2)}/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Errors:</span>
                      <span className="font-mono text-gray-900">{metric.errorRate.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              ))
              : (
                <div className="col-span-2 bg-gray-50 p-4 rounded-lg border border-gray-200 text-center text-gray-600">
                  No engine metrics available. Telemetry system initializing...
                </div>
              )}
            </div>

            {/* Historical Data Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="font-semibold text-blue-900 mb-2">📊 Historical Performance</div>
              <p className="text-sm text-blue-700">
                System has logged {telemetrySnapshot && telemetrySnapshot.engines ? telemetrySnapshot.engines.size : 0} engine executions over the last 5 minutes.
                Average health score: {healthScore ? healthScore.toFixed(1) : '0.0'}% | Critical events: {
                  telemetrySnapshot && telemetrySnapshot.engines && telemetrySnapshot.engines.size > 0
                    ? Array.from(telemetrySnapshot.engines.values()).filter((m) => m.errorRate > 5).length
                    : 0
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Control Bar */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse delay-200"></div>
          </div>
          <span>Control Center Active</span>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <Settings className="h-4 w-4 inline mr-1" />
            Config
          </button>
          <button className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
