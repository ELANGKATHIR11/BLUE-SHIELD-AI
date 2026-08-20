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
/**
 * LAYER 2 — Kalman Filter Trajectory Prediction Engine
 * 
 * Pure JavaScript 1-D Kalman Filter applied independently to latitude and longitude.
 * Predicts vessel position 1, 3, and 5 minutes into the future.
 * 
 * State vector: [position, velocity]
 * Uses a constant-velocity motion model.
 * Maintains a rolling buffer of the last 20 GPS points.
 * 
 * NO external ML libraries. NO GPU. Pure math.
 */

import { GeoPoint } from '../data/palkStraitBoundary';

/** A timestamped GPS point */
export interface TimestampedPoint {
  lat: number;
  lng: number;
  timestamp: number; // Unix ms
}

/** A predicted future position with time offset */
export interface PredictedPoint {
  lat: number;
  lng: number;
  timeOffsetMs: number;
  /** Confidence decreases with distance in time */
  confidence: number;
}

/** Full trajectory prediction result */
export interface TrajectoryPrediction {
  /** Array of predicted future points */
  predictedPoints: PredictedPoint[];
  /** Current estimated velocity in m/s */
  estimatedSpeedMps: number;
  /** Current estimated heading in degrees */
  estimatedHeading: number;
  /** Whether the prediction is considered stable */
  isStable: boolean;
  /** If unstable, the linear fallback was used */
  usedFallback: boolean;
}

/**
 * 1-D Kalman Filter for position + velocity estimation
 */
class KalmanFilter1D {
  // State: [position, velocity]
  private x: number; // position estimate
  private v: number; // velocity estimate

  // Covariance matrix (2x2 stored as 4 values)
  private p00: number;
  private p01: number;
  private p10: number;
  private p11: number;

  // Process noise
  private readonly qPos: number;
  private readonly qVel: number;

  // Measurement noise
  private readonly r: number;

  private initialized = false;

  constructor(processNoise = 0.00001, measurementNoise = 0.0001) {
    this.x = 0;
    this.v = 0;
    this.p00 = 1;
    this.p01 = 0;
    this.p10 = 0;
    this.p11 = 1;
    this.qPos = processNoise;
    this.qVel = processNoise * 10;
    this.r = measurementNoise;
  }

  /**
   * Predict step: project state forward by dt seconds
   */
  predict(dt: number): void {
    // State prediction: x = x + v*dt
    this.x = this.x + this.v * dt;
    // Velocity stays: v = v (constant velocity model)

    // Covariance prediction: P = F*P*F' + Q
    const newP00 = this.p00 + dt * (this.p10 + this.p01) + dt * dt * this.p11 + this.qPos;
    const newP01 = this.p01 + dt * this.p11;
    const newP10 = this.p10 + dt * this.p11;
    const newP11 = this.p11 + this.qVel;

    this.p00 = newP00;
    this.p01 = newP01;
    this.p10 = newP10;
    this.p11 = newP11;
  }

  /**
   * Update step: incorporate a new measurement
   */
  update(measurement: number): void {
    if (!this.initialized) {
      this.x = measurement;
      this.v = 0;
      this.initialized = true;
      return;
    }

    // Innovation
    const y = measurement - this.x;

    // Innovation covariance
    const s = this.p00 + this.r;

    // Kalman gain
    const k0 = this.p00 / s;
    const k1 = this.p10 / s;

    // State update
    this.x = this.x + k0 * y;
    this.v = this.v + k1 * y;

    // Covariance update
    const newP00 = this.p00 - k0 * this.p00;
    const newP01 = this.p01 - k0 * this.p01;
    const newP10 = this.p10 - k1 * this.p00;
    const newP11 = this.p11 - k1 * this.p01;

    this.p00 = newP00;
    this.p01 = newP01;
    this.p10 = newP10;
    this.p11 = newP11;
  }

  /** Get current position estimate */
  getPosition(): number {
    return this.x;
  }

  /** Get current velocity estimate */
  getVelocity(): number {
    return this.v;
  }

  /** Get position variance (uncertainty) */
  getVariance(): number {
    return this.p00;
  }

  /** Check if filter is initialized */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Check if the filter has exploded (covariance too large) */
  isUnstable(): boolean {
    return this.p00 > 10 || this.p11 > 10 || !isFinite(this.p00) || !isFinite(this.x);
  }

  /** Reset the filter */
  reset(): void {
    this.x = 0;
    this.v = 0;
    this.p00 = 1;
    this.p01 = 0;
    this.p10 = 0;
    this.p11 = 1;
    this.initialized = false;
  }
}

/**
 * VesselTracker — maintains Kalman filters and GPS history for one vessel
 */
export class VesselTracker {
  private latFilter: KalmanFilter1D;
  private lngFilter: KalmanFilter1D;
  private history: TimestampedPoint[] = [];
  private lastTimestamp = 0;

  private readonly maxHistorySize = 20;
  /** Prediction intervals in milliseconds */
  private readonly predictionIntervals = [60_000, 180_000, 300_000]; // 1, 3, 5 min

  constructor() {
    this.latFilter = new KalmanFilter1D(0.000001, 0.00005);
    this.lngFilter = new KalmanFilter1D(0.000001, 0.00005);
  }

