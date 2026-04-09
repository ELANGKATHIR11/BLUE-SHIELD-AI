/**
 * HEATMAP ENGINE — Risk Zone Visualization
 * Generates heat map data for Coast Guard deployment planning
 * Identifies high-risk zones based on:
 * - Vessel density
 * - Violation frequency
 * - Near-breach attempts
 * - Anomaly clustering
 */

import type { BoatData } from '../App';
import { distanceToIMBL } from './geofence';

export interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number; // 0-100
  vesselCount: number;
  violationCount: number;
  anomalyCount: number;
}

export interface HeatMapData {
  points: HeatPoint[];
  maxIntensity: number;
  generatedAt: number;
}

const GRID_CELL_SIZE_M = 5000; // 5km cells

export function generateHeatMap(
  vessels: BoatData[],
  violationCounts: Map<string, number>,
  anomalyScores: Map<string, number>
): HeatMapData {
  const cellMap = new Map<string, HeatPoint>();

  for (const vessel of vessels) {
    const cellKey = getGridCellKey(vessel.location.lat, vessel.location.lng);

    if (!cellMap.has(cellKey)) {
      cellMap.set(cellKey, {
        lat: 0,
        lng: 0,
        intensity: 0,
        vesselCount: 0,
        violationCount: 0,
        anomalyCount: 0
      });
    }

    const cell = cellMap.get(cellKey)!;
    cell.lat += vessel.location.lat;
    cell.lng += vessel.location.lng;
    cell.vesselCount += 1;
    cell.violationCount += violationCounts.get(vessel.aisId) || 0;
    cell.anomalyCount += (anomalyScores.get(vessel.aisId) || 0) > 30 ? 1 : 0;

    // Intensity based on proximity to boundary
    const distToIMBL = distanceToIMBL(vessel.location);
    if (distToIMBL < 10000) {
      cell.intensity += 50 * (1 - distToIMBL / 10000);
    }
  }

  // Finalize cells
  const points: HeatPoint[] = Array.from(cellMap.values()).map(cell => ({
    lat: cell.lat / cell.vesselCount,
    lng: cell.lng / cell.vesselCount,
    intensity: Math.min(100, cell.intensity / cell.vesselCount + cell.violationCount * 5),
    vesselCount: cell.vesselCount,
    violationCount: cell.violationCount,
    anomalyCount: cell.anomalyCount
  }));

  const maxIntensity = Math.max(...points.map(p => p.intensity), 1);

  return {
    points,
    maxIntensity,
    generatedAt: Date.now()
  };
}

function getGridCellKey(lat: number, lng: number): string {
  const latCell = Math.floor(lat * 10000 / GRID_CELL_SIZE_M);
  const lngCell = Math.floor(lng * 10000 / GRID_CELL_SIZE_M);
  return `${latCell},${lngCell}`;
}

export function getHotspots(heatMap: HeatMapData, threshold: number = 75): HeatPoint[] {
  return heatMap.points.filter(p => p.intensity >= threshold);
}

export function getDeploymentRecommendations(heatMap: HeatMapData): string[] {
  const recommendations: string[] = [];
  const hotspots = getHotspots(heatMap, 75);

  if (hotspots.length === 0) {
    recommendations.push('✅ All zones normal. Routine patrols recommended.');
    return recommendations;
  }

  hotspots.sort((a, b) => b.intensity - a.intensity);

  for (let i = 0; i < Math.min(3, hotspots.length); i++) {
    const spot = hotspots[i];
    recommendations.push(
      `⚠️ Zone ${i + 1}: HIGH INTENSITY (${Math.round(spot.intensity)}%) - ` +
      `${spot.vesselCount} vessels, ${spot.violationCount} violations. ` +
      `Priority deployment to ${spot.lat.toFixed(4)}°N, ${spot.lng.toFixed(4)}°E`
    );
  }

  return recommendations;
}
