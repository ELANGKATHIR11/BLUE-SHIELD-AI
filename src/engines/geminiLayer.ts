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
/**
 * LAYER 4 — Gemini Integration Layer
 * 
 * Gemini is used ONLY for language and reasoning tasks:
 *   1. Alert Explanation — Structured alert → human-readable Tamil/English
 *   2. Incident Report — Generate formatted violation summary
 *   3. Natural Language Query — Coast Guard text → structured parameters
 * 
 * Gemini is NEVER used for:
 *   - Geofence checks
 *   - Trajectory prediction
 *   - Risk calculation
 * 
 * Rate-limited, event-driven, cached, with static fallbacks.
 */

import { model } from '../firebase';
import type { RiskAssessment } from './riskModel';
import type { GeofenceResult, AlertLevel } from './geofence';
import type { TrajectoryPrediction } from './kalmanFilter';

/** Cache for Gemini responses to avoid duplicate API calls */
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minute cache
const MIN_CALL_INTERVAL_MS = 10_000; // Rate limit: 1 call per 10 seconds
let lastGeminiCall = 0;

/**
 * Rate-limited Gemini call wrapper
 */
async function callGemini(prompt: string, cacheKey?: string): Promise<string> {
  // Check cache
  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.response;
    }
  }

  // Rate limiting
  const now = Date.now();
  if (now - lastGeminiCall < MIN_CALL_INTERVAL_MS) {
    throw new Error('Rate limited — Gemini call too frequent');
  }
  lastGeminiCall = now;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Cache response
    if (cacheKey) {
      responseCache.set(cacheKey, { response: text, timestamp: now });
    }

    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

/** Structured alert data for explanation */
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

/** Bilingual alert message */
export interface BilingualAlert {
  english: string;
  tamil: string;
  shortMessage: string;
}

// ===========================
// STATIC FALLBACK TEMPLATES
// ===========================

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

// ===========================
// 1. ALERT EXPLANATION ENGINE
// ===========================

/**
 * Generate a human-readable alert message in Tamil and English.
 * Uses Gemini for rich explanation, falls back to static templates on failure.
 */
export async function generateAlertExplanation(alertData: AlertData): Promise<BilingualAlert> {
  // For safe level, skip Gemini — use static
  if (alertData.alertLevel === 'safe') {
    return STATIC_ALERTS.safe;
  }

  try {
    const cacheKey = `alert_${alertData.alertLevel}_${Math.round(alertData.distanceToIMBL / 100)}`;
    
    const prompt = `You are a maritime safety AI assistant for Tamil Nadu fishermen near the India–Sri Lanka maritime boundary (IMBL) in the Palk Strait.

Generate a safety alert message based on this data:
- Alert Level: ${alertData.alertLevel.toUpperCase()}
- Risk Probability: ${(alertData.riskProbability * 100).toFixed(1)}%
- Distance to IMBL: ${Math.round(alertData.distanceToIMBL)} meters
- Speed: ${alertData.speedKnots.toFixed(1)} knots
- Heading: ${alertData.heading}°
- Risk Factors: ${alertData.riskFactors.join(', ')}
- Is Violation: ${alertData.isViolation}
${alertData.fishermanName ? `- Fisherman: ${alertData.fishermanName}` : ''}

Return ONLY valid JSON in this exact format:
{
  "english": "Clear, actionable safety message in English",
  "tamil": "Same message translated to Tamil (தமிழ்)",
  "shortMessage": "One-line summary (max 50 chars)"
}

Rules:
- Be direct and actionable
- Include specific distance and direction advice
- Express urgency appropriate to the alert level
- For violations, emphasize immediate action needed
- Keep Tamil message natural and commonly understood`;

    const response = await callGemini(prompt, cacheKey);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as BilingualAlert;
      if (parsed.english && parsed.tamil && parsed.shortMessage) {
        return parsed;
      }
    }
    
    // If parsing fails, use static fallback
    return STATIC_ALERTS[alertData.alertLevel] || STATIC_ALERTS.advisory;
  } catch (error) {
    console.warn('Gemini alert explanation failed, using static fallback:', error);
    return STATIC_ALERTS[alertData.alertLevel] || STATIC_ALERTS.advisory;
  }
}

// ===========================
// 2. INCIDENT REPORT GENERATOR
// ===========================

export interface IncidentReport {
  reportId: string;
  timestamp: string;
  summary: string;
  details: string;
  vesselInfo: string;
  actionRequired: string;
}

/**
 * Generate an incident report for a boundary violation or high-risk event.
 * Uses Gemini for natural language formatting.
 */
