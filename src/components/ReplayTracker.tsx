/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, FastForward, Clock, History } from 'lucide-react';
import { getVesselHistory, getAvailableHistoryVessels, GPSHistoryPoint } from '../engines/gpsHistoryBuffer';
import { useLanguage } from '../contexts/LanguageContext';
import { BoatData } from '../App';

interface ReplayTrackerProps {
  boats: BoatData[];
  onReplayUpdate?: (trail: [number, number][], currentPoint: [number, number] | null) => void;
  userType?: 'fisherman' | 'coastguard';
  myAisId?: string;
}

const SPEED_OPTIONS = [1, 2, 5, 10];

export const ReplayTracker: React.FC<ReplayTrackerProps> = ({
  boats,
  onReplayUpdate,
  userType,
  myAisId
}) => {
  const { t } = useLanguage();
  const [selectedAisId, setSelectedAisId] = useState<string>(myAisId || '');
  const [history, setHistory] = useState<GPSHistoryPoint[]>([]);
  const [availableIds, setAvailableIds] = useState<string[]>(myAisId ? [myAisId] : []);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [speed, setSpeed] = useState(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load available vessel IDs
  useEffect(() => {
    let isMounted = true;
    if (userType === 'coastguard') {
      getAvailableHistoryVessels().then(ids => {
        if (isMounted) setAvailableIds(ids);
      });
    } else if (myAisId) {
      setAvailableIds([myAisId]);
      setSelectedAisId(myAisId);
    }
    return () => {
      isMounted = false;
    };
  }, [userType, myAisId]);

  const loadHistory = useCallback(async () => {
    if (!selectedAisId) return;
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentIdx(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const data = await getVesselHistory(selectedAisId, 200);
      setHistory(data);
      onReplayUpdate?.([], null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAisId, onReplayUpdate]);

  // Playback loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying || history.length === 0) return;

    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => {
        const next = prev + 1;
        if (next >= history.length) {
          setIsPlaying(false);
          return prev;
        }
        const trail: [number, number][] = history.slice(0, next + 1).map(p => [p.lat, p.lng]);
        const current: [number, number] = [history[next].lat, history[next].lng];
        onReplayUpdate?.(trail, current);
        return next;
      });
    }, Math.max(50, Math.round(1000 / speed)));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, history, speed, onReplayUpdate]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIdx(0);
    if (history.length > 0) {
      onReplayUpdate?.([[history[0].lat, history[0].lng]], [history[0].lat, history[0].lng]);
    }
  };

  const currentPoint = history[currentIdx];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-50">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg"><History className="h-5 w-5 text-cyan-400" /></div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest">{t('replay.title')}</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('replay.subtitle')}</p>
            </div>
          </div>
          {history.length > 0 && (
            <span className="bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
              {history.length} pts
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Vessel Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedAisId}
            onChange={e => setSelectedAisId(e.target.value)}
            className="flex-1 text-xs border border-slate-200 rounded-xl p-2.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
          >
            <option value="">{t('replay.select_vessel')}</option>
            {availableIds.map(id => {
              const b = boats.find(boat => boat.aisId === id);
              return (
                <option key={id} value={id}>
                  {b ? `${b.boatId} (${b.fishermanName})` : id}
                </option>
              );
            })}
          </select>
          <button
            onClick={loadHistory}
            disabled={!selectedAisId || isLoading}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            {isLoading ? '...' : t('replay.load')}
          </button>
        </div>

        {history.length > 0 ? (
          <div className="space-y-3">
            {/* Timeline Progress */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>{new Date(history[0].timestamp).toLocaleTimeString()}</span>
                <span className="font-bold text-slate-700">
                  {currentIdx + 1} / {history.length}
                </span>
                <span>{new Date(history[history.length - 1].timestamp).toLocaleTimeString()}</span>
              </div>
              <input
                type="range"
                min={0}
                max={history.length - 1}
                value={currentIdx}
                onChange={e => {
                  const idx = parseInt(e.target.value);
                  setCurrentIdx(idx);
                  const trail: [number, number][] = history.slice(0, idx + 1).map(p => [p.lat, p.lng]);
                  onReplayUpdate?.(trail, [history[idx].lat, history[idx].lng]);
                }}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Current Point Telemetry */}
            {currentPoint && (
              <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-4 gap-2 text-center font-mono">
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">{t('dashboard.lat')}</div>
                  <div className="text-xs font-bold text-slate-800">{currentPoint.lat.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">{t('dashboard.lng')}</div>
                  <div className="text-xs font-bold text-slate-800">{currentPoint.lng.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">{t('dashboard.speed')}</div>
                  <div className="text-xs font-bold text-slate-800">{currentPoint.speed.toFixed(1)} kn</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">{t('dashboard.heading')}</div>
                  <div className="text-xs font-bold text-slate-800">{currentPoint.heading.toFixed(0)}°</div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(p => !p)}
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-200 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <FastForward className="h-3 w-3 text-slate-400 ml-1" />
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      speed === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">{t('replay.no_history')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplayTracker;
