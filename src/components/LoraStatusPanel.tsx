/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 * ============================================================================
 */
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

  // Auto-transmit every 45 seconds (decoupled with setTimeout)
  useEffect(() => {
    if (!boatData) return;
    const timer = setTimeout(() => {
      transmit();
    }, 500);
    intervalRef.current = setInterval(transmit, 45_000);
    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
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
          <div className="bg-indigo-50 rounded-xl p-2.5 text-center border border-indigo-100">
            <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{t('lora.packets')}</div>
            <div className="font-mono font-bold text-lg text-indigo-900">{stats?.totalPackets ?? 0}</div>
            <div className="text-[9px] text-indigo-500">{stats?.successRate.toFixed(1) ?? '100'}% {t('lora.delivery')}</div>
          </div>
          <div className="bg-purple-50 rounded-xl p-2.5 text-center border border-purple-100">
            <div className="text-[9px] font-bold text-purple-400 uppercase tracking-wider">{t('lora.compression')}</div>
            <div className="font-mono font-bold text-lg text-purple-900">{stats?.avgCompressionRatio ?? '58'}%</div>
            <div className="text-[9px] text-purple-500">Delta+Bitpack</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('lora.buffer')}</div>
            <div className="font-mono font-bold text-lg text-slate-800">{bufferStats.pending}</div>
            <div className="text-[9px] text-slate-500">{t('lora.buffered')}</div>
          </div>
        </div>

        {/* Security & Protocol Specs */}
        <div className="bg-slate-900 rounded-xl p-3 text-white font-mono text-xs space-y-1.5">
          <div className="flex items-center justify-between text-indigo-300">
            <span className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-green-400" />
              <span>{t('lora.encryption')}</span>
            </span>
            <span className="text-[10px] bg-green-900/60 text-green-300 px-2 py-0.5 rounded-full font-bold">AES-128-CBC</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>{t('lora.bandwidth')}</span>
            <span className="text-white">125 kHz · CR 4/5</span>
          </div>
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>{t('lora.frequency')}</span>
            <span className="text-white">915 MHz ISM (868/915 Dual-Band)</span>
          </div>
          {lastResult && (
            <div className="flex items-center justify-between text-slate-400 text-[10px] pt-1 border-t border-slate-800">
              <span>{t('lora.last_rssi')}</span>
              <span className={lastResult.rssi > -100 ? 'text-green-400' : 'text-yellow-400'}>
                {lastResult.rssi.toFixed(0)} dBm (SNR {lastResult.snr.toFixed(1)} dB)
              </span>
            </div>
          )}
        </div>

        {/* Manual Transmit Button */}
        <button
          onClick={transmit}
          disabled={isTransmitting || !boatData}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md ${
            isTransmitting || !boatData
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-200 active:scale-98'
          }`}
        >
          <Zap className={`h-3.5 w-3.5 ${isTransmitting ? 'animate-bounce' : ''}`} />
          {isTransmitting ? t('lora.transmitting') : t('lora.transmit_btn')}
        </button>

        {/* Transmission Log */}
        {log.length > 0 && (
          <div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
              <span>{t('lora.log_title')}</span>
              <button onClick={() => { resetLoRaStats(); setStats(getLoRaStats()); setLog([]); }} className="text-indigo-500 hover:underline">
                {t('lora.reset')}
              </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[10px]">
              {log.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-1.5 rounded-lg ${item.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <span className="flex items-center gap-1">
                    {item.success ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                    <span>{item.time}</span>
                  </span>
                  <span>{item.compressed}B ({item.size}B raw)</span>
                  <span>{item.rssi.toFixed(0)} dBm</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoraStatusPanel;