export async function generateIncidentReport(
  alertData: AlertData,
  geofenceResult: GeofenceResult,
  riskAssessment: RiskAssessment,
  trajectoryPrediction: TrajectoryPrediction,
): Promise<IncidentReport> {
  const reportId = `IR-${Date.now().toString(36).toUpperCase()}`;
  const timestamp = new Date(alertData.timestamp).toISOString();

  // Static fallback report
  const fallbackReport: IncidentReport = {
    reportId,
    timestamp,
    summary: `${alertData.alertLevel.toUpperCase()} alert for vessel ${alertData.vesselId}`,
    details: `Vessel ${alertData.vesselId} ${alertData.isViolation ? 'crossed the IMBL' : 'approached the IMBL'}. Distance: ${Math.round(geofenceResult.distanceToIMBL)}m. Risk: ${(riskAssessment.probability * 100).toFixed(1)}%. Speed: ${alertData.speedKnots.toFixed(1)} kts. Factors: ${alertData.riskFactors.join('; ')}`,
    vesselInfo: `ID: ${alertData.vesselId}${alertData.fishermanName ? `, Captain: ${alertData.fishermanName}` : ''}`,
    actionRequired: alertData.isViolation
      ? 'IMMEDIATE: Deploy Coast Guard patrol. Contact vessel. Log violation.'
      : 'MONITOR: Track vessel trajectory. Prepare for potential intercept.',
  };

  try {
    const prompt = `Generate a formal maritime incident report in JSON format.

Incident Data:
- Report ID: ${reportId}
- Time: ${timestamp}
- Vessel ID: ${alertData.vesselId}
${alertData.fishermanName ? `- Captain: ${alertData.fishermanName}` : ''}
- Alert Level: ${alertData.alertLevel}
- Violation: ${alertData.isViolation}
- Distance to IMBL: ${Math.round(geofenceResult.distanceToIMBL)}m
- Risk Probability: ${(riskAssessment.probability * 100).toFixed(1)}%
- Speed: ${alertData.speedKnots.toFixed(1)} knots
- Heading: ${alertData.heading}°
- Risk Factors: ${riskAssessment.riskFactors.join(', ')}
- Trajectory Stable: ${trajectoryPrediction.isStable}
- Estimated Speed: ${trajectoryPrediction.estimatedSpeedMps.toFixed(1)} m/s

Return ONLY valid JSON:
{
  "summary": "One-line summary",
  "details": "2-3 sentence detailed description",
  "vesselInfo": "Vessel identification details",
  "actionRequired": "Specific actions for Coast Guard"
}`;

    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        reportId,
        timestamp,
        summary: parsed.summary || fallbackReport.summary,
        details: parsed.details || fallbackReport.details,
        vesselInfo: parsed.vesselInfo || fallbackReport.vesselInfo,
        actionRequired: parsed.actionRequired || fallbackReport.actionRequired,
      };
    }

    return fallbackReport;
  } catch (error) {
    console.warn('Gemini incident report failed, using fallback:', error);
    return fallbackReport;
  }
}

// ===========================
// 3. NATURAL LANGUAGE QUERY
// ===========================

export interface QueryResult {
  interpretation: string;
  queryType: 'vessel_status' | 'zone_check' | 'risk_assessment' | 'vessel_list' | 'general';
  parameters: Record<string, string>;
}

/**
 * Convert a Coast Guard natural language query into structured parameters.
 * Example: "Show me all boats near the boundary" → { queryType: 'vessel_list', parameters: { near: 'IMBL' } }
 */
export async function processNaturalLanguageQuery(query: string): Promise<QueryResult> {
  const fallback: QueryResult = {
    interpretation: `Query: "${query}"`,
    queryType: 'general',
    parameters: { raw: query },
  };

  try {
    const prompt = `You are a maritime command center AI. Parse this Coast Guard query into structured data.

Query: "${query}"

Return ONLY valid JSON:
{
  "interpretation": "What the operator is asking for",
  "queryType": "vessel_status" | "zone_check" | "risk_assessment" | "vessel_list" | "general",
  "parameters": {
    "vesselId": "if specific vessel mentioned",
    "zone": "if specific zone mentioned",
    "timeRange": "if time range mentioned",
    "riskLevel": "if risk level mentioned"
  }
}

Only include relevant parameters. Remove null/empty values.`;

    const response = await callGemini(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as QueryResult;
      if (parsed.interpretation && parsed.queryType) {
        return parsed;
      }
    }

    return fallback;
  } catch (error) {
    console.warn('Gemini NL query processing failed:', error);
    return fallback;
  }
}

/**
 * Get static alert message (no Gemini call needed)
 */
export function getStaticAlert(level: AlertLevel): BilingualAlert {
  return STATIC_ALERTS[level] || STATIC_ALERTS.safe;
}

/**
 * Clear the response cache
 */
export function clearCache(): void {
  responseCache.clear();
}
