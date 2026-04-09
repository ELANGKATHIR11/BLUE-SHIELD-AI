/**
 * TELEMETRY DASHBOARD — Real-time health monitoring for all 12 engines
 * Displays latency, accuracy, throughput, and error rates
 */

import React, { useState } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  BarChart3
} from 'lucide-react';
import type { EngineMetrics } from '../engines/telemetryEngine';

interface TelemetryDashboardProps {
  metrics: EngineMetrics[];
  healthScore: number;
  onRefresh?: () => void;
}

const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  metrics = [],
  healthScore = 100,
  onRefresh
}) => {
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'latency' | 'accuracy' | 'throughput'>('latency');

  const getEngineIcon = (name: string) => {
    const icons: Record<string, JSX.Element> = {
      'anomaly-detector': <AlertTriangle className="h-4 w-4" />,
      'cluster-engine': <BarChart3 className="h-4 w-4" />,
      'kalman-filter': <TrendingUp className="h-4 w-4" />,
      'lora-simulator': <Zap className="h-4 w-4" />,
      'geofence-engine': <Activity className="h-4 w-4" />,
      'store-forward': <CheckCircle className="h-4 w-4" />,
      'tensorflow-anomaly': <Cpu className="h-4 w-4" />,
      'vector-search': <Clock className="h-4 w-4" />,
      'recommendation-engine': <TrendingUp className="h-4 w-4" />,
      'blockchain-integrity': <CheckCircle className="h-4 w-4" />,
      'edge-computing': <Activity className="h-4 w-4" />,
      'adversarial-robustness': <AlertTriangle className="h-4 w-4" />
    };
    return icons[name] || <Activity className="h-4 w-4" />;
  };

  const getSortedMetrics = () => {
    if (!metrics) return [];
    return [...metrics].sort((a, b) => {
      switch (sortBy) {
        case 'latency':
          return a.latency - b.latency;
        case 'accuracy':
          return b.accuracy - a.accuracy;
        case 'throughput':
          return b.throughput - a.throughput;
        default:
          return 0;
      }
    });
  };

  const getHealthColor = (metric: EngineMetrics) => {
    if (!metric.isHealthy) return 'text-red-600';
    if (metric.errorRate > 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const selectedMetric = metrics.find(m => m.name === selectedEngine);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${healthScore > 90 ? 'bg-green-400' : healthScore > 70 ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`} />
            <h3 className="text-white font-bold text-lg">Engine Telemetry</h3>
            <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold">
              Health: {healthScore}%
            </span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded transition-all"
            >
              Refresh
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('latency')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              sortBy === 'latency'
                ? 'bg-white text-purple-600'
                : 'text-white/70 hover:text-white'
            }`}
          >
            ⚡ Latency
          </button>
          <button
            onClick={() => setSortBy('accuracy')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              sortBy === 'accuracy'
                ? 'bg-white text-purple-600'
                : 'text-white/70 hover:text-white'
            }`}
          >
            ✓ Accuracy
          </button>
          <button
            onClick={() => setSortBy('throughput')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              sortBy === 'throughput'
                ? 'bg-white text-purple-600'
                : 'text-white/70 hover:text-white'
            }`}
          >
            ⬆ Throughput
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-hidden flex gap-4">
        {/* Metrics List */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            {getSortedMetrics().map(metric => (
              <div
                key={metric.name}
                onClick={() => setSelectedEngine(metric.name)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedEngine === metric.name
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`${getHealthColor(metric)}`}>
                      {getEngineIcon(metric.name)}
                    </span>
                    <span className="font-bold text-sm capitalize truncate">
                      {metric.name.replace('-', ' ')}
                    </span>
                    {!metric.isHealthy && (
                      <span className="text-red-600">⚠</span>
                    )}
                  </div>
                  <span className="text-xs font-mono text-gray-500">
                    {metric.latency.toFixed(1)}ms
                  </span>
                </div>

                {/* Mini Bars */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(100, (metric.latency / 50) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-gray-600 block mt-1">Latency</span>
                  </div>
                  <div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${metric.accuracy}%` }}
                      />
                    </div>
                    <span className="text-gray-600 block mt-1">Accuracy</span>
                  </div>
                  <div>
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 transition-all"
                        style={{
                          width: `${Math.min(100, (metric.throughput / 1000) * 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-gray-600 block mt-1">Throughput</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        {selectedMetric && (
          <div className="w-64 border-l border-gray-200 pl-4">
            <h4 className="font-bold text-lg mb-4 capitalize">
              {selectedMetric.name.replace('-', ' ')}
            </h4>

            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <span className="text-xs text-gray-600 block">Latency</span>
                <span className="text-xl font-bold text-blue-600">
                  {selectedMetric.latency.toFixed(2)}ms
                </span>
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <span className="text-xs text-gray-600 block">Accuracy</span>
                <span className="text-xl font-bold text-green-600">
                  {selectedMetric.accuracy.toFixed(1)}%
                </span>
              </div>

              <div className="bg-yellow-50 p-3 rounded-lg">
                <span className="text-xs text-gray-600 block">Throughput</span>
                <span className="text-xl font-bold text-yellow-600">
                  {selectedMetric.throughput.toFixed(0)}/sec
                </span>
              </div>

              <div className="bg-red-50 p-3 rounded-lg">
                <span className="text-xs text-gray-600 block">Error Rate</span>
                <span className="text-xl font-bold text-red-600">
                  {selectedMetric.errorRate.toFixed(1)}%
                </span>
              </div>

              <div className="bg-purple-50 p-3 rounded-lg">
                <span className="text-xs text-gray-600 block">Memory Usage</span>
                <span className="text-xl font-bold text-purple-600">
                  {selectedMetric.memoryUsage.toFixed(1)}MB
                </span>
              </div>

              <div className="bg-indigo-50 p-3 rounded-lg">
                <span className="text-xs text-gray-600 block">CPU Usage</span>
                <span className="text-xl font-bold text-indigo-600">
                  {selectedMetric.cpuUsage.toFixed(0)}%
                </span>
              </div>

              <div className={`p-3 rounded-lg text-center font-bold ${
                selectedMetric.isHealthy
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {selectedMetric.isHealthy ? '✓ Healthy' : '⚠ Degraded'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelemetryDashboard;
