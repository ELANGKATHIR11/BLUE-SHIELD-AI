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
import { locationRepository } from '../repositories/locationRepository.js';
import { vesselRepository } from '../repositories/vesselRepository.js';
import { geospatialService } from './geospatialService.js';
import { eventStateMachine } from './eventStateMachine.js';
import { query } from '../db/index.js';
import { auditRepository } from '../repositories/auditRepository.js';

class LocationService {
  constructor() {
    this.io = null;
    this.lastPacketTimestamps = new Map();
  }

  setSocketIO(io) {
    this.io = io;
  }

  /**
   * Validate physical bounds, timestamps, anti-spoofing and anti-replay
   */
  validateTelemetry(telemetry, authenticatedUserVesselId) {
    const {
      vesselId,
      aisId,
      lat,
      lng,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      timestamp,
      clientTimestamp,
      deviceId,
      source
    } = telemetry;

    const actualVesselId = vesselId || aisId;
    const actualLat = lat !== undefined ? lat : latitude;
    const actualLng = lng !== undefined ? lng : longitude;
    const actualTs = timestamp || clientTimestamp || Date.now();

    if (!actualVesselId) {
      throw new Error('Vessel identifier is required');
    }

    // Anti-spoofing check: If user is authenticated, ensure telemetry matches user vessel
    if (authenticatedUserVesselId && authenticatedUserVesselId !== actualVesselId) {
      throw new Error(`Cross-vessel spoofing rejected: Authenticated for ${authenticatedUserVesselId} but submitted ${actualVesselId}`);
    }

    if (actualLat === undefined || actualLng === undefined || isNaN(actualLat) || isNaN(actualLng)) {
      throw new Error('Geographic coordinates (latitude, longitude) are required and must be numeric');
    }

    if (actualLat < -90 || actualLat > 90 || actualLng < -180 || actualLng > 180) {
      throw new Error('Coordinates out of physical planetary bounds');
    }

    if (speed !== undefined && (speed < 0 || speed > 70)) {
      throw new Error('Unreasonable vessel speed exceeding physical threshold (>70 kts)');
    }

    if (heading !== undefined && (heading < 0 || heading > 360)) {
      throw new Error('Compass heading must be between 0 and 360 degrees');
    }

    // Anti-replay / out-of-order packet check
    const lastTs = this.lastPacketTimestamps.get(actualVesselId) || 0;
    if (actualTs < lastTs - 60000) {
      throw new Error('Stale or out-of-order telemetry packet rejected');
    }

    this.lastPacketTimestamps.set(actualVesselId, Math.max(lastTs, actualTs));

    return {
      vesselId: actualVesselId,
      deviceId: deviceId || 'browser-gps-client',
      latitude: Number(actualLat),
      longitude: Number(actualLng),
      accuracy: accuracy !== undefined ? Number(accuracy) : 5.0,
      altitude: altitude !== undefined ? Number(altitude) : 0,
      speed: speed !== undefined ? Number(speed) : 0,
      heading: heading !== undefined ? Number(heading) : 0,
      timestamp: actualTs,
      source: source || 'browser-gps'
    };
  }

  /**
   * Authoritative ingestion of GPS/AIS telemetry
   */
  async ingestLocation(rawTelemetry, userContext) {
    // 1. Validation & Anti-Spoofing
    const clean = this.validateTelemetry(rawTelemetry, userContext?.vesselId);

    // 2. Persist to PostgreSQL/PostGIS if configured
    await query(
      `INSERT INTO telemetry (vessel_id, device_id, source, location, latitude, longitude, accuracy, speed_knots, heading_degrees, client_timestamp)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $5, $4, $6, $7, $8, $9)`,
      [clean.vesselId, clean.deviceId, clean.source, clean.longitude, clean.latitude, clean.accuracy, clean.speed, clean.heading, clean.timestamp]
    ).catch(() => {});

    // 3. Persist to Firestore as secondary operational sync
    await locationRepository.recordLocation({
      vesselId: clean.vesselId,
      aisId: clean.vesselId,
      latitude: clean.latitude,
      longitude: clean.longitude,
      speed: clean.speed,
      heading: clean.heading,
      accuracy: clean.accuracy,
      source: clean.source,
      clientTimestamp: clean.timestamp
    });

    // 4. Update Vessel state
    const vessel = await vesselRepository.findByAisId(clean.vesselId);
    if (vessel) {
      await vesselRepository.createOrUpdate(clean.vesselId, {
        ...vessel,
        lastLocation: {
          lat: clean.latitude,
          lng: clean.longitude,
          speed: clean.speed,
          heading: clean.heading,
          accuracy: clean.accuracy,
          source: clean.source,
          timestamp: Date.now()
        }
      });
    }

    // 5. Deterministic Polygon Geofence Check
    const geoEvaluation = geospatialService.evaluateLocation(clean.latitude, clean.longitude, clean.accuracy);

    // 6. Process Stateful Event Machine Transition
    const event = await eventStateMachine.processStateTransition(
      clean.vesselId,
      geoEvaluation,
      { lat: clean.latitude, lng: clean.longitude, speed: clean.speed, heading: clean.heading }
    );

    // 7. Real-Time Socket.IO Broadcast
    if (this.io) {
      this.io.emit('vessel:location', {
        vesselId: clean.vesselId,
        aisId: clean.vesselId,
        boatId: vessel?.governmentBoatNumber || clean.vesselId,
        latitude: clean.latitude,
        longitude: clean.longitude,
        speed: clean.speed,
        heading: clean.heading,
        accuracy: clean.accuracy,
        source: clean.source,
        geofenceState: geoEvaluation.state,
        status: geoEvaluation.state === 'VIOLATION' ? 'danger' : (geoEvaluation.state === 'WARNING' || geoEvaluation.state === 'APPROACHING' ? 'warning' : 'safe'),
        distanceToBoundaryMeters: geoEvaluation.distanceToBoundaryMeters,
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      vesselId: clean.vesselId,
      geofenceState: geoEvaluation.state,
      severity: geoEvaluation.severity,
      distanceToBoundaryMeters: geoEvaluation.distanceToBoundaryMeters,
      message: geoEvaluation.message,
      eventTriggered: !!event,
      position: { lat: clean.latitude, lng: clean.longitude },
      source: clean.source,
      timestamp: Date.now()
    };
  }
}

export const locationService = new LocationService();
export default locationService;
