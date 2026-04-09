import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Cpu, Play, Square, Zap, MapPin } from 'lucide-react';
import { userService } from '../services/userService';
import { useLanguage } from '../contexts/LanguageContext';
import { checkGeofence } from '../engines/geofence';
import { distanceToIMBL } from '../engines/geofence';

type Scenario = 'normal' | 'imbl' | 'zigzag' | 'crossing';

interface SimPoint { lat: number; lng: number; speed: number; heading: number; }

// Pre-defined scenario routes in Palk Strait region
const SCENARIOS: Record<Scenario, SimPoint[]> = {
  normal: [
    { lat: 9.2885, lng: 79.31, speed: 4, heading: 45 },
    { lat: 9.295, lng: 79.325, speed: 5, heading: 60 },
    { lat: 9.302, lng: 79.335, speed: 4.5, heading: 45 },
    { lat: 9.308, lng: 79.320, speed: 3.8, heading: 300 },
    { lat: 9.300, lng: 79.306, speed: 4.2, heading: 220 },
    { lat: 9.290, lng: 79.315, speed: 4, heading: 160 },
    { lat: 9.285, lng: 79.310, speed: 3.5, heading: 45 },
  ],
  imbl: [
    { lat: 9.32, lng: 79.40, speed: 5, heading: 90 },
    { lat: 9.33, lng: 79.42, speed: 5.5, heading: 85 },
    { lat: 9.34, lng: 79.44, speed: 6, heading: 88 },
    { lat: 9.35, lng: 79.46, speed: 6, heading: 90 },
    { lat: 9.35, lng: 79.48, speed: 5.8, heading: 90 },
    { lat: 9.35, lng: 79.50, speed: 5, heading: 90 },
    { lat: 9.36, lng: 79.52, speed: 4.5, heading: 80 },
  ],
  zigzag: [
    { lat: 9.36, lng: 79.52, speed: 2.5, heading: 30 },
    { lat: 9.37, lng: 79.525, speed: 2, heading: 150 },
    { lat: 9.365, lng: 79.535, speed: 2.5, heading: 30 },
    { lat: 9.375, lng: 79.540, speed: 2, heading: 200 },
    { lat: 9.368, lng: 79.548, speed: 2.2, heading: 40 },
    { lat: 9.378, lng: 79.553, speed: 1.8, heading: 170 },
    { lat: 9.370, lng: 79.560, speed: 2, heading: 30 },
  ],
  crossing: [
    { lat: 9.30, lng: 79.40, speed: 7, heading: 90 },
    { lat: 9.31, lng: 79.44, speed: 7.5, heading: 88 },
    { lat: 9.32, lng: 79.48, speed: 8, heading: 90 },
    { lat: 9.33, lng: 79.52, speed: 7.8, heading: 90 }, // IMBL
    { lat: 9.34, lng: 79.56, speed: 7.5, heading: 85 }, // VIOLATION
    { lat: 9.35, lng: 79.60, speed: 6, heading: 80 },
    { lat: 9.34, lng: 79.64, speed: 5, heading: 75 },
  ],
};

const SCENARIO_LABELS: Record<Scenario, { en: string; color: string; icon: string }> = {
  normal:   { en: 'Normal Fishing',    color: 'border-green-300 bg-green-50 text-green-700',  icon: '🐟' },
  imbl:     { en: 'IMBL Approach',     color: 'border-yellow-300 bg-yellow-50 text-yellow-700', icon: '⚠️' },
  zigzag:   { en: 'Zig-Zag Pattern',   color: 'border-orange-300 bg-orange-50 text-orange-700', icon: '〰️' },
  crossing: { en: 'Boundary Crossing', color: 'border-red-300 bg-red-50 text-red-700',         icon: '⛔' },
};

const SIM_AIS_ID = 'SIM-TWIN-001';
const SIM_BOAT_ID = 'DIGITAL-TWIN-01';

interface DigitalTwinPanelProps {
  onTwinUpdate?: (lat: number, lng: number, speed: number, heading: number) => void;
}

