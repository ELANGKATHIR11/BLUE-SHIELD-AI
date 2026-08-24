/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface BoundaryCheckResult {
  inIndiaEEZ: boolean;
  inAndamanEEZ: boolean;
  inSriLankaEEZ: boolean;
  inMaldivesEEZ: boolean;
  alertLevel: 'safe' | 'warning' | 'danger';
  zoneName: string;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}

export interface GeoJSONFeature {
  type: string;
  properties?: Record<string, unknown>;
  geometry: GeoJSONGeometry;
}

export interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

export function isPointInGeoJSONPolygon(point: GeoPoint, polygon: number[][]): boolean {
  const lat = point.lat;
  const lng = point.lng;
  const n = polygon.length;
  let inside = false;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInGeometry(point: GeoPoint, geometry: GeoJSONGeometry | null | undefined): boolean {
  if (!geometry || !geometry.coordinates) return false;
  
  if (geometry.type === 'Polygon') {
    return isPointInGeoJSONPolygon(point, (geometry.coordinates as number[][][])[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygonCoords of (geometry.coordinates as number[][][][])) {
      if (polygonCoords && polygonCoords[0]) {
        if (isPointInGeoJSONPolygon(point, polygonCoords[0])) {
          return true;
        }
      }
    }
  }
  return false;
}

let indiaEEZData: GeoJSONFeatureCollection | null = null;
let andamanEEZData: GeoJSONFeatureCollection | null = null;
let sriLankaEEZData: GeoJSONFeatureCollection | null = null;
let maldivesEEZData: GeoJSONFeatureCollection | null = null;

export async function initializeBoundaries(): Promise<void> {
  try {
    const fetchPromises = [
      fetch('/data/gis/simplified/india_eez_simplified.geojson').then(r => r.json()).then(data => { indiaEEZData = data; }),
      fetch('/data/gis/simplified/andaman_nicobar_eez_simplified.geojson').then(r => r.json()).then(data => { andamanEEZData = data; }),
      fetch('/data/gis/simplified/sri_lanka_eez_simplified.geojson').then(r => r.json()).then(data => { sriLankaEEZData = data; }),
      fetch('/data/gis/simplified/maldives_eez_simplified.geojson').then(r => r.json()).then(data => { maldivesEEZData = data; }),
    ];
    await Promise.all(fetchPromises);
  } catch (error) {
    console.warn('ℹ️ Boundary GeoJSON prefetch note:', error);
  }
}

export function checkExtendedEEZBoundaries(position: GeoPoint): BoundaryCheckResult {
  let inIndia = false;
  let inAndaman = false;
  let inSriLanka = false;
  let inMaldives = false;

  if (indiaEEZData && indiaEEZData.features) {
    for (const feature of indiaEEZData.features) {
      if (isPointInGeometry(position, feature.geometry)) {
        inIndia = true;
        break;
      }
    }
  }

  if (andamanEEZData && andamanEEZData.features) {
    for (const feature of andamanEEZData.features) {
      if (isPointInGeometry(position, feature.geometry)) {
        inAndaman = true;
        break;
      }
    }
  }

  if (sriLankaEEZData && sriLankaEEZData.features) {
    for (const feature of sriLankaEEZData.features) {
      if (isPointInGeometry(position, feature.geometry)) {
        inSriLanka = true;
        break;
      }
    }
  }

  if (maldivesEEZData && maldivesEEZData.features) {
    for (const feature of maldivesEEZData.features) {
      if (isPointInGeometry(position, feature.geometry)) {
        inMaldives = true;
        break;
      }
    }
  }

  let alertLevel: 'safe' | 'warning' | 'danger' = 'safe';
  let zoneName = 'Indian Waters';

  if (inSriLanka) {
    alertLevel = 'danger';
    zoneName = 'Sri Lankan EEZ (Forbidden)';
  } else if (inMaldives) {
    alertLevel = 'danger';
    zoneName = 'Maldives EEZ (Forbidden)';
  } else if (inIndia || inAndaman) {
    alertLevel = 'safe';
    zoneName = inAndaman ? 'Andaman & Nicobar Waters' : 'Indian EEZ (Authorized)';
  }

  return {
    inIndiaEEZ: inIndia,
    inAndamanEEZ: inAndaman,
    inSriLankaEEZ: inSriLanka,
    inMaldivesEEZ: inMaldives,
    alertLevel,
    zoneName
  };
}
