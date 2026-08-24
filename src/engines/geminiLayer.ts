/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 * LAYER 4 — Gemini & Natural Language Explanation Layer
 * 
 * Used for language & explanation only (Bilingual Tamil & English).
 * Geofencing & legal boundary decisions are 100% deterministic PostGIS/Turf.
 */

import type { AlertLevel } from './geofence';
import type { RiskAssessment } from './riskModel';
import type { GeofenceResult } from './geofence';
import type { TrajectoryPrediction } from './kalmanFilter';

/** Cache for responses to avoid duplicate API calls */
const responseCache = new Map<string, { response: string; timestamp: number }>();

export interface AlertData {
  vesselId: string;
  boatName?: string;
  fishermanName?: string;
  alertLevel: AlertLevel;
  riskProbability: number;
  distanceToIMBL: number;
  speedKnots: number;
  heading: number;
  riskFactors: string[];
  isViolation: boolean;
  timestamp: number;
}

export interface BilingualAlert {
  english: string;
  tamil: string;
  shortMessage: string;
}

const STATIC_ALERTS: Record<AlertLevel, BilingualAlert> = {
  safe: {
    english: '✅ All clear. You are operating safely within Indian maritime waters.',
    tamil: '✅ பாதுகாப்பு. நீங்கள் இந்திய கடல் எல்லைக்குள் பாதுகாப்பாக இயங்குகிறீர்கள்.',
    shortMessage: 'Safe — within Indian waters',
  },
  advisory: {
    english: '📋 ADVISORY: You are approaching the India–Sri Lanka maritime boundary (IMBL). Please adjust your heading to maintain safe distance.',
    tamil: '📋 அறிவிப்பு: நீங்கள் இந்தியா–இலங்கை கடல் எல்லையை (IMBL) நெருங்கி வருகிறீர்கள். பாதுகாப்பான தூரத்தை பராமரிக்க உங்கள் திசையை சரிசெய்யவும்.',
    shortMessage: 'Advisory — approaching IMBL',
  },
  high_risk: {
    english: '⚠️ HIGH RISK: You are very close to the International Maritime Boundary Line. IMMEDIATELY reduce speed and change heading away from the boundary. Coast Guard has been notified.',
    tamil: '⚠️ உயர் ஆபத்து: நீங்கள் சர்வதேச கடல் எல்லைக் கோட்டிற்கு மிக அருகில் உள்ளீர்கள். உடனடியாக வேகத்தை குறைத்து எல்லையிலிருந்து விலகும் திசையை மாற்றவும். கடலோர காவல்படை அறிவிக்கப்பட்டுள்ளது.',
    shortMessage: 'HIGH RISK — near IMBL boundary',
  },
  violation: {
    english: '⛔ VIOLATION: You have crossed the International Maritime Boundary Line into Sri Lankan waters. This is a serious violation. TURN BACK IMMEDIATELY. Incident has been logged and authorities notified.',
    tamil: '⛔ மீறல்: நீங்கள் சர்வதேச கடல் எல்லைக் கோட்டை கடந்து இலங்கை கடல் பகுதிக்குள் நுழைந்துள்ளீர்கள். இது கடுமையான மீறல். உடனடியாக திரும்பவும். சம்பவம் பதிவு செய்யப்பட்டு அதிகாரிகளுக்கு அறிவிக்கப்பட்டுள்ளது.',
    shortMessage: 'VIOLATION — crossed into Sri Lankan waters',
  },
};

export async function generateAlertExplanation(alertData: AlertData): Promise<BilingualAlert> {
  return STATIC_ALERTS[alertData.alertLevel] || STATIC_ALERTS.safe;
}

export interface IncidentReport {
  reportId: string;
  timestamp: string;
  summary: string;
  details: string;
  vesselInfo: string;
  actionRequired: string;
}

export async function generateIncidentReport(
  alertData: AlertData,
  geofenceResult: GeofenceResult,
  riskAssessment: RiskAssessment,
  trajectoryPrediction?: TrajectoryPrediction,
): Promise<IncidentReport> {
  const reportId = `IR-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date(alertData.timestamp).toISOString();
  const trajNote = trajectoryPrediction?.predictedPoints?.length ? ` (Traj Points: ${trajectoryPrediction.predictedPoints.length})` : '';

  return {
    reportId,
    timestamp,
    summary: `${alertData.alertLevel.toUpperCase()} alert for vessel ${alertData.vesselId}${trajNote}`,
    details: `Vessel ${alertData.vesselId} ${alertData.isViolation ? 'crossed the IMBL' : 'approached the IMBL'}. Distance: ${Math.round(geofenceResult.distanceToIMBL)}m. Risk: ${(riskAssessment.probability * 100).toFixed(1)}%. Speed: ${alertData.speedKnots.toFixed(1)} kts. Factors: ${alertData.riskFactors.join('; ')}`,
    vesselInfo: `ID: ${alertData.vesselId}${alertData.fishermanName ? `, Captain: ${alertData.fishermanName}` : ''}`,
    actionRequired: alertData.isViolation
      ? 'IMMEDIATE: Deploy Coast Guard patrol. Contact vessel. Log violation.'
      : 'MONITOR: Track vessel trajectory. Prepare for potential intercept.',
  };
}

export function getStaticAlert(level: AlertLevel): BilingualAlert {
  return STATIC_ALERTS[level] || STATIC_ALERTS.safe;
}

export function clearCache(): void {
  responseCache.clear();
}