const DigitalTwinPanel: React.FC<DigitalTwinPanelProps> = ({ onTwinUpdate }) => {
  const { t } = useLanguage();
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [isRunning, setIsRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [currentPos, setCurrentPos] = useState<SimPoint | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSim = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setStepIdx(0);
    setCurrentPos(null);
    onTwinUpdate?.(0, 0, 0, 0);
    // Remove twin from Firebase
    try { await userService.updateVesselStatus(SIM_AIS_ID, 'safe'); } catch { /* ignore */ }
  }, [onTwinUpdate]);

  const startSim = useCallback(async () => {
    const route = SCENARIOS[scenario];
    setStepIdx(0);
    setIsRunning(true);

    // Register twin in Firebase so coast guard can see it
    try {
      await userService.storeVesselData({
        aisId: SIM_AIS_ID,
        boatId: SIM_BOAT_ID,
        fishermanName: `[SIMULATION] ${SCENARIO_LABELS[scenario].en}`,
        contactInfo: 'Digital Twin — Test Only',
        location: { lat: route[0].lat, lng: route[0].lng, timestamp: Date.now() },
        status: 'safe',
        speed: route[0].speed,
        heading: route[0].heading,
        lastUpdate: Date.now(),
      });
    } catch { /* ignore */ }

    let idx = 0;
    intervalRef.current = setInterval(async () => {
      if (idx >= route.length) { await stopSim(); return; }
      const pt = route[idx];
      setCurrentPos(pt);
      setStepIdx(idx + 1);
      onTwinUpdate?.(pt.lat, pt.lng, pt.speed, pt.heading);

      // Update Firebase position — dynamically determine status from geofence
      try {
        const geoResult = checkGeofence({ lat: pt.lat, lng: pt.lng });
        
        // Status mapping: use geofence and distance-based logic
        let status: 'safe' | 'warning' | 'danger' = 'safe';
        if (geoResult.isInForbiddenZone) {
          status = 'danger'; // Crossed IMBL boundary
        } else if (geoResult.alertLevel === 'high_risk') {
          status = 'danger'; // Very close to boundary
        } else if (geoResult.alertLevel === 'advisory') {
          status = 'warning'; // Approaching boundary
        } else if (distanceToIMBL({ lat: pt.lat, lng: pt.lng }) < 3000) {
          // Extra caution: within 3km of boundary
          status = 'warning';
        }

        await userService.storeVesselData({
          aisId: SIM_AIS_ID,
          boatId: SIM_BOAT_ID,
          fishermanName: `[SIM] ${SCENARIO_LABELS[scenario].en}`,
          contactInfo: 'Digital Twin',
          location: { lat: pt.lat, lng: pt.lng, timestamp: Date.now() },
          status,
          speed: pt.speed,
          heading: pt.heading,
          lastUpdate: Date.now(),
        });
      } catch { /* ignore */ }

      idx++;
    }, 3000);
  }, [scenario, onTwinUpdate, stopSim]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-50">
      <div className="bg-gradient-to-r from-violet-700 to-fuchsia-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><Cpu className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest">{t('twin.title')}</h3>
              <p className="text-[10px] text-violet-200 uppercase tracking-widest">Live Firebase · Coast Guard Visible</p>
            </div>
          </div>
          {isRunning && (
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold">{t('twin.running')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Scenario selector */}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{t('twin.scenario')}</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SCENARIO_LABELS) as Scenario[]).map(s => {
              const info = SCENARIO_LABELS[s];
              return (
                <button key={s} onClick={() => !isRunning && setScenario(s)}
                  disabled={isRunning}
                  className={`p-2.5 rounded-xl border-2 text-left transition-all ${scenario === s ? info.color + ' font-bold shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'} ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <div className="text-base mb-0.5">{info.icon}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider leading-tight">{t(`twin.${s}`)}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        {isRunning && (
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
              <span>{t('twin.step')} {stepIdx} / {SCENARIOS[scenario].length}</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-violet-500" />3s interval</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-500"
                style={{ width: `${(stepIdx / SCENARIOS[scenario].length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Current position */}
        {currentPos && (
          <div className="bg-violet-50 rounded-xl p-3 border border-violet-100 text-xs">
            <div className="flex items-center gap-2 text-[10px] font-bold text-violet-700 uppercase tracking-widest mb-2">
              <MapPin className="h-3 w-3" /> Twin Position
            </div>
            <div className="grid grid-cols-2 gap-x-4 font-mono text-slate-600">
              <span>Lat: <b>{currentPos.lat.toFixed(5)}</b></span>
              <span>Lng: <b>{currentPos.lng.toFixed(5)}</b></span>
              <span>Speed: <b>{currentPos.speed.toFixed(1)} kn</b></span>
              <span>Hdg: <b>{currentPos.heading}°</b></span>
            </div>
          </div>
        )}

        {/* Firebase visibility note */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          <span className="text-blue-500 text-sm">🛡️</span>
          <span className="text-[10px] font-bold text-blue-700">{t('twin.visible')}</span>
        </div>

        {/* Start / Stop */}
        <button
          onClick={isRunning ? stopSim : startSim}
          className={`w-full font-bold text-xs py-3 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isRunning
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white'
          }`}
        >
          {isRunning
            ? <><Square className="h-4 w-4" />{t('twin.stop')}</>
            : <><Play className="h-4 w-4" />{t('twin.start')}</>
          }
        </button>
      </div>
    </div>
  );
};

export default DigitalTwinPanel;
