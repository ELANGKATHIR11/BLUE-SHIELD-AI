/**
 * LAYER 3 — Risk Probability Model
 * 
 * Logistic Regression-based risk scoring using hand-tuned weights.
 * Calculates probability of a vessel crossing the IMBL boundary.
 * 
 * Input features:
 *   1. Distance to IMBL (meters) — normalized
 *   2. Rate of distance decrease (m/s) — how fast vessel approaches boundary
 *   3. Heading alignment toward boundary (0-1) — 1 = heading straight at boundary
 *   4. Speed (knots)
 *   5. Acceleration (change in speed)
 *   6. Trajectory intersection flag (0 or 1)
 * 
 * Output: risk probability between 0 and 1
 * 
 * NO external ML libraries. NO GPU. Pure math.
 */

import { GeoPoint, IMBL_LINE } from '../data/palkStraitBoundary';
import { distanceToIMBL, bearing, trajectoryIntersectsIMBL, type AlertLevel } from './geofence';
import type { PredictedPoint } from './kalmanFilter';

/** Risk assessment result */
export interface RiskAssessment {
  /** Risk probability from 0 to 1 */
  probability: number;
  /** Alert level derived from probability */
  alertLevel: AlertLevel;
  /** Individual feature contributions */
  features: RiskFeatures;
  /** Human-readable risk factors */
  riskFactors: string[];
}

/** Input features for the risk model */
export interface RiskFeatures {
  distanceToIMBL: number;
  distanceChangeRate: number;
  headingAlignment: number;
  speedKnots: number;
  acceleration: number;
  trajectoryIntersects: boolean;
}

/**
 * Hand-tuned logistic regression weights.
 * These weights determine how much each feature contributes to the risk score.
 * 
 * Positive weights = increases risk
 * Negative weights = decreases risk
 */
const WEIGHTS = {
  bias: -2.0,
  /** Closer to boundary = higher risk. Normalized by 10km reference distance. */
  distanceNormalized: -4.0,    // Negative because lower distance = higher risk (inverted in feature)
  /** Approaching faster = higher risk */
  approachRate: 3.0,
  /** Heading toward boundary = higher risk */
  headingAlignment: 2.5,
  /** Higher speed = moderately higher risk */
  speed: 1.0,
  /** Positive acceleration toward boundary = higher risk */
  acceleration: 1.5,
  /** Predicted trajectory intersects boundary = very high risk */
  trajectoryIntersection: 4.0,
};

/** Reference distance for normalization (10 km) */
const REFERENCE_DISTANCE_M = 10_000;

/** Maximum safe speed in knots for normalization */
const MAX_SPEED_KNOTS = 20;

/**
 * Sigmoid function: σ(x) = 1 / (1 + e^(-x))
 */
function sigmoid(x: number): number {
  // Clamp to avoid overflow
  const clamped = Math.max(-20, Math.min(20, x));
  return 1 / (1 + Math.exp(-clamped));
}

/**
 * Calculate the heading alignment toward the boundary.
 * Returns a value between 0 (heading away) and 1 (heading directly toward boundary).
 */
function calculateHeadingAlignment(
  position: GeoPoint,
  vesselHeading: number,
): number {
  // Find the bearing from the vessel to the nearest IMBL point
  // Use a simple approach: bearing to the closest segment midpoint
  const bearingToIMBL = calculateBearingToIMBL(position);
  
  // Angular difference between vessel heading and bearing to IMBL
  let diff = Math.abs(vesselHeading - bearingToIMBL);
  if (diff > 180) diff = 360 - diff;
  
  // 0° diff = heading straight at boundary (alignment = 1)
  // 180° diff = heading away (alignment = 0)
  return Math.max(0, 1 - diff / 180);
}

/**
 * Calculate bearing from vessel to the nearest IMBL segment.
 */
function calculateBearingToIMBL(position: GeoPoint): number {
  let minDist = Infinity;
  let nearestPoint: GeoPoint = IMBL_LINE[0];
  
  for (const imblPoint of IMBL_LINE) {
    const dx = imblPoint.lat - position.lat;
    const dy = imblPoint.lng - position.lng;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearestPoint = imblPoint;
    }
  }
  
  return bearing(position, nearestPoint);
}

/** State maintained between risk calculations */
interface RiskModelState {
  prevDistanceToIMBL: number;
  prevSpeed: number;
  prevTimestamp: number;
}

const vesselStates = new Map<string, RiskModelState>();

/**
 * Calculate risk probability for a vessel.
 * This is the primary function called after geofence check.
 * 
 * @param vesselId - Unique vessel identifier
 * @param position - Current vessel position
 * @param speedKnots - Current speed in knots
 * @param headingDeg - Current heading in degrees
 * @param predictedTrajectory - Predicted future positions from Kalman filter
 * @param timestamp - Current timestamp in ms
 */
