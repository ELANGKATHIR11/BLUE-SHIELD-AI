import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock, MapPin } from 'lucide-react';
import { getVesselHistory, getAvailableHistoryVessels, type GPSHistoryPoint } from '../services/replayService';
import { useLanguage } from '../contexts/LanguageContext';
import { BoatData } from '../App';

interface ReplayTrackerProps {
  boats: BoatData[];
  onReplayUpdate?: (trail: [number, number][], current: [number, number] | null) => void;
  userType: 'fisherman' | 'coastguard';
  myAisId?: string;
}

const SPEED_OPTIONS = [1, 2, 5, 10];

const ReplayTracker: React.FC<ReplayTrackerProps> = ({ boats, onReplayUpdate, userType, myAisId }) => {
  const { t } = useLanguage();
  const [selectedAisId, setSelectedAisId] = useState<string>('');
  const [history, setHistory] = useState<GPSHistoryPoint[]>([]);
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [speed, setSpeed] = useState(2);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load available vessel IDs for coast guard; fisherman sees only their own
  useEffect(() => {
    if (userType === 'coastguard') {
      getAvailableHistoryVessels().then(ids => setAvailableIds(ids));
    } else if (myAisId) {
      setAvailableIds([myAisId]);
      setSelectedAisId(myAisId);
    }
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
    }, Math.round(1000 / speed));

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, history, onReplayUpdate]);

  const currentPoint = history[currentIdx];
  const progress = history.length > 0 ? Math.round((currentIdx / (history.length - 1)) * 100) : 0;

  const reset = () => {
    setIsPlaying(false);
    setCurrentIdx(0);
    onReplayUpdate?.([], null);
  };

  // Get boatId label for display
  const getLabel = (aisId: string) => boats.find(b => b.aisId === aisId)?.boatId ?? aisId;

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-50">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg"><Clock className="h-5 w-5" /></div>
          <div>
            <h3 className="font-bold text-sm uppercase tracking-widest">{t('replay.title')}</h3>
            <p className="text-[10px] text-teal-100 uppercase tracking-widest">GPS History Playback · max 200 pts</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Vessel selector */}
        {userType === 'coastguard' && (
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{t('replay.vessel')}</label>
            <select
              value={selectedAisId}
              onChange={e => setSelectedAisId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              title="Select vessel for replay"
            >
              <option value="">— {t('replay.vessel')} —</option>
              {availableIds.map(id => (
                <option key={id} value={id}>{getLabel(id)} ({id})</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={loadHistory}
          disabled={!selectedAisId || isLoading}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 rounded-xl uppercase tracking-widest transition-all"
        >
          {isLoading ? '⏳ Loading…' : t('replay.load')}
        </button>

        {history.length === 0 && !isLoading && (
          <p className="text-center text-[11px] text-slate-400 py-4">{t('replay.no_history')}</p>
        )}

        {history.length > 0 && (
          <>
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>{currentIdx + 1} / {history.length} pts</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }} />
              </div>
              <input
                type="range" min={0} max={history.length - 1} value={currentIdx}
                onChange={e => {
                  const idx = Number(e.target.value);
                  setCurrentIdx(idx);
                  setIsPlaying(false);
                  const trail: [number, number][] = history.slice(0, idx + 1).map(p => [p.lat, p.lng]);
                  onReplayUpdate?.(trail, [history[idx].lat, history[idx].lng]);
                }}
                className="w-full mt-1 accent-teal-600"
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <button onClick={() => setIsPlaying(p => !p)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all uppercase tracking-widest flex-1 justify-center">
                {isPlaying ? <><Pause className="h-4 w-4" />{t('replay.pause')}</> : <><Play className="h-4 w-4" />{t('replay.play')}</>}
              </button>
              <button onClick={reset}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl transition-all">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {/* Speed selector */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('replay.speed')}:</span>
              {SPEED_OPTIONS.map(s => (
                <button key={s} onClick={() => setSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${speed === s ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s}x
                </button>
              ))}
            </div>

            {/* Current point info */}
            {currentPoint && (
              <div className="bg-teal-50 rounded-xl p-3 border border-teal-100 text-xs space-y-1">
                <div className="flex items-center gap-2 text-[10px] font-bold text-teal-700 uppercase tracking-widest">
                  <MapPin className="h-3 w-3" />{t('replay.position')}
                </div>
                <div className="grid grid-cols-2 gap-x-4 font-mono text-slate-600">
                  <span>Lat: <b>{currentPoint.lat.toFixed(5)}</b></span>
                  <span>Lng: <b>{currentPoint.lng.toFixed(5)}</b></span>
                  <span>Speed: <b>{currentPoint.speed.toFixed(1)} kn</b></span>
                  <span>Hdg: <b>{currentPoint.heading}°</b></span>
                </div>
                <div className="text-[9px] text-slate-400">{new Date(currentPoint.timestamp).toLocaleString()}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReplayTracker;
