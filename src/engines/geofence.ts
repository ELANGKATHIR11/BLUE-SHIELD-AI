/**
 * LAYER 1 — Deterministic Geofence Engine
 * 
 * Pure JavaScript implementations for maritime boundary detection.
 * NO AI. NO ML. Pure mathematics.
 * 
 * - Ray-casting point-in-polygon
 * - Haversine distance (meters)
 * - Minimum distance to polygon edge
 * - Line-segment intersection for trajectory-boundary crossing
 */

import { GeoPoint, FORBIDDEN_ZONE, WARNING_ZONE, IMBL_LINE } from '../data/palkStraitBoundary';

const EARTH_RADIUS_METERS = 6_371_000; // Mean Earth radius

/** Convert degrees to radians */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Haversine distance between two WGS84 coordinates.
 * Returns distance in meters.
 */
export function haversineDistance(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Bearing from point A to point B in degrees (0–360).
 */
export function bearing(a: GeoPoint, b: GeoPoint): number {
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
            Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(dLng);
  const brng = Math.atan2(y, x);
  return (brng * 180 / Math.PI + 360) % 360;
}

/**
 * Ray-casting algorithm for point-in-polygon test.
 * Returns true if the point is inside the polygon.
 * Works with any simple (non-self-intersecting) polygon.
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i];
    const pj = polygon[j];

    if (
      ((pi.lat > point.lat) !== (pj.lat > point.lat)) &&
      (point.lng < (pj.lng - pi.lng) * (point.lat - pi.lat) / (pj.lat - pi.lat) + pi.lng)
    ) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Minimum distance from a point to a line segment (A→B).
 * Uses perpendicular distance if projection falls on segment,
 * otherwise returns distance to nearest endpoint.
 * Returns distance in meters.
 */
function distanceToSegment(point: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const ab = haversineDistance(a, b);
  if (ab === 0) return haversineDistance(point, a);

  // Project point onto line segment using parametric form
  const ap_lat = point.lat - a.lat;
  const ap_lng = point.lng - a.lng;
  const ab_lat = b.lat - a.lat;
  const ab_lng = b.lng - a.lng;

  let t = (ap_lat * ab_lat + ap_lng * ab_lng) / (ab_lat * ab_lat + ab_lng * ab_lng);
  t = Math.max(0, Math.min(1, t));

  const projection: GeoPoint = {
    lat: a.lat + t * ab_lat,
    lng: a.lng + t * ab_lng
  };

  return haversineDistance(point, projection);
}

/**
 * Minimum distance from a point to the nearest edge of a polygon.
 * Returns distance in meters.
 */
export function distanceToPolygonEdge(point: GeoPoint, polygon: GeoPoint[]): number {
  let minDist = Infinity;
  const n = polygon.length;

  for (let i = 0; i < n - 1; i++) {
    const dist = distanceToSegment(point, polygon[i], polygon[i + 1]);
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

/**
 * Minimum distance from a point to the IMBL line specifically.
 * Returns distance in meters.
 */
export function distanceToIMBL(point: GeoPoint): number {
  let minDist = Infinity;

  for (let i = 0; i < IMBL_LINE.length - 1; i++) {
    const dist = distanceToSegment(point, IMBL_LINE[i], IMBL_LINE[i + 1]);
    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

/**
 * Check if two line segments intersect.
 * Segment 1: p1→p2, Segment 2: p3→p4
 */
function segmentsIntersect(p1: GeoPoint, p2: GeoPoint, p3: GeoPoint, p4: GeoPoint): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

function direction(pi: GeoPoint, pj: GeoPoint, pk: GeoPoint): number {
  return (pk.lng - pi.lng) * (pj.lat - pi.lat) - (pj.lng - pi.lng) * (pk.lat - pi.lat);
}

function onSegment(pi: GeoPoint, pj: GeoPoint, pk: GeoPoint): boolean {
  return Math.min(pi.lat, pj.lat) <= pk.lat && pk.lat <= Math.max(pi.lat, pj.lat) &&
         Math.min(pi.lng, pj.lng) <= pk.lng && pk.lng <= Math.max(pi.lng, pj.lng);
}

/**
 * Check if a trajectory (array of predicted points) intersects the IMBL boundary.
 * Returns true if any segment of the trajectory crosses the IMBL line.
 */
export function trajectoryIntersectsIMBL(trajectory: GeoPoint[]): boolean {
  for (let t = 0; t < trajectory.length - 1; t++) {
    for (let i = 0; i < IMBL_LINE.length - 1; i++) {
      if (segmentsIntersect(trajectory[t], trajectory[t + 1], IMBL_LINE[i], IMBL_LINE[i + 1])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Alert levels for the geofence system
 */
export type AlertLevel = 'safe' | 'advisory' | 'high_risk' | 'violation';

export interface GeofenceResult {
  /** Whether vessel is inside the forbidden zone */
  isInForbiddenZone: boolean;
  /** Whether vessel is inside the warning buffer zone */
  isInWarningZone: boolean;
  /** Distance to the nearest point on the IMBL in meters */
  distanceToIMBL: number;
  /** Distance to the nearest edge of the forbidden zone polygon in meters */
  distanceToForbiddenZone: number;
  /** Current alert level based on geofence check alone */
  alertLevel: AlertLevel;
  /** Human-readable status */
  statusMessage: string;
}

/**
 * Perform a complete geofence check for a vessel position.
 * This is the primary function called on every GPS update.
 * Entirely deterministic — no AI/ML involved.
 */
export function checkGeofence(position: GeoPoint): GeofenceResult {
  const inForbidden = isPointInPolygon(position, FORBIDDEN_ZONE.polygon);
  const inWarning = isPointInPolygon(position, WARNING_ZONE.polygon);
  const distIMBL = distanceToIMBL(position);
  const distForbidden = distanceToPolygonEdge(position, FORBIDDEN_ZONE.polygon);

  let alertLevel: AlertLevel = 'safe';
  let statusMessage = 'Operating in safe Indian waters';

  if (inForbidden) {
    alertLevel = 'violation';
    statusMessage = `⛔ VIOLATION: Vessel has crossed the IMBL into Sri Lankan waters`;
  } else if (inWarning) {
    alertLevel = 'high_risk';
    statusMessage = `⚠️ WARNING: Within ${Math.round(distIMBL)}m of the IMBL — exercise extreme caution`;
  } else if (distIMBL < FORBIDDEN_ZONE.warningBufferMeters) {
    alertLevel = 'advisory';
    statusMessage = `📋 ADVISORY: ${Math.round(distIMBL)}m from IMBL — maintain safe distance`;
  }

  return {
    isInForbiddenZone: inForbidden,
    isInWarningZone: inWarning,
    distanceToIMBL: distIMBL,
    distanceToForbiddenZone: distForbidden,
    alertLevel,
    statusMessage,
  };
}
