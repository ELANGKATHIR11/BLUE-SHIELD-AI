/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
import React, { useState, useEffect } from 'react';
import { GPSFreshnessStatus } from '../services/offlineStorageService';

interface DataFreshnessBadgeProps {
  gpsStatus?: GPSFreshnessStatus;
  lastUpdate?: number;
  accuracy?: number;
  source?: string;
  isOnline?: boolean;
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  gpsStatus = 'LIVE',
  lastUpdate,
  accuracy = 5,
  source = 'browser-gps',
  isOnline = true,
}) => {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastUpdate) {
      setSecondsAgo(null);
      return;
    }
    const updateDiff = () => {
      setSecondsAgo(Math.max(0, Math.round((Date.now() - lastUpdate) / 1000)));
    };
    updateDiff();
    const interval = setInterval(updateDiff, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const getStatusColor = (status: GPSFreshnessStatus) => {
    switch (status) {
      case 'LIVE':
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      case 'DEGRADED':
        return 'bg-amber-400';
      case 'STALE':
        return 'bg-orange-500';
      case 'OFFLINE':
      default:
        return 'bg-rose-500';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-mono bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg shadow-sm">
      {/* GPS Status */}
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${getStatusColor(gpsStatus)}`} />
        <span className="text-slate-300">
          GPS: <span className="font-bold text-white uppercase">{gpsStatus}</span>
        </span>
      </div>

      <span className="text-slate-600">|</span>

      {/* Accuracy */}
      <div className="text-slate-300">
        ACCURACY: <span className={`font-semibold ${accuracy > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>±{accuracy.toFixed(0)}m</span>
      </div>

      <span className="text-slate-600">|</span>

      {/* Latency / Age */}
      <div className="text-slate-300">
        AGE: <span className="font-semibold text-white">{secondsAgo !== null ? `${secondsAgo}s` : 'N/A'}</span>
      </div>

      <span className="text-slate-600">|</span>

      {/* Source */}
      <div className="text-slate-300">
        SOURCE: <span className="font-bold text-cyan-400 uppercase">{source}</span>
      </div>

      {!isOnline && (
        <>
          <span className="text-slate-600">|</span>
          <span className="px-1.5 py-0.5 rounded bg-rose-600/80 text-white font-bold text-[10px]">
            LOCAL OFFLINE
          </span>
        </>
      )}
    </div>
  );
};

export default DataFreshnessBadge;
