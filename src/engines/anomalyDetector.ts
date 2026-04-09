/**
 * Anomaly Detection Engine — Rule-Based + Decision Tree Scoring
 *
 * Detects 5 suspicious behavior patterns:
 * 1. Zig-Zag  — heading variance > 50° + slow speed → trawling
 * 2. Loitering — speed < 0.3kn for > 5 min in warning zone
 * 3. Speed Spike — > 6 knot change between readings
 * 4. Night Fishing — 22:00–04:00 in warning zone
 * 5. Rapid Approach — < 5km from IMBL at > 4 knots
 */

export type AnomalyType = 'zigzag' | 'loitering' | 'speed_spike' | 'night_fishing' | 'rapid_approach';

export interface AnomalyEvent {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  tamilMessage: string;
  timestamp: number;
  value?: number;
}

export interface AnomalyState {
  headingHistory: number[];
  speedHistory: { speed: number; timestamp: number }[];
  lowSpeedStartTime: number | null;
  lastAnomalies: AnomalyEvent[];
  anomalyScore: number; // 0–100
}

const vesselStates = new Map<string, AnomalyState>();

function getState(id: string): AnomalyState {
  if (!vesselStates.has(id)) {
    vesselStates.set(id, { headingHistory: [], speedHistory: [], lowSpeedStartTime: null, lastAnomalies: [], anomalyScore: 0 });
  }
  return vesselStates.get(id)!;
}

/** Circular heading variance (returns degrees 0–90) */
function headingVariance(headings: number[]): number {
  if (headings.length < 2) return 0;
  const sinSum = headings.reduce((s, h) => s + Math.sin(h * Math.PI / 180), 0);
  const cosSum = headings.reduce((s, h) => s + Math.cos(h * Math.PI / 180), 0);
  const R = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / headings.length;
  return (1 - R) * 180;
}

export function detectAnomalies(
  vesselId: string,
  heading: number,
  speedKnots: number,
  distanceToIMBLKm: number,
  timestamp: number,
  inWarningZone: boolean,
): AnomalyState {
  const state = getState(vesselId);
  const anomalies: AnomalyEvent[] = [];

  // Update histories
  state.headingHistory.push(heading);
  if (state.headingHistory.length > 8) state.headingHistory.shift();
  state.speedHistory.push({ speed: speedKnots, timestamp });
  if (state.speedHistory.length > 10) state.speedHistory.shift();

  // Rule 1: Zig-Zag
  if (state.headingHistory.length >= 5) {
    const variance = headingVariance(state.headingHistory);
    if (variance > 50 && speedKnots < 3) {
      anomalies.push({
        type: 'zigzag',
        severity: variance > 80 ? 'high' : 'medium',
        message: `Zig-zag movement (${Math.round(variance)}° variance) — possible illegal trawling`,
        tamilMessage: `சிக்காக்கால் இயக்கம் (${Math.round(variance)}° மாறுபாடு) — சட்டவிரோத வலை இழுத்தல்`,
        timestamp, value: variance,
      });
    }
  }

  // Rule 2: Loitering
  if (speedKnots < 0.3) {
    if (!state.lowSpeedStartTime) state.lowSpeedStartTime = timestamp;
    else {
      const durMin = (timestamp - state.lowSpeedStartTime) / 60000;
      if (durMin > 5 && inWarningZone) {
        anomalies.push({
          type: 'loitering',
          severity: durMin > 15 ? 'high' : 'medium',
          message: `Loitering in warning zone (${Math.round(durMin)} min stationary)`,
          tamilMessage: `எச்சரிக்கை மண்டலத்தில் நிலை (${Math.round(durMin)} நிமிடம்)`,
          timestamp, value: durMin,
        });
      }
    }
  } else {
    state.lowSpeedStartTime = null;
  }

  // Rule 3: Speed Spike
  if (state.speedHistory.length >= 3) {
    const change = Math.abs(state.speedHistory.at(-1)!.speed - state.speedHistory.at(-3)!.speed);
    if (change > 6) {
      anomalies.push({
        type: 'speed_spike',
        severity: change > 10 ? 'high' : 'medium',
        message: `Sudden speed change: ${change.toFixed(1)} knot spike`,
        tamilMessage: `திடீர் வேக மாற்றம்: ${change.toFixed(1)} நாட் சிக்கல்`,
        timestamp, value: change,
      });
    }
  }

  // Rule 4: Night Fishing
  const hour = new Date(timestamp).getHours();
  if ((hour >= 22 || hour < 4) && inWarningZone && speedKnots > 0.5) {
    anomalies.push({
      type: 'night_fishing',
      severity: 'medium',
      message: `Night fishing in warning zone (${hour.toString().padStart(2,'0')}:00 hrs)`,
      tamilMessage: `எச்சரிக்கை மண்டலத்தில் இரவு மீன்பிடித்தல் (${hour}:00 மணி)`,
      timestamp,
    });
  }

  // Rule 5: Rapid Approach
  if (distanceToIMBLKm < 5 && speedKnots > 4) {
    anomalies.push({
      type: 'rapid_approach',
      severity: distanceToIMBLKm < 2 ? 'high' : 'medium',
      message: `Rapid IMBL approach — ${distanceToIMBLKm.toFixed(1)} km at ${speedKnots.toFixed(1)} kn`,
      tamilMessage: `IMBL ஐ விரைவாக நெருங்குகிறது — ${distanceToIMBLKm.toFixed(1)} கி.மீ`,
      timestamp, value: distanceToIMBLKm,
    });
  }

  // Decision tree score (EMA)
  const rawScore = anomalies.reduce((t, a) => t + (a.severity === 'high' ? 30 : a.severity === 'medium' ? 15 : 5), 0);
  state.anomalyScore = Math.min(100, Math.round(state.anomalyScore * 0.7 + rawScore * 0.3));
  state.lastAnomalies = anomalies;
  return { ...state };
}

export function resetAnomalyState(vesselId: string): void { vesselStates.delete(vesselId); }
export function getAnomalyScore(vesselId: string): number { return vesselStates.get(vesselId)?.anomalyScore ?? 0; }
