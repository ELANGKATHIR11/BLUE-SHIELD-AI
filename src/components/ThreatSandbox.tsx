/**
 * THREAT SANDBOX — Interactive testing environment for threat detection
 * Allows operators to create synthetic anomalies and validate detector accuracy
 */

import React, { useState, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { detectAnomalies } from '../engines/anomalyDetector';
import type { BoatData } from '../App';

interface TestCase {
  id: string;
  name: string;
  description: string;
  scenario: 'zigzag' | 'loitering' | 'speed_spike' | 'night_fishing' | 'rapid_approach';
  expectedResult: 'anomaly' | 'normal';
}

const TEST_CASES: TestCase[] = [
  {
    id: '1',
    name: 'Zigzag Pattern',
    description: 'Vessel making rapid course changes (evasive maneuver)',
    scenario: 'zigzag',
    expectedResult: 'anomaly'
  },
  {
    id: '2',
    name: 'Loitering',
    description: 'Vessel stationary > 30 min in warning zone',
    scenario: 'loitering',
    expectedResult: 'anomaly'
  },
  {
    id: '3',
    name: 'Speed Spike',
    description: 'Sudden velocity increase (>10 knots/min)',
    scenario: 'speed_spike',
    expectedResult: 'anomaly'
  },
  {
    id: '4',
    name: 'Night Fishing',
    description: 'Vessel fishing between 20:00-04:00 in IMBL',
    scenario: 'night_fishing',
    expectedResult: 'anomaly'
  },
  {
    id: '5',
    name: 'Rapid Approach',
    description: 'Vessel approaching Coast Guard vessel at high speed',
    scenario: 'rapid_approach',
    expectedResult: 'anomaly'
  }
];

interface TestResult {
  testId: string;
  testName: string;
  timestamp: number;
  passed: boolean;
  detected: boolean;
  confidence: number;
  anomalyScores: Record<string, number>;
  details: string;
}

const ThreatSandbox: React.FC = () => {
  const [selectedTest, setSelectedTest] = useState<string>('1');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [detailedResults, setDetailedResults] = useState<string>('');

  const createTestVessel = (scenario: TestCase['scenario']): BoatData => {
    const baseVessel: BoatData = {
      aisId: 'TEST-VESSEL-001',
      boatId: 'TEST-001',
      location: { lat: 12.5, lng: 80.0, timestamp: Date.now() },
      status: 'safe',
      speed: 5,
      heading: 180,
      lastUpdate: Date.now()
    };

    // Modify vessel based on scenario
    switch (scenario) {
      case 'zigzag':
        return {
          ...baseVessel,
          heading: Math.random() * 360,
          speed: 8
        };

      case 'loitering':
        return {
          ...baseVessel,
          speed: 0.1,
          location: { ...baseVessel.location, lat: 12.45, lng: 79.9 } // Warning zone
        };

      case 'speed_spike':
        return {
          ...baseVessel,
          speed: 25 // Excessive speed
        };

      case 'night_fishing':
        return {
          ...baseVessel,
          speed: 2,
          heading: 0,
          location: { ...baseVessel.location, lat: 12.4, lng: 79.95 } // IMBL area
        };

      case 'rapid_approach':
        return {
          ...baseVessel,
          speed: 20,
          heading: 90, // Closing distance
          location: { ...baseVessel.location, lat: 12.5, lng: 79.8 }
        };

      default:
        return baseVessel;
    }
  };

  const runTest = useCallback(async () => {
    setIsRunning(true);
    setDetailedResults('Running test...');

    try {
      const testCase = TEST_CASES.find(t => t.id === selectedTest);
      if (!testCase) return;

      // Create test vessel
      const testVessel = createTestVessel(testCase.scenario);

      // Run anomaly detector
      const anomalyState = detectAnomalies(
        testVessel.aisId,
        testVessel.heading,
        testVessel.speed,
        testCase.scenario === 'rapid_approach' ? 2 : 10,
        Date.now(),
        testCase.scenario === 'loitering' || testCase.scenario === 'night_fishing'
      );

      const detected = anomalyState.lastAnomalies.length > 0;
      const passed = detected === (testCase.expectedResult === 'anomaly');
      
      const anomalyScores: Record<string, number> = {};
      const maxConfidence = anomalyState.anomalyScore / 100;

      anomalyState.lastAnomalies.forEach(a => {
        anomalyScores[a.type] = a.severity === 'high' ? 0.9 : a.severity === 'medium' ? 0.6 : 0.3;
      });

      const result: TestResult = {
        testId: testCase.id,
        testName: testCase.name,
        timestamp: Date.now(),
        passed,
        detected,
        confidence: maxConfidence,
        anomalyScores,
        details: `${passed ? '✓ PASS' : '✗ FAIL'}: ${testCase.name} - ${testCase.description}`
      };

      setResults(prev => [result, ...prev].slice(0, 20));

      // Generate detailed report
      const report = `
TEST: ${testCase.name}
SCENARIO: ${testCase.scenario}
EXPECTED: ${testCase.expectedResult === 'anomaly' ? 'Anomaly Detected' : 'Normal'}
ACTUAL: ${detected ? 'Anomaly Detected' : 'Normal'}
RESULT: ${passed ? '✓ PASSED' : '✗ FAILED'}
SCORE: ${anomalyState.anomalyScore}/100

Detected Anomalies:
${
  anomalyState.lastAnomalies.length > 0
    ? anomalyState.lastAnomalies
        .map(
          (a) =>
            `  - ${a.type} (${a.severity}): ${a.message}`
        )
        .join('\n')
    : '  (none)'
}

Vessel Configuration:
  - Speed: ${testVessel.speed} knots
  - Heading: ${testVessel.heading}°
  - Latitude: ${testVessel.location.lat}°
  - Longitude: ${testVessel.location.lng}°
  - Zone: ${testCase.scenario === 'loitering' || testCase.scenario === 'night_fishing' ? 'Warning Zone' : 'Safe Zone'}
      `.trim();

      setDetailedResults(report);
    } catch (error) {
      setDetailedResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedTest]);

  const passRate = results.length > 0
    ? ((results.filter(r => r.passed).length / results.length) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-white" />
            <h3 className="text-white font-bold text-lg">Threat Detection Sandbox</h3>
            <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-white text-xs font-bold">
              Pass Rate: {passRate}%
            </span>
          </div>
          {results.length > 0 && (
            <button
              onClick={() => setResults([])}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded transition-all flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 overflow-hidden flex gap-4">
        {/* Test Cases */}
        <div className="w-80 border-r border-gray-200 overflow-y-auto">
          <h4 className="font-bold text-sm mb-3 text-gray-700">Test Cases</h4>
          <div className="space-y-2">
            {TEST_CASES.map(testCase => (
              <button
                key={testCase.id}
                onClick={() => setSelectedTest(testCase.id)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  selectedTest === testCase.id
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-bold text-sm">{testCase.name}</span>
                  <span className="text-xs font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                    #{testCase.id}
                  </span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {testCase.description}
                </p>
                <span className="inline-block mt-2 text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-semibold">
                  {testCase.scenario.replace('_', ' ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 flex flex-col">
          {/* Run Button */}
          <button
            onClick={runTest}
            disabled={isRunning}
            className="mb-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-all"
          >
            <Play className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running Test...' : 'Run Test'}
          </button>

          {/* Results Display */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Detailed Output */}
            <div className="flex-1 bg-gray-900 rounded-lg p-4 font-mono text-sm text-green-400 overflow-y-auto mb-4 border border-gray-800">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {detailedResults || 'Click "Run Test" to execute...'}
              </pre>
            </div>

            {/* Test History */}
            {results.length > 0 && (
              <div>
                <h4 className="font-bold text-sm mb-2 text-gray-700">Test History</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.map(result => (
                    <div
                      key={`${result.testId}-${result.timestamp}`}
                      className={`flex items-center gap-2 p-2 rounded text-xs ${
                        result.passed
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {result.passed ? (
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate">{result.testName}</span>
                      <span className="font-bold">
                        {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatSandbox;