export function calculateRisk(
  vesselId: string,
  position: GeoPoint,
  speedKnots: number,
  headingDeg: number,
  predictedTrajectory: PredictedPoint[],
  timestamp: number,
): RiskAssessment {
  // Get previous state for rate calculations
  const prevState = vesselStates.get(vesselId);
  
  // Calculate features
  const distToIMBL = distanceToIMBL(position);
  
  // Rate of distance decrease (m/s) — positive means approaching
  let distanceChangeRate = 0;
  if (prevState && prevState.prevTimestamp > 0) {
    const dt = Math.max(0.1, (timestamp - prevState.prevTimestamp) / 1000);
    distanceChangeRate = (prevState.prevDistanceToIMBL - distToIMBL) / dt; // positive = approaching
  }
  
  // Acceleration
  let acceleration = 0;
  if (prevState) {
    const dt = Math.max(0.1, (timestamp - prevState.prevTimestamp) / 1000);
    acceleration = (speedKnots - prevState.prevSpeed) / dt;
  }
  
  // Heading alignment
  const headingAlignment = calculateHeadingAlignment(position, headingDeg);
  
  // Trajectory intersection
  const trajectoryPoints: GeoPoint[] = predictedTrajectory.map(p => ({ lat: p.lat, lng: p.lng }));
  const trajectoryIntersects = trajectoryPoints.length > 0 && trajectoryIntersectsIMBL([position, ...trajectoryPoints]);
  
  // Save state for next calculation
  vesselStates.set(vesselId, {
    prevDistanceToIMBL: distToIMBL,
    prevSpeed: speedKnots,
    prevTimestamp: timestamp,
  });
  
  // === LOGISTIC REGRESSION ===
  
  // Normalize features
  const normalizedDistance = 1 - Math.min(1, distToIMBL / REFERENCE_DISTANCE_M); // 0 = far, 1 = at boundary
  const normalizedApproachRate = Math.max(0, Math.min(1, distanceChangeRate / 5)); // Clamp 0-1
  const normalizedSpeed = Math.min(1, speedKnots / MAX_SPEED_KNOTS);
  const normalizedAccel = Math.max(0, Math.min(1, acceleration / 5)); // Only positive accel
  
  // Compute logit (linear combination)
  const logit =
    WEIGHTS.bias +
    WEIGHTS.distanceNormalized * normalizedDistance +
    WEIGHTS.approachRate * normalizedApproachRate +
    WEIGHTS.headingAlignment * headingAlignment +
    WEIGHTS.speed * normalizedSpeed +
    WEIGHTS.acceleration * normalizedAccel +
    WEIGHTS.trajectoryIntersection * (trajectoryIntersects ? 1 : 0);
  
  // Apply sigmoid to get probability
  const probability = sigmoid(logit);
  
  // Determine alert level
  let alertLevel: AlertLevel;
  if (probability >= 0.8) {
    alertLevel = 'high_risk';
  } else if (probability >= 0.5) {
    alertLevel = 'advisory';
  } else {
    alertLevel = 'safe';
  }
  
  // Collect risk factors for explanation
  const riskFactors: string[] = [];
  if (normalizedDistance > 0.7) riskFactors.push(`Very close to IMBL (${Math.round(distToIMBL)}m)`);
  else if (normalizedDistance > 0.4) riskFactors.push(`Approaching IMBL (${Math.round(distToIMBL)}m away)`);
  if (distanceChangeRate > 1) riskFactors.push(`Approaching boundary at ${distanceChangeRate.toFixed(1)} m/s`);
  if (headingAlignment > 0.7) riskFactors.push('Heading directly toward boundary');
  if (speedKnots > 10) riskFactors.push(`High speed: ${speedKnots.toFixed(1)} knots`);
  if (trajectoryIntersects) riskFactors.push('Predicted trajectory crosses IMBL within 5 minutes');
  if (acceleration > 2) riskFactors.push('Accelerating toward boundary');
  if (riskFactors.length === 0) riskFactors.push('Operating within safe parameters');
  
  const features: RiskFeatures = {
    distanceToIMBL: distToIMBL,
    distanceChangeRate,
    headingAlignment,
    speedKnots,
    acceleration,
    trajectoryIntersects,
  };
  
  return {
    probability,
    alertLevel,
    features,
    riskFactors,
  };
}

/**
 * Reset the risk model state for a vessel.
 * Call when a vessel disconnects or is re-registered.
 */
export function resetRiskState(vesselId: string): void {
  vesselStates.delete(vesselId);
}
