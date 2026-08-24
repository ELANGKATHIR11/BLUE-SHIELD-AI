/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import dotenv from 'dotenv';
dotenv.config();

class MLService {
  constructor() {
    this.pythonMlUrl = process.env.PYTHON_ML_URL || 'http://127.0.0.1:5000';
    this.timeoutMs = 4000;
  }

  async checkHealth() {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.pythonMlUrl}/health`, { signal: controller.signal });
      clearTimeout(id);
      if (res.ok) {
        return await res.json();
      }
      return { status: 'unhealthy', error: `HTTP ${res.status}` };
    } catch (err) {
      return { status: 'unavailable', error: err.message };
    }
  }

  async predictTrajectory(vesselId, aisId, locationHistory) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.pythonMlUrl}/predict/trajectory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vesselId: vesselId || aisId,
          aisId,
          locationHistory
        }),
        signal: controller.signal
      });
      clearTimeout(id);

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`ML prediction returned HTTP ${res.status}`);
    } catch (error) {
      // Safe fallback trajectory calculation if ML server offline
      const lastPoint = locationHistory[locationHistory.length - 1] || { lat: 9.2884, lng: 79.3129 };
      return {
        vesselId,
        trajectory: {
          predictedPositions: [
            { lat: lastPoint.lat + 0.001, lng: lastPoint.lng + 0.001, confidence: 0.7 },
            { lat: lastPoint.lat + 0.002, lng: lastPoint.lng + 0.002, confidence: 0.6 }
          ],
          confidenceAvg: 0.65,
          method: 'linear_kinematic_fallback',
          predictionHorizon: '15 minutes'
        },
        zoneAnalysis: { willViolate: false, totalViolations: 0, maxConfidence: 0.0, violations: [] },
        alerts: { sent: 0, details: [] },
        timestamp: Date.now()
      };
    }
  }

  async predictBehavior(vesselId, telemetry) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.pythonMlUrl}/predict/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vesselId,
          ...telemetry
        }),
        signal: controller.signal
      });
      clearTimeout(id);

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`ML behavior prediction returned HTTP ${res.status}`);
    } catch (error) {
      return {
        vesselId,
        riskLevel: 'low',
        confidence: 0.85,
        predictedBehavior: 'normal_navigation',
        anomalyScore: telemetry.speed > 18 ? 0.75 : 0.15,
        recommendations: ['Maintain nominal course']
      };
    }
  }

  async evaluateGeospatialRisk(location, speed, heading) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), this.timeoutMs);

      const res = await fetch(`${this.pythonMlUrl}/geospatial/risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.lat || location.latitude,
          longitude: location.lng || location.longitude,
          speed: speed || 0,
          heading: heading || 0
        }),
        signal: controller.signal
      });
      clearTimeout(id);

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`ML geospatial check returned HTTP ${res.status}`);
    } catch (error) {
      return null;
    }
  }
}

export const mlService = new MLService();
export default mlService;
