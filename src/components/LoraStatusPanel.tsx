import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Radio, Lock, Database, Zap, CheckCircle, XCircle, Signal } from 'lucide-react';
import { transmitLoRaPacket, getLoRaStats, resetLoRaStats, type LoRaStats, type TransmissionResult } from '../engines/loraSimulator';
import { getBufferStats, bufferPacket } from '../engines/storeAndForwardBuffer';
import { useLanguage } from '../contexts/LanguageContext';
import { BoatData } from '../App';

interface LoraStatusPanelProps {
  boatData: BoatData | null;
  zoneFlag: 0 | 1 | 2;
  anomalyFlag: 0 | 1;
}

interface PacketLog {
  id: string;
  time: string;
  success: boolean;
  rssi: number;
  size: number;
  compressed: number;
}

const LoraStatusPanel: React.FC<LoraStatusPanelProps> = ({ boatData, zoneFlag, anomalyFlag }) => {
  const { t } = useLanguage();
  const [stats, setStats] = useState<LoRaStats | null>(null);
  const [bufferStats, setBufferStats] = useState({ pending: 0, failed: 0, total: 0 });
  const [lastResult, setLastResult] = useState<TransmissionResult | null>(null);
  const [log, setLog] = useState<PacketLog[]>([]);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transmit = useCallback(async () => {
    if (!boatData || isTransmitting) return;
    setIsTransmitting(true);
    try {
      const packet = {
        boatId: boatData.boatId,
        lat: boatData.location.lat,
        lon: boatData.location.lng,
        speed: boatData.speed,
        heading: boatData.heading,
        zone_flag: zoneFlag,
        anomaly_flag: anomalyFlag,
        timestamp: Date.now(),
      };
      const result = await transmitLoRaPacket(packet, 5 + Math.random() * 10);

      if (!result.success) {
        await bufferPacket(packet);
      }

      setLastResult(result);
      const s = getLoRaStats();
      setStats(s);
      const bs = await getBufferStats();
      setBufferStats(bs);

      setLog(prev => [{
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString(),
        success: result.success,
        rssi: result.rssi,
        size: result.packetSizeBytes,
        compressed: result.compressedSizeBytes,
      }, ...prev].slice(0, 6));
    } finally {
      setIsTransmitting(false);
    }
  }, [boatData, zoneFlag, anomalyFlag, isTransmitting]);

  // Auto-transmit every 45 seconds
  useEffect(() => {
    if (!boatData) return;
    transmit();
    intervalRef.current = setInterval(transmit, 45_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [boatData?.aisId, transmit, boatData]);

  useEffect(() => {
    const loadStats = async () => {
      setStats(getLoRaStats());
      setBufferStats(await getBufferStats());
    };
    loadStats();
  }, []);

  const signalBars = (q: LoRaStats['signalQuality']) => {
    const count = q === 'excellent' ? 4 : q === 'good' ? 3 : q === 'fair' ? 2 : q === 'poor' ? 1 : 0;
    const color = count >= 3 ? 'bg-green-400' : count >= 2 ? 'bg-yellow-400' : 'bg-red-400';
    return (
      <div className="flex items-end gap-0.5 h-4">
        {[1,2,3,4].map(i => (
          <div key={i} className={`w-1.5 rounded-sm ${i <= count ? color : 'bg-white/20'}`} style={{ height: `${i * 25}%` }} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-50">
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg"><Radio className="h-5 w-5" /></div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-widest">{t('lora.title')}</h3>
              <p className="text-[10px] text-indigo-200 uppercase tracking-widest">SX1278 · 915 MHz · SF12</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && signalBars(stats.signalQuality)}
            <span className="text-[10px] font-bold uppercase">{stats?.signalQuality.replace('_', ' ') ?? '—'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('lora.packets'), value: stats?.totalPacketsSent ?? 0, icon: <Zap className="h-3.5 w-3.5 text-indigo-500" /> },
            { label: t('lora.buffer'), value: bufferStats.pending, icon: <Database className="h-3.5 w-3.5 text-yellow-500" /> },
            { label: t('lora.success'), value: stats ? `${Math.round((stats.successfulPackets / Math.max(stats.totalPacketsSent, 1)) * 100)}%` : '—', icon: <Signal className="h-3.5 w-3.5 text-green-500" /> },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <div className="flex items-center justify-center mb-1">{m.icon}</div>
              <div className="font-mono text-base font-bold text-slate-800">{m.value}</div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Encryption badge */}
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2">
          <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">{t('lora.encrypted')} — AES-128-CTR · Pre-Shared Key</span>
        </div>

        {/* Last packet detail */}
        {lastResult && (
          <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-700 uppercase text-[10px] tracking-widest">{t('lora.last')}</span>
              <span className={`flex items-center gap-1 font-bold text-[10px] ${lastResult.success ? 'text-green-600' : 'text-red-500'}`}>
                {lastResult.success ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {lastResult.success ? 'TX OK' : 'BUFFERED'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-slate-600">
              <span>{t('lora.size')}: <b>{lastResult.packetSizeBytes}B</b></span>
              <span>{t('lora.compressed')}: <b>{lastResult.compressedSizeBytes}B</b></span>
              <span>RSSI: <b>{lastResult.rssi} dBm</b></span>
              <span>Ratio: <b>{lastResult.compressionRatio.toFixed(1)}x</b></span>
            </div>
            <div className="text-[9px] font-mono text-slate-400 truncate">KEY: {lastResult.encryptedHex}</div>
          </div>
        )}

        {/* Packet Log */}
        {log.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Packet Log</h4>
            {log.map(entry => (
              <div key={entry.id} className="flex items-center gap-2 text-[10px] font-mono text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span className={entry.success ? 'text-green-500' : 'text-red-400'}>{entry.success ? '✓' : '✗'}</span>
                <span className="text-slate-400">{entry.time}</span>
                <span className="ml-auto">{entry.rssi} dBm</span>
                <span>{entry.size}→{entry.compressed}B</span>
              </div>
            ))}
          </div>
        )}

        {/* Manual transmit button */}
        <button
          onClick={transmit}
          disabled={isTransmitting || !boatData}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
        >
          {isTransmitting ? <><span className="animate-spin">⟳</span> Transmitting…</> : <><Radio className="h-3.5 w-3.5" /> {t('lora.transmit')}</>}
        </button>

        <button onClick={() => { resetLoRaStats(); setStats(getLoRaStats()); setLog([]); }}
          className="w-full text-[9px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
          Reset Stats
        </button>
      </div>
    </div>
  );
};

export default LoraStatusPanel;
