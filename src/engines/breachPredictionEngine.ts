/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import type { TrajectoryPrediction } from './kalmanFilter';
import type { GeofenceResult } from './geofence';

export interface UncertaintyCorridor {
  upperBoundLat: number;
  upperBoundLng: number;
  lowerBoundLat: number;
  lowerBoundLng: number;
  corridorWidthMeters: number;
}

export interface BreachPrediction {
  breachProbability: number;
  timeToBreachMinutes: number | null;
  predictedBreachPoint: { lat: number; lng: number } | null;
  confidence: number;
  uncertaintyCorridor: UncertaintyCorridor[];
  riskFactors: string[];
  explanation: {
    fact: string;
    inference: string[];
  };
}

export function predictBreach(
  currentLocation: { lat: number; lng: number; timestamp: number },
  currentSpeedKnots: number,
  currentHeadingDeg: number,
  trajectory: TrajectoryPrediction,
  geofenceResult: GeofenceResult
): BreachPrediction {
  const currentDist = geofenceResult.distanceToIMBL;
  let breachScore = 0;
  const riskFactors: string[] = [];
  const inference: string[] = [];
  let minTimeToBreachMs = Infinity;
  let breachPoint: { lat: number; lng: number } | null = null;

  // 1. Evaluate Trajectory Points against boundary
  for (const pt of trajectory.predictedPoints) {
    if (pt.isViolation) {
      if (pt.timeOffsetMs < minTimeToBreachMs) {
        minTimeToBreachMs = pt.timeOffsetMs;
        breachPoint = { lat: pt.lat, lng: pt.lng };
      }
      breachScore += 0.4;
      riskFactors.push(`🚨 Projected breach in ${(pt.timeOffsetMs / 60000).toFixed(0)} min`);
      break;
    }
  }

  // 2. High-Speed Vectors toward boundary
  if (currentSpeedKnots > 10 && geofenceResult.alertLevel !== 'safe') {
    breachScore += 0.25;
    riskFactors.push(`⚡ High speed vector: ${currentSpeedKnots.toFixed(1)} kts`);
    inference.push('Fast approach velocity toward restricted buffer');
  }

  // 3. Proximity to boundary
  if (currentDist < 2000) {
    const proximityScore = 0.2 * (1 - currentDist / 2000);
    breachScore += proximityScore;
    riskFactors.push(`📍 Close to boundary: ${(currentDist / 1000).toFixed(1)}km`);
  }

  // 4. Night fishing window
  const currentHour = new Date(currentLocation.timestamp).getHours();
  if (currentHour >= 22 || currentHour < 4) {
    breachScore += 0.1;
    riskFactors.push('🌙 Night fishing hour window');
    inference.push('Operation during reduced visibility hours');
  }

  // 5. Construct Uncertainty Corridor
  const uncertaintyCorridor: UncertaintyCorridor[] = trajectory.predictedPoints.map((pt) => {
    const timeMin = pt.timeOffsetMs / 60000;
    const corridorWidthMeters = 50 + timeMin * 35;
    const deltaLat = (corridorWidthMeters / 111320);
    const deltaLng = (corridorWidthMeters / (111320 * Math.cos((pt.lat * Math.PI) / 180)));

    return {
      upperBoundLat: pt.lat + deltaLat,
      upperBoundLng: pt.lng + deltaLng,
      lowerBoundLat: pt.lat - deltaLat,
      lowerBoundLng: pt.lng - deltaLng,
      corridorWidthMeters,
    };
  });

  const probability = Math.min(1, breachScore ** 1.2);
  const confidence = minTimeToBreachMs === Infinity
    ? 0.3
    : Math.min(1, trajectory.predictedPoints[0]?.confidence || 0.5);

  const fact = breachPoint
    ? `Trajectory intersects boundary in ${(minTimeToBreachMs / 60000).toFixed(0)} min`
    : `Operating ${(currentDist / 1000).toFixed(2)} km from boundary`;

  return {
    breachProbability: probability,
    timeToBreachMinutes: minTimeToBreachMs === Infinity ? null : minTimeToBreachMs / 60000,
    predictedBreachPoint: breachPoint,
    confidence,
    uncertaintyCorridor,
    riskFactors,
    explanation: {
      fact,
      inference,
    },
  };
}