  /**
   * Feed a new GPS measurement into the tracker.
   * Should be called on every location update.
   */
  addMeasurement(point: TimestampedPoint): void {
    // Calculate dt in seconds
    const dt = this.lastTimestamp > 0
      ? Math.max(0.1, (point.timestamp - this.lastTimestamp) / 1000)
      : 1;

    // Clamp dt to avoid extreme values
    const clampedDt = Math.min(dt, 60);

    if (this.latFilter.isInitialized()) {
      this.latFilter.predict(clampedDt);
      this.lngFilter.predict(clampedDt);
    }

    this.latFilter.update(point.lat);
    this.lngFilter.update(point.lng);

    this.lastTimestamp = point.timestamp;

    // Add to history (rolling buffer)
    this.history.push(point);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Predict future vessel positions using Kalman state.
   * Falls back to linear extrapolation if Kalman is unstable.
   */
  predictTrajectory(): TrajectoryPrediction {
    const isUnstable = this.latFilter.isUnstable() || this.lngFilter.isUnstable();

    if (!this.latFilter.isInitialized() || this.history.length < 3) {
      return {
        predictedPoints: [],
        estimatedSpeedMps: 0,
        estimatedHeading: 0,
        isStable: false,
        usedFallback: false,
      };
    }

    // If Kalman is unstable, use linear fallback
    if (isUnstable) {
      return this.linearFallback();
    }

    return this.kalmanPredict();
  }

  /**
   * Kalman-based prediction
   */
  private kalmanPredict(): TrajectoryPrediction {
    const currentLat = this.latFilter.getPosition();
    const currentLng = this.lngFilter.getPosition();
    const vLat = this.latFilter.getVelocity(); // deg/s
    const vLng = this.lngFilter.getVelocity(); // deg/s

    const predictedPoints: PredictedPoint[] = this.predictionIntervals.map((intervalMs, idx) => {
      const dt = intervalMs / 1000; // seconds
      return {
        lat: currentLat + vLat * dt,
        lng: currentLng + vLng * dt,
        timeOffsetMs: intervalMs,
        confidence: Math.max(0.3, 1 - idx * 0.25), // 1.0, 0.75, 0.5
      };
    });

    // Calculate speed in m/s (approximate using Haversine)
    const speedMps = this.calculateSpeed(vLat, vLng, currentLat);
    const heading = this.calculateHeading(vLat, vLng);

    return {
      predictedPoints,
      estimatedSpeedMps: speedMps,
      estimatedHeading: heading,
      isStable: true,
      usedFallback: false,
    };
  }

  /**
   * Linear extrapolation fallback when Kalman is unstable
   */
  private linearFallback(): TrajectoryPrediction {
    if (this.history.length < 2) {
      return {
        predictedPoints: [],
        estimatedSpeedMps: 0,
        estimatedHeading: 0,
        isStable: false,
        usedFallback: true,
      };
    }

    // Use last two points for linear extrapolation
    const p1 = this.history[this.history.length - 2];
    const p2 = this.history[this.history.length - 1];
    const dt = Math.max(0.1, (p2.timestamp - p1.timestamp) / 1000);

    const vLat = (p2.lat - p1.lat) / dt;
    const vLng = (p2.lng - p1.lng) / dt;

    const predictedPoints: PredictedPoint[] = this.predictionIntervals.map((intervalMs, idx) => {
      const dtFuture = intervalMs / 1000;
      return {
        lat: p2.lat + vLat * dtFuture,
        lng: p2.lng + vLng * dtFuture,
        timeOffsetMs: intervalMs,
        confidence: Math.max(0.2, 0.7 - idx * 0.2),
      };
    });

    const speedMps = this.calculateSpeed(vLat, vLng, p2.lat);
    const heading = this.calculateHeading(vLat, vLng);

    // Reset Kalman filters since they're unstable
    this.latFilter.reset();
    this.lngFilter.reset();

    return {
      predictedPoints,
      estimatedSpeedMps: speedMps,
      estimatedHeading: heading,
      isStable: false,
      usedFallback: true,
    };
  }

  /**
   * Convert degree/s velocity to m/s speed
   */
  private calculateSpeed(vLat: number, vLng: number, lat: number): number {
    const metersPerDegreeLat = 111_320;
    const metersPerDegreeLng = 111_320 * Math.cos(lat * Math.PI / 180);

    const vyMs = vLat * metersPerDegreeLat;
    const vxMs = vLng * metersPerDegreeLng;

    return Math.sqrt(vxMs * vxMs + vyMs * vyMs);
  }

  /**
   * Calculate heading from velocity components
   */
  private calculateHeading(vLat: number, vLng: number): number {
    if (vLat === 0 && vLng === 0) return 0;
    const heading = Math.atan2(vLng, vLat) * (180 / Math.PI);
    return (heading + 360) % 360;
  }

  /**
   * Get the GPS history as GeoPoints
   */
  getTrajectoryHistory(): GeoPoint[] {
    return this.history.map(p => ({ lat: p.lat, lng: p.lng }));
  }

  /**
   * Get the current filtered position
   */
  getCurrentPosition(): GeoPoint | null {
    if (!this.latFilter.isInitialized()) return null;
    return {
      lat: this.latFilter.getPosition(),
      lng: this.lngFilter.getPosition(),
    };
  }

  /**
   * Get estimated speed in knots
   */
  getSpeedKnots(): number {
    return this.predictTrajectory().estimatedSpeedMps * 1.94384; // m/s to knots
  }

  /**
   * Get history length
   */
  getHistoryLength(): number {
    return this.history.length;
  }
}
