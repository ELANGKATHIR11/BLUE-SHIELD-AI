/**
 * BREACH PREDICTION ENGINE — Enhanced Kalman Breach Probability
 * Extends Kalman filter predictions to calculate IMBL crossing probability
 * within next 2-4 hours, considering trajectory, speed, history, time-of-day
 */

import type { TrajectoryPrediction } from './kalmanFilter';
import { distanceToIMBL } from './geofence';
import type { GeoPoint } from '../data/palkStraitBoundary';

export interface BreachPrediction {
  breachProbability: number; // 0-1
  timeToBreachMinutes: number | null;
  predictedBreachPoint: GeoPoint | null;
  confidence: number; // 0-1
  riskFactors: string[];
}

export function predictBreach(
  trajectory: TrajectoryPrediction,
  currentPosition: GeoPoint,
  historicalBreaches: number = 0,
  currentHour: number
): BreachPrediction {
  if (!trajectory.predictedPoints.length) {
    return {
      breachProbability: 0,
      timeToBreachMinutes: null,
      predictedBreachPoint: null,
      confidence: 0.2,
      riskFactors: ['Insufficient trajectory data']
    };
  }

  const riskFactors: string[] = [];
  let breachScore = 0;
  let breachPoint: GeoPoint | null = null;
  let minTimeToBreachMs = Infinity;

  // Check if predicted trajectory intersects IMBL
  for (const pred of trajectory.predictedPoints) {
    const distToIMBL = distanceToIMBL({ lat: pred.lat, lng: pred.lng });
    if (distToIMBL < 500) {
      breachPoint = { lat: pred.lat, lng: pred.lng };
      minTimeToBreachMs = Math.min(minTimeToBreachMs, pred.timeOffsetMs);
    }
  }

  if (breachPoint) {
    breachScore += 0.6;
    riskFactors.push('⚠ Predicted trajectory crosses IMBL');
  }

  // Speed toward boundary
  if (trajectory.estimatedSpeedMps > 2) { // > 4 knots
    breachScore += 0.2;
    riskFactors.push('🚤 High-speed approach');
  }

  // Historical breach pattern
  if (historicalBreaches > 2) {
    const histWeight = 0.15 * Math.min(1, historicalBreaches / 5);
    breachScore += histWeight;
    riskFactors.push(`📊 Previous breach history: ${historicalBreaches} incidents`);
  }

  // Night fishing window (22:00–04:00)
  if (currentHour >= 22 || currentHour < 4) {
    breachScore += 0.1;
    riskFactors.push('🌙 Night fishing hour window');
  }

  // Proximity to boundary
  const currentDist = distanceToIMBL(currentPosition);
  if (currentDist < 2000) {
    const proximityScore = 0.2 * (1 - currentDist / 2000);
    breachScore += proximityScore;
    riskFactors.push(`📍 Close to boundary: ${(currentDist / 1000).toFixed(1)}km`);
  }

  // Superlinear scaling for dramatic risk increase near boundary
  const probability = Math.min(1, breachScore ** 1.2);
  const confidence = minTimeToBreachMs === Infinity
    ? 0.3
    : Math.min(1, trajectory.predictedPoints[0].confidence);

  return {
    breachProbability: probability,
    timeToBreachMinutes: minTimeToBreachMs === Infinity ? null : minTimeToBreachMs / 60000,
    predictedBreachPoint: breachPoint,
    confidence,
    riskFactors
  };
}
