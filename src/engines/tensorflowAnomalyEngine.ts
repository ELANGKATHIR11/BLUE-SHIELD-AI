/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import { BoatData } from '../App';
import { AnomalyType } from './riskModel';

export interface MLAnomalyResult {
  type: AnomalyType;
  mlScore: number;
  ruleScore: number;
  combinedScore: number;
  isAnomaly: boolean;
}

function calculateStatisticalAnomalyScore(
  anomalyType: AnomalyType,
  context: { hour: number; distToIMBL: number; inWarningZone: boolean }
): number {
  const typeWeights: Record<AnomalyType, number> = {
    'zigzag': 0.9,
    'loitering': 0.85,
    'speed_spike': 0.7,
    'night_fishing': 0.6,
    'rapid_approach': 0.95
  };

  let score = (typeWeights[anomalyType] || 0.5) * 100;

  if (context.inWarningZone) score *= 1.3;
  if (context.distToIMBL < 5000) score *= 1.2;
  if (context.hour >= 22 || context.hour < 4) score *= 1.15;

  return Math.min(100, score);
}

export function scoreAnomaly(
  anomalyType: AnomalyType,
  ruleScore: number,
  _vessel: BoatData,
  context: { hour: number; distToIMBL: number; inWarningZone: boolean }
): MLAnomalyResult {
  const mlScore = calculateStatisticalAnomalyScore(anomalyType, context);
  const combinedScore = Math.round(ruleScore * 0.67 + mlScore * 0.33);
  const isAnomaly = combinedScore > 50;

  return {
    type: anomalyType,
    mlScore,
    ruleScore,
    combinedScore,
    isAnomaly
  };
}

export function batchScoreAnomalies(
  vessels: BoatData[],
  ruleScores: Map<string, number>
): Map<string, MLAnomalyResult> {
  const results = new Map<string, MLAnomalyResult>();

  for (const vessel of vessels) {
    const ruleScore = ruleScores.get(vessel.aisId) || 0;
    const context = {
      hour: new Date().getHours(),
      distToIMBL: 0,
      inWarningZone: vessel.status !== 'safe'
    };

    const anomalyType: AnomalyType =
      ruleScore > 75 ? 'rapid_approach' :
      ruleScore > 60 ? 'zigzag' :
      'loitering';

    const result = scoreAnomaly(anomalyType, ruleScore, vessel, context);
    results.set(vessel.aisId, result);
  }

  return results;
}
