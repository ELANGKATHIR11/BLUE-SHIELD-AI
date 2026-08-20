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
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Brain, Shield, Activity, Navigation, Gauge, MapPin, Volume2, MessageSquare, AlertTriangle } from 'lucide-react';
import { BoatData, Alert } from '../App';
import { checkGeofence, type GeofenceResult, type AlertLevel } from '../engines/geofence';
import { VesselTracker, type PredictedPoint } from '../engines/kalmanFilter';
import { calculateRisk, type RiskAssessment } from '../engines/riskModel';
import { generateAlertExplanation, getStaticAlert, type BilingualAlert } from '../engines/geminiLayer';
import { detectAnomalies, type AnomalyState } from '../engines/anomalyDetector';
import { useLanguage } from '../contexts/LanguageContext';
import { useAudioAlert } from '../hooks/useAudioAlert';
import { mlInferenceService } from '../services/mlInferenceService';
import Typewriter from './Typewriter';

interface AIMonitorProps {
  boatData: BoatData | null;
  onAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  onStatusChange: (status: BoatData['status']) => void;
  onRiskUpdate?: (vesselId: string, probability: number, anomalyScore: number) => void;
}

const AIMonitor: React.FC<AIMonitorProps> = ({ boatData, onAlert, onStatusChange, onRiskUpdate }) => {
  // Engine states
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [trajectoryPrediction, setTrajectoryPrediction] = useState<ReturnType<VesselTracker['predictTrajectory']> | null>(null);
  const [alertMessage, setAlertMessage] = useState<BilingualAlert | null>(null);
  const [anomalyState, setAnomalyState] = useState<AnomalyState | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { lang } = useLanguage();

  // Kalman tracker ref — persists across renders
  const trackerRef = useRef<VesselTracker>(new VesselTracker());

  // Track last alert level to avoid duplicate alerts
  const lastAlertLevelRef = useRef<AlertLevel>('safe');

  // Activate Audio Alerts Hook
  useAudioAlert(boatData?.status || 'safe');

  /**
   * CORE ENGINE PIPELINE — runs on every GPS update
   * 1. Geofence check (deterministic)
   * 2. Kalman filter update + trajectory prediction
   * 3. Risk model scoring
   * 4. Gemini explanation (only if alert level changes)
   */
  const runEnginePipeline = useCallback(async (data: BoatData) => {
    setIsAnalyzing(true);
    const position = { lat: data.location.lat, lng: data.location.lng };
    const timestamp = data.location.timestamp || Date.now();

    try {
      // === LAYER 1: Deterministic Geofence ===
      const geoResult = checkGeofence(position);
      setGeofenceResult(geoResult);

      // === LAYER 2: Kalman Filter Trajectory ===
      trackerRef.current.addMeasurement({ lat: position.lat, lng: position.lng, timestamp });
      const trajectory = trackerRef.current.predictTrajectory();
      setTrajectoryPrediction(trajectory);

      // === LAYER 3: Risk Model ===
      const risk = calculateRisk(
        data.aisId,
        position,
        data.speed,
        data.heading,
        trajectory.predictedPoints,
        timestamp,
      );
      setRiskAssessment(risk);

      // === LAYER 5: Anomaly Detection ===
      const inWarning = geoResult.alertLevel === 'high_risk' || geoResult.alertLevel === 'advisory';
      const anomaly = detectAnomalies(
        data.aisId,
        data.heading,
        data.speed,
        geoResult.distanceToIMBL ?? 999,
        timestamp,
        inWarning,
      );
      setAnomalyState(anomaly);

      // === LAYER 6: Real ML Model Evaluation ===
      let computedRiskProbability = risk.probability;
      let computedAnomalyScore = anomaly.anomalyScore;
      try {
        const mlResult = await mlInferenceService.predictLiveTelemetry(data);
        computedRiskProbability = Math.max(risk.probability, mlResult.isFishingProbability);
        computedAnomalyScore = Math.max(anomaly.anomalyScore, mlResult.anomalyScore);
        onRiskUpdate?.(data.aisId, computedRiskProbability, computedAnomalyScore);
      } catch (err) {
        onRiskUpdate?.(data.aisId, risk.probability, anomaly.anomalyScore);
      }

      // === AUTOMATIC THREAT TRANSMISSION TO COAST GUARD IF RISK >= 90% (0.90) ===
      if (computedRiskProbability >= 0.90 || geoResult.isInForbiddenZone) {
        const now = Date.now();
        // Throttled threat transmission (every 60s per vessel)
        if (!lastAlertLevelRef.current || lastAlertLevelRef.current !== 'violation') {
          const riskPercentage = Math.round(computedRiskProbability * 100);
          const threatMessage = `🚨 CRITICAL THREAT: Vessel ${data.boatId} (${data.aisId}) has breached 90% risk threshold (Calculated: ${riskPercentage}%). Location: ${position.lat.toFixed(5)}°N, ${position.lng.toFixed(5)}°E, Speed: ${data.speed.toFixed(1)} kts, Operator: ${data.fishermanName || 'N/A'}, Phone: ${data.contactInfo || 'N/A'}`;

          userService.sendMessage({
            senderId: data.aisId,
            senderName: `${data.boatId} [THREAT ALERT]`,
            receiverId: 'COAST_GUARD',
            message: threatMessage,
            priority: 'high'
          }).catch(e => console.error('Failed to send threat message to Coast Guard:', e));
        }
      }

      // === Determine final alert level (highest wins) ===
      let finalAlertLevel: AlertLevel = risk.alertLevel;
      if (geoResult.alertLevel === 'violation' || computedRiskProbability >= 0.90) {
        finalAlertLevel = 'violation';
      } else if (geoResult.alertLevel === 'high_risk' || computedRiskProbability >= 0.70) {
        finalAlertLevel = 'high_risk';
      } else if (geoResult.alertLevel === 'advisory' || computedRiskProbability >= 0.40) {
        finalAlertLevel = 'advisory';
      }

      // === Update boat status ===
      if (finalAlertLevel === 'violation') {
        onStatusChange('danger');
      } else if (finalAlertLevel === 'high_risk') {
        onStatusChange('warning');
      } else if (finalAlertLevel === 'advisory') {
        onStatusChange('warning');
      } else {
        onStatusChange('safe');
      }

      // === Trigger alerts only when level CHANGES or is critical ===
      if (finalAlertLevel !== lastAlertLevelRef.current || finalAlertLevel === 'violation') {
        lastAlertLevelRef.current = finalAlertLevel;

        if (finalAlertLevel !== 'safe') {
          // Fire immediate deterministic alert
          onAlert({
            type: finalAlertLevel === 'violation' ? 'danger' : finalAlertLevel === 'high_risk' ? 'danger' : 'warning',
            message: geoResult.statusMessage || risk.riskFactors[0],
            zone: 'IMBL - Palk Strait',
          });

          // === LAYER 4: Gemini for language (async, non-blocking) ===
          generateAlertExplanation({
            vesselId: data.aisId,
            boatName: data.boatId,
            fishermanName: data.fishermanName,
            alertLevel: finalAlertLevel,
            riskProbability: risk.probability,
            distanceToIMBL: geoResult.distanceToIMBL,
            speedKnots: data.speed,
            heading: data.heading,
            riskFactors: risk.riskFactors,
            isViolation: geoResult.isInForbiddenZone,
            timestamp,
          }).then(setAlertMessage).catch(() => {
            // Fallback to static
            setAlertMessage(getStaticAlert(finalAlertLevel));
          });
        } else {
          setAlertMessage(getStaticAlert('safe'));
        }
      }
    } catch (error) {
      console.error('Engine pipeline error:', error);
      // Fallback: still try geofence at minimum
      const geoFallback = checkGeofence(position);
      setGeofenceResult(geoFallback);
      if (geoFallback.isInForbiddenZone) {
        onStatusChange('danger');
        onAlert({ type: 'danger', message: geoFallback.statusMessage, zone: 'IMBL' });
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [onAlert, onStatusChange]);

  // Run pipeline on boatData change (throttled to every update)
  useEffect(() => {
    if (!boatData || (boatData.location.lat === 0 && boatData.location.lng === 0)) return;
    runEnginePipeline(boatData);
  }, [boatData, runEnginePipeline]);

  // === RENDER ===

  if (!boatData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center text-gray-500">
          <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-semibold">AI Engine Standby</p>
          <p className="text-sm mt-1">Kalman Filter • Risk Model • Geofence</p>
        </div>
      </div>
    );
  }

  const riskPercent = riskAssessment ? Math.round(riskAssessment.probability * 100) : 0;
  const riskColor = riskPercent > 80 ? 'red' : riskPercent > 50 ? 'yellow' : 'green';

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-50">
      {/* Header */}
      <div className={`p-5 border-b ${
        geofenceResult?.alertLevel === 'violation' ? 'bg-red-50 border-red-100' :
        geofenceResult?.alertLevel === 'high_risk' ? 'bg-orange-50 border-orange-100' :
        geofenceResult?.alertLevel === 'advisory' ? 'bg-yellow-50 border-yellow-100' :
        'bg-blue-600 border-blue-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${
              geofenceResult?.alertLevel === 'violation' ? 'bg-white' : 'bg-white/20'
            }`}>
              <Brain className={`h-6 w-6 ${
                geofenceResult?.alertLevel === 'violation' ? 'text-red-500' : 'text-white'
              }`} />
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-bold tracking-wide uppercase italic ${
                geofenceResult?.alertLevel === 'violation' ? 'text-red-900' :
                geofenceResult?.alertLevel === 'high_risk' ? 'text-orange-900' :
                geofenceResult?.alertLevel === 'advisory' ? 'text-yellow-900' :
                'text-white'
              }`}>AI BORDER ENGINE <span className={`text-[10px] not-italic font-mono ml-2 opacity-60 ${
                geofenceResult?.alertLevel === 'violation' ? 'text-red-600' : 'text-blue-100'
              }`}>v4.2</span></h3>
              <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${
                geofenceResult?.alertLevel === 'violation' ? 'text-red-600' :
                geofenceResult?.alertLevel === 'high_risk' ? 'text-orange-600' :
                geofenceResult?.alertLevel === 'advisory' ? 'text-yellow-600' :
                'text-blue-100'
              }`}>Deterministic Geofencing • Neural Risk Scoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isAnalyzing && <Activity className={`h-4 w-4 animate-pulse ${
              geofenceResult?.alertLevel === 'violation' ? 'text-red-500' : 'text-white'
            }`} />}
            <div className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-widest border shadow-sm ${
              geofenceResult?.alertLevel === 'violation' ? 'bg-red-500 text-white border-red-400 animate-pulse' :
              geofenceResult?.alertLevel === 'high_risk' ? 'bg-orange-500 text-white border-orange-400' :
              geofenceResult?.alertLevel === 'advisory' ? 'bg-yellow-500 text-white border-yellow-400' :
              'bg-white text-blue-600 border-white'
            }`}>
              {geofenceResult?.alertLevel?.replace('_', ' ') || 'SAFE'}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Risk Probability Gauge */}
        <div className="bg-[#0ea5e9] rounded-2xl p-5 shadow-sm text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Gauge className="h-4 w-4 text-blue-100 mr-2" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Boundary Risk Index</span>
            </div>
            <span className="text-2xl font-mono font-bold">
              {riskPercent}<span className="text-sm ml-0.5 opacity-70">%</span>
            </span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div
              className={`risk-progress-bar h-full transition-all duration-1000 ${
                riskColor === 'red' ? 'bg-red-400' :
                riskColor === 'yellow' ? 'bg-yellow-300' : 'bg-green-400'
              }`}
              style={{ '--risk-width': `${riskPercent}%` } as React.CSSProperties}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-blue-100 mt-3 uppercase tracking-wider opacity-80">
            <span>Nominal</span>
            <span className="text-yellow-200">Alert</span>
            <span className="text-red-200 uppercase">Critical</span>
          </div>
        </div>

        {/* IMBL Distance */}
        <div className="flex items-center justify-between bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm transition-all hover:border-blue-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg mr-4">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Distance To Boundary</span>
          </div>
          <span className="font-mono text-xl font-bold text-blue-700">
            {geofenceResult
              ? geofenceResult.distanceToIMBL < 1000
                ? `${Math.round(geofenceResult.distanceToIMBL)}m`
                : `${(geofenceResult.distanceToIMBL / 1000).toFixed(2)}km`
              : 'OFFLINE'}
          </span>
        </div>

        {/* Trajectory Prediction */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-1">
            <Navigation className="h-3 w-3 mr-2 text-blue-500" />
            Predictive Pathing (Kalman)
          </h4>
          {trajectoryPrediction && trajectoryPrediction.predictedPoints.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {trajectoryPrediction.predictedPoints.map((pt: PredictedPoint, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px] bg-white border border-slate-100 rounded-xl px-4 py-3 hover:border-blue-200 shadow-sm transition-all">
                  <span className="text-blue-600 font-bold">+{pt.timeOffsetMs / 60000} MINS</span>
                  <span className="font-mono text-slate-700 font-medium">{pt.lat.toFixed(5)}°N, {pt.lng.toFixed(5)}°E</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 uppercase text-[9px]">Conf:</span>
                    <span className={`font-bold ${pt.confidence > 0.6 ? 'text-green-600' : 'text-amber-600'}`}>
                      {(pt.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-2 font-bold uppercase tracking-widest opacity-70">
                <span>Speed: {trajectoryPrediction.estimatedSpeedMps.toFixed(1)} m/s</span>
                <span>Heading: {trajectoryPrediction.estimatedHeading.toFixed(0)}°</span>
                <span>History: {trackerRef.current.getHistoryLength()} pts</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">Awaiting dynamic movement for trajectory projection...</p>
            </div>
          )}
        </div>

        {/* Risk Factors */}
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center mb-4">
            <Shield className="h-3 w-3 mr-2 text-indigo-500" />
            Vulnerability Vectors
          </h4>
          {riskAssessment && riskAssessment.riskFactors.length > 0 ? (
            <div className="space-y-2">
              {riskAssessment.riskFactors.map((factor, index) => (
                <div key={index} className="flex items-start text-[11px] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className={`w-2 h-2 rounded-full mt-1 mr-3 flex-shrink-0 ${
                    riskPercent > 80 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                    riskPercent > 50 ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-slate-700 font-semibold">{factor}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-none">Scanning for behavioral anomalies...</p>
            </div>
          )}
        </div>

        {/* AI Intelligence Briefing (Bilingual typewriter) */}
        {alertMessage && (
          <div className={`rounded-2xl p-6 border shadow-lg transition-all duration-500 ${
            geofenceResult?.alertLevel === 'violation' ? 'border-red-200 bg-red-50' :
            geofenceResult?.alertLevel === 'high_risk' ? 'border-orange-200 bg-orange-50' :
            'border-blue-200 bg-blue-50'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl flex-shrink-0 shadow-sm ${
                geofenceResult?.alertLevel === 'violation' ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'
              }`}>
                {geofenceResult?.alertLevel === 'violation' ? <Volume2 className="h-5 w-5 animate-pulse" /> : <MessageSquare className="h-5 w-5" />}
              </div>
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                    geofenceResult?.alertLevel === 'violation' ? 'bg-red-600 text-white' : 'bg-blue-700 text-white'
                  }`}>
                    {geofenceResult?.alertLevel === 'violation' ? 'IMMEDIATE THREAT' : 'AI INTELLIGENCE'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <Typewriter 
                    text={alertMessage.english} 
                    speed={20}
                    className="text-sm font-bold text-slate-800 leading-relaxed tracking-tight"
                  />
                  <div className={`h-px w-1/4 ${
                    geofenceResult?.alertLevel === 'violation' ? 'bg-red-200' : 'bg-blue-200'
                  }`} />
                  <Typewriter 
                    text={alertMessage.tamil} 
                    speed={25}
                    className={`text-sm font-bold leading-relaxed font-tamil ${
                      geofenceResult?.alertLevel === 'violation' ? 'text-red-700' : 'text-blue-700'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}


        {/* === LAYER 5: Anomaly Detection Panel === */}
        {anomalyState && (
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                L5: ANOMALY DETECTION
              </h4>
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                anomalyState.anomalyScore >= 60 ? 'bg-red-100 text-red-700' :
                anomalyState.anomalyScore >= 30 ? 'bg-orange-100 text-orange-700' :
                'bg-green-100 text-green-700'
              }`}>
                Score: {anomalyState.anomalyScore}/100
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${
                anomalyState.anomalyScore >= 60 ? 'bg-red-500' :
                anomalyState.anomalyScore >= 30 ? 'bg-orange-400' : 'bg-green-400'
              }`} style={{ width: `${anomalyState.anomalyScore}%` }} />
            </div>
            {anomalyState.lastAnomalies.length === 0 ? (
              <p className="text-[10px] text-green-600 font-bold">✓ No anomalies detected — behavior nominal</p>
            ) : (
              <div className="space-y-2">
                {anomalyState.lastAnomalies.map((ev, idx) => (
                  <div key={idx} className={`rounded-lg px-3 py-2 text-[10px] font-bold border ${
                    ev.severity === 'high' ? 'bg-red-50 border-red-200 text-red-700' :
                    ev.severity === 'medium' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                    'bg-yellow-50 border-yellow-200 text-yellow-700'
                  }`}>
                    <div className="uppercase tracking-wider">{ev.type.replace('_', ' ')} — {ev.severity.toUpperCase()}</div>
                    <div className="mt-0.5 font-normal opacity-80">{lang === 'ta' ? ev.tamilMessage : ev.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Engine Status Terminal */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-wrap gap-x-5 gap-y-2 text-[9px] font-mono text-slate-500 font-bold tracking-tight shadow-inner">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${geofenceResult ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="uppercase">GEOFENCE: {geofenceResult ? 'ONLINE' : 'ERROR'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${trajectoryPrediction?.isStable ? 'bg-green-500' : 'bg-blue-500'}`} />
            <span className="uppercase">KALMAN: {trajectoryPrediction?.isStable ? 'STABLE' : 'CALIBRATING'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="uppercase">RISK_MDL: {riskAssessment ? `${riskPercent}%` : 'PENDING'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${anomalyState ? 'bg-orange-500' : 'bg-slate-300'}`} />
            <span className="uppercase">ANOMALY: {anomalyState ? `${anomalyState.anomalyScore}% RISK` : 'STANDBY'}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="w-1.5 h-1.5 bg-blue-500 animate-pulse rounded-full" />
            <span className="uppercase text-blue-600">GEMINI_V4: REAL-TIME</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIMonitor;