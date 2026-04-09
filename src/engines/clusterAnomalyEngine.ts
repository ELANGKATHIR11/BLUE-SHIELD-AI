/**
 * CLUSTER ANOMALY ENGINE — Fleet Behavior Outlier Detection
 * Detects vessels exhibiting anomalous behavior relative to their cluster group
 * Identifies suspicious patterns that differ from normal fleet operations
 */

import type { BoatData } from '../App';
import type { VesselCluster } from './clusterEngine';

export interface ClusterAnomalyResult {
  vesselId: string;
  clusterId: number;
  anomalyScore: number; // 0-100
  severity: 'normal' | 'warning' | 'alert';
  deviations: string[];
}

interface ClusterStats {
  avgSpeed: number;
  avgHeading: number;
  speedStdDev: number;
  headingStdDev: number;
  vesselCount: number;
}

export function detectClusterAnomalies(
  vessels: BoatData[],
  clusters: VesselCluster[]
): ClusterAnomalyResult[] {
  const clusterMap = new Map<number, BoatData[]>();

  // Group vessels by cluster
  for (const cluster of clusters) {
    const clusterVessels = vessels.filter(v => cluster.vesselIds.includes(v.aisId));
    clusterMap.set(cluster.id, clusterVessels);
  }

  // Outliers (vesselId with clusterId = -1)
  const outliers = vessels.filter(v => !clusters.some(c => c.vesselIds.includes(v.aisId)));
  
  const results: ClusterAnomalyResult[] = [];

  // Analyze each cluster
  for (const [clusterId, clusterVessels] of clusterMap) {
    if (clusterVessels.length < 2) continue;

    const stats = calculateClusterStats(clusterVessels);

    for (const vessel of clusterVessels) {
      const { score, deviations } = calculateVesselAnomalyScore(vessel, stats);
      const severity: 'normal' | 'warning' | 'alert' =
        score > 75 ? 'alert' : score > 50 ? 'warning' : 'normal';

      results.push({
        vesselId: vessel.aisId,
        clusterId,
        anomalyScore: score,
        severity,
        deviations
      });
    }
  }

  // Outliers are always suspicious
  for (const vessel of outliers) {
    results.push({
      vesselId: vessel.aisId,
      clusterId: -1,
      anomalyScore: 65,
      severity: 'warning',
      deviations: ['Operates outside main clusters', 'Isolated vessel behavior']
    });
  }

  return results;
}

function calculateClusterStats(vessels: BoatData[]): ClusterStats {
  const speeds = vessels.map(v => v.speed);
  const headings = vessels.map(v => v.heading);

  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const avgHeading = calculateMeanHeading(headings);

  const speedVariance = speeds.reduce((sum, s) => sum + (s - avgSpeed) ** 2, 0) / speeds.length;
  const speedStdDev = Math.sqrt(speedVariance);

  const headingVariance = headings.reduce((sum, h) => {
    const diff = Math.abs(h - avgHeading);
    return sum + (diff > 180 ? (360 - diff) ** 2 : diff ** 2);
  }, 0) / headings.length;
  const headingStdDev = Math.sqrt(headingVariance);

  return {
    avgSpeed,
    avgHeading,
    speedStdDev: Math.max(0.1, speedStdDev),
    headingStdDev: Math.max(1, headingStdDev),
    vesselCount: vessels.length
  };
}

function calculateVesselAnomalyScore(
  vessel: BoatData,
  stats: ClusterStats
): { score: number; deviations: string[] } {
  let score = 0;
  const deviations: string[] = [];

  // Speed deviation
  const speedZScore = Math.abs(vessel.speed - stats.avgSpeed) / stats.speedStdDev;
  if (speedZScore > 2.5) {
    score += 25 * Math.min(1, speedZScore / 5);
    if (vessel.speed > stats.avgSpeed + 2 * stats.speedStdDev) {
      deviations.push(`Much faster than cluster (${vessel.speed.toFixed(1)} vs ${stats.avgSpeed.toFixed(1)} kn)`);
    } else {
      deviations.push(`Much slower than cluster`);
    }
  }

  // Heading deviation
  const headingDiff = Math.abs(vessel.heading - stats.avgHeading);
  const normalizedHeadingDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
  const headingZScore = normalizedHeadingDiff / stats.headingStdDev;
  
  if (headingZScore > 2.5) {
    score += 20 * Math.min(1, headingZScore / 4);
    deviations.push(`Different heading: ${vessel.heading}° vs fleet ${Math.round(stats.avgHeading)}°`);
  }

  // Status deviation
  if (vessel.status !== 'safe') {
    score += 15;
    deviations.push(`Status anomaly: ${vessel.status.toUpperCase()}`);
  }

  // High-risk status always elevated
  if (vessel.status === 'danger') {
    score += 25;
  }

  return {
    score: Math.min(100, Math.round(score)),
    deviations
  };
}

function calculateMeanHeading(headings: number[]): number {
  const sinSum = headings.reduce((s, h) => s + Math.sin((h * Math.PI) / 180), 0);
  const cosSum = headings.reduce((s, h) => s + Math.cos((h * Math.PI) / 180), 0);
  const meanAngle = Math.atan2(sinSum, cosSum);
  return ((meanAngle * 180) / Math.PI + 360) % 360;
}
