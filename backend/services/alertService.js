/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { alertRepository } from '../repositories/alertRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';

class AlertService {
  constructor() {
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Process geofence or AI risk evaluation and trigger alert with cooldown deduplication
   */
  async processRiskAlert(evaluationResult, vesselData) {
    const { aisId, boatId } = vesselData;
    const { alertLevel, riskScore, message, distanceToImblKm, isViolation } = evaluationResult;

    if (alertLevel === 'safe') return null;

    const alertType = isViolation ? 'ZONE_ENTRY' : (alertLevel === 'high_risk' ? 'ZONE_APPROACH' : 'AI_RISK');
    const severity = isViolation ? 'CRITICAL' : (alertLevel === 'high_risk' ? 'HIGH' : 'MEDIUM');

    // 1. Check cooldown (do not spam alerts for every 1-second GPS tick)
    const cooldownMs = isViolation ? 30000 : 90000; // 30s for critical, 90s for warnings
    const existing = await alertRepository.getRecentAlertForVesselAndType(aisId, alertType, cooldownMs);
    if (existing) {
      return existing;
    }

    // 2. Persist new alert to Firestore
    const alert = await alertRepository.create({
      vesselId: aisId,
      aisId,
      type: alertType,
      severity,
      message,
      latitude: vesselData.latitude || vesselData.lat,
      longitude: vesselData.longitude || vesselData.lng,
      zoneId: isViolation ? 'SRI_LANKA_EEZ' : 'IMBL_BUFFER',
      source: 'GEOSPATIAL_AI_ENGINE'
    });

    // 3. Emit real-time Socket.IO event to dashboards
    if (this.io) {
      this.io.emit('alert:new', alert);
      this.io.to(`vessel:${aisId}`).emit('alert:vessel', alert);
    }

    // 4. Audit log high/critical threats
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      await auditRepository.log({
        action: 'CRITICAL_BORDER_ALERT_TRIGGERED',
        actor: 'SYSTEM_GEOSPATIAL',
        targetId: aisId,
        details: { boatId, alertType, riskScore, distanceToImblKm }
      });
    }

    return alert;
  }

  async acknowledgeAlert(alertId, acknowledgedBy) {
    await alertRepository.acknowledge(alertId, acknowledgedBy);
    if (this.io) {
      this.io.emit('alert:updated', { alertId, acknowledged: true, acknowledgedBy });
    }
  }

  async getUnacknowledgedAlerts(severity) {
    return await alertRepository.getUnacknowledged(severity);
  }

  async getVesselAlerts(aisId) {
    return await alertRepository.getVesselAlerts(aisId);
  }
}

export const alertService = new AlertService();
export default alertService;
