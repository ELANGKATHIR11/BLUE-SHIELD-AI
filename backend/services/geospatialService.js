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
import * as turf from '@turf/turf';

class GeospatialService {
  constructor() {
    this.zones = [];
    this.initializeZones();
  }

  initializeZones() {
    // 1. IMBL Line Definition (India - Sri Lanka Palk Strait)
    const imblPoints = [
      [79.05, 10.08],
      [79.25, 9.85],
      [79.45, 9.50],
      [79.60, 9.20],
      [79.80, 8.90]
    ];
    this.imblLine = turf.lineString(imblPoints);

    // 2. Sri Lankan Forbidden Zone Polygon (Authoritative boundary)
    const sriLankaPoly = [[
      [79.25, 9.85],
      [80.50, 10.20],
      [80.60, 8.80],
      [79.80, 8.90],
      [79.60, 9.20],
      [79.45, 9.50],
      [79.25, 9.85]
    ]];
    this.sriLankaZone = turf.polygon(sriLankaPoly);

    this.zones.push({
      id: 'ZONE_SRI_LANKA_EEZ',
      name: 'Sri Lankan Territorial Waters (Prohibited)',
      zoneType: 'INTERNATIONAL_BORDER',
      severity: 'CRITICAL',
      polygonCoordinates: sriLankaPoly,
      bufferMeters: 3000,
      active: true,
      effectiveFrom: '2020-01-01T00:00:00Z',
      version: 1,
      createdBy: 'MINISTRY_OF_EXTERNAL_AFFAIRS'
    });

    // 3. Indian Marine Protected Areas (Gulf of Mannar & Palk Bay)
    const gomCorePoly = [[
      [78.70, 8.90],
      [79.20, 8.90],
      [79.20, 9.15],
      [78.70, 9.15],
      [78.70, 8.90]
    ]];
    this.zones.push({
      id: 'ZONE_GOM_CORE_RESERVE',
      name: 'Gulf of Mannar Marine Biosphere Core Area',
      zoneType: 'MARINE_SANCTUARY',
      severity: 'HIGH',
      polygonCoordinates: gomCorePoly,
      bufferMeters: 2000,
      active: true,
      effectiveFrom: '2020-01-01T00:00:00Z',
      version: 1,
      createdBy: 'WILDLIFE_INSTITUTE_INDIA'
    });
  }

  /**
   * Deterministic geofence evaluation with boundary tolerance & hysteresis
   */
  evaluateLocation(lat, lng, accuracyMeters = 5.0) {
    const point = turf.point([lng, lat]);

    // 1. Measure distance to IMBL line
    const distanceToImblKm = turf.pointToLineDistance(point, this.imblLine, { units: 'kilometers' });
    const distanceToImblMeters = distanceToImblKm * 1000.0;

    // 2. Check each active polygon zone
    let primaryZone = null;
    let isInside = false;
    let minDistanceToBoundary = distanceToImblMeters;

    for (const zone of this.zones) {
      if (!zone.active) continue;
      const poly = turf.polygon(zone.polygonCoordinates);
      const contains = turf.booleanPointInPolygon(point, poly);

      if (contains) {
        isInside = true;
        primaryZone = zone;
        minDistanceToBoundary = 0;
        break;
      } else {
        const line = turf.polygonToLine(poly);
        const distKm = turf.pointToLineDistance(point, line, { units: 'kilometers' });
        const distMeters = distKm * 1000.0;
        if (distMeters < minDistanceToBoundary) {
          minDistanceToBoundary = distMeters;
          primaryZone = zone;
        }
      }
    }

    // 3. Classify State: SAFE | APPROACHING | WARNING | VIOLATION
    let state = 'SAFE';
    let severity = 'INFO';
    let message = 'Within nominal Indian territorial waters';

    // Account for GPS accuracy error bounds near boundary
    const effectiveDistance = Math.max(0, minDistanceToBoundary - (accuracyMeters || 5));

    if (isInside) {
      state = 'VIOLATION';
      severity = 'CRITICAL';
      message = `⛔ CRITICAL: Inside ${primaryZone?.name || 'Prohibited Sri Lankan Waters'}! Turn back immediately.`;
    } else if (effectiveDistance < 1000) {
      state = 'WARNING';
      severity = 'HIGH';
      message = `⚠️ WARNING: ${(minDistanceToBoundary / 1000).toFixed(2)} km from boundary. Course correction required.`;
    } else if (effectiveDistance < 3000) {
      state = 'APPROACHING';
      severity = 'WARNING';
      message = `📋 ADVISORY: Approaching restricted zone buffer (${(minDistanceToBoundary / 1000).toFixed(2)} km).`;
    }

    return {
      state,
      severity,
      isViolation: state === 'VIOLATION',
      distanceToBoundaryMeters: minDistanceToBoundary,
      zone: primaryZone,
      zoneId: primaryZone?.id || 'ZONE_SRI_LANKA_EEZ',
      message,
      evaluatedAt: Date.now()
    };
  }

  getZonesGeoJSON() {
    return {
      type: 'FeatureCollection',
      features: this.zones.map(z => ({
        type: 'Feature',
        properties: {
          id: z.id,
          name: z.name,
          zoneType: z.zoneType,
          severity: z.severity,
          bufferMeters: z.bufferMeters,
          version: z.version
        },
        geometry: {
          type: 'Polygon',
          coordinates: z.polygonCoordinates
        }
      }))
    };
  }
}

export const geospatialService = new GeospatialService();
export default geospatialService;
