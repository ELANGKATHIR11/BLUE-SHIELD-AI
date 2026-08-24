import test from 'node:test';
import assert from 'node:assert/strict';
import { locationService } from '../services/locationService.js';
import { geospatialService } from '../services/geospatialService.js';
import { alertService } from '../services/alertService.js';
import { vesselService } from '../services/vesselService.js';
import { mlService } from '../services/mlService.js';
import { eventStateMachine } from '../services/eventStateMachine.js';

test('1. Telemetry validation rejects impossible bounds and invalid types', () => {
  assert.throws(() => {
    locationService.validateTelemetry({ vesselId: 'V-001', lat: 95.0, lng: 80.0 });
  }, /coordinates out of physical planetary bounds/i);

  assert.throws(() => {
    locationService.validateTelemetry({ vesselId: 'V-001', lat: 9.0, lng: 195.0 });
  }, /coordinates out of physical planetary bounds/i);

  assert.throws(() => {
    locationService.validateTelemetry({ vesselId: 'V-001', lat: 9.0, lng: 79.0, speed: 85 });
  }, /unreasonable vessel speed/i);
});

test('2. Anti-spoofing rejects cross-vessel impersonation', () => {
  assert.throws(() => {
    locationService.validateTelemetry({ vesselId: 'SPOOFED-VESSEL', lat: 9.28, lng: 79.31 }, 'LEGIT-USER-VESSEL');
  }, /cross-vessel spoofing rejected/i);
});

test('3. Deterministic Polygon Geofence calculates SAFE vs APPROACHING vs WARNING vs VIOLATION', () => {
  // Deep in Indian waters
  const safeRes = geospatialService.evaluateLocation(9.2884, 79.1500, 5);
  assert.equal(safeRes.state, 'SAFE');
  assert.equal(safeRes.isViolation, false);

  // Sri Lankan Palk Strait Forbidden Polygon
  const violationRes = geospatialService.evaluateLocation(9.5000, 80.0000, 5);
  assert.equal(violationRes.state, 'VIOLATION');
  assert.equal(violationRes.isViolation, true);
  assert.equal(violationRes.severity, 'CRITICAL');
});

test('4. Stateful Event Machine handles entry, retention, and exit transitions', async () => {
  const vesselId = 'STATE-TEST-VESSEL';

  // 1. Enter warning
  const event1 = await eventStateMachine.processStateTransition(vesselId, {
    state: 'WARNING',
    severity: 'HIGH',
    zoneId: 'ZONE_SRI_LANKA_EEZ',
    distanceToBoundaryMeters: 800,
    message: 'Approaching boundary'
  }, { lat: 9.35, lng: 79.45 });

  assert.ok(event1);
  assert.equal(event1.state, 'WARNING');

  // 2. Return to safe (EXITED)
  const exitEvent = await eventStateMachine.processStateTransition(vesselId, {
    state: 'SAFE',
    severity: 'INFO',
    zoneId: 'ZONE_SRI_LANKA_EEZ',
    distanceToBoundaryMeters: 5000,
    message: 'Safe in territorial waters'
  }, { lat: 9.20, lng: 79.10 });

  assert.ok(exitEvent);
  assert.equal(exitEvent.state, 'EXITED');
  assert.equal(eventStateMachine.getActiveEvent(vesselId), null);
});

test('5. Alert Service deduplication test', async () => {
  const dummyEval = {
    alertLevel: 'high_risk',
    severity: 'HIGH',
    message: 'High risk near boundary',
    distanceToImblKm: 0.8,
    isViolation: false,
    zoneId: 'ZONE_SRI_LANKA_EEZ'
  };

  const vesselData = {
    aisId: 'TEST-AIS-999',
    boatId: 'TEST-BOAT-01',
    latitude: 9.35,
    longitude: 79.45
  };

  const alert1 = await alertService.processRiskAlert(dummyEval, vesselData);
  assert.ok(alert1);

  // Immediate subsequent alert should be deduplicated by cooldown window
  const alert2 = await alertService.processRiskAlert(dummyEval, vesselData);
  assert.equal(alert2.id, alert1.id);
});

test('6. ML service fallback when inference microservice is offline', async () => {
  const fallback = await mlService.predictTrajectory('VESSEL-TEST', 'AIS-TEST', [
    { lat: 9.2884, lng: 79.3129, timestamp: Date.now() }
  ]);

  assert.ok(fallback);
  assert.ok(fallback.trajectory.predictedPositions.length > 0);
  assert.equal(fallback.trajectory.method, 'linear_kinematic_fallback');
});
