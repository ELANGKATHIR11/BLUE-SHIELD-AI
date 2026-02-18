import React, { useState, useEffect, useRef } from 'react';
import { Satellite, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { getGeolocationErrorMessage, checkGeolocationSupport } from '../utils/geolocationDebug';

interface LocationTrackerProps {
  onLocationUpdate: (lat: number, lng: number) => void;
  isTracking: boolean;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ onLocationUpdate, isTracking }) => {
  const [locationStatus, setLocationStatus] = useState<'requesting' | 'granted' | 'denied' | 'unavailable' | 'timeout'>('requesting');
  const [accuracy, setAccuracy] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Use ref to store the latest callback without causing re-renders
  const onLocationUpdateRef = useRef(onLocationUpdate);
  onLocationUpdateRef.current = onLocationUpdate;

  useEffect(() => {
    if (!isTracking) return;

    const support = checkGeolocationSupport();
    if (!support.supported) {
      setLocationStatus('unavailable');
      setErrorMessage(support.message);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocationStatus('granted');
        setAccuracy(position.coords.accuracy);
        setLastUpdate(Date.now());
        onLocationUpdateRef.current(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        const msg = getGeolocationErrorMessage(error);
        setErrorMessage(msg);
        setLocationStatus(error.code === 3 ? 'timeout' : error.code === 1 ? 'denied' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);


  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-50">
      <div className="bg-gradient-to-r from-sky-600 to-blue-600 p-5 flex items-center justify-between">
        <div className="flex items-center">
          <Satellite className="h-5 w-5 text-white mr-2" />
          <h2 className="text-lg font-bold text-white tracking-wide uppercase italic">GPS CONSOLE</h2>
        </div>
        <div className={`flex items-center bg-white/20 px-3 py-1 rounded-lg border border-white/30 ${
          locationStatus === 'granted' ? 'text-green-50' : 'text-orange-50'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            locationStatus === 'granted' ? 'bg-green-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-orange-400 animate-pulse'
          }`} />
          <span className="text-[10px] font-bold uppercase tracking-widest">{locationStatus.toUpperCase()}</span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0ea5e9] p-5 rounded-2xl shadow-sm text-center group transition-all">
            <MapPin className="h-5 w-5 text-white mx-auto mb-2 opacity-90 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mb-1">Signal Variance</div>
            <div className="font-mono text-sm font-bold text-white tracking-tight">
              {accuracy > 0 ? `±${accuracy.toFixed(1)}m` : 'SIGNAL LOSS'}
            </div>
          </div>
          
          <div className="bg-[#0ea5e9] p-5 rounded-2xl shadow-sm text-center group transition-all">
            <Satellite className="h-5 w-5 text-white mx-auto mb-2 opacity-90 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] text-blue-100 font-bold uppercase tracking-wider mb-1">Telemetry Sync</div>
            <div className="font-mono text-sm font-bold text-white tracking-tight">
              {lastUpdate > 0 ? `${Math.round((Date.now() - lastUpdate) / 1000)}s AGO` : 'NO LINK'}
            </div>
          </div>
        </div>

        {locationStatus === 'granted' && (
          <div className="flex items-center justify-center p-3 bg-green-50 rounded-xl border border-green-100 text-green-700 gap-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Vessel Telemetry Lock Established</span>
          </div>
        )}

        {['denied', 'unavailable', 'timeout'].includes(locationStatus) && (
          <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-bold uppercase text-[10px] tracking-widest text-red-600 mb-1">Link Failure</p>
                <p className="text-xs text-slate-600 mb-3">{errorMessage}</p>
                
                {/* Simulation Fallback */}
                <div className="mt-3 pt-3 border-t border-red-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-3">Emergency Override</p>
                  <button
                    onClick={() => {
                      // Palk Strait coordinates (approx between India and Sri Lanka)
                      const simLat = 9.35 + (Math.random() * 0.1);
                      const simLng = 79.25 + (Math.random() * 0.1);
                      setLocationStatus('granted');
                      setAccuracy(5);
                      setLastUpdate(Date.now());
                      onLocationUpdateRef.current(simLat, simLng);
                      console.log('🚢 SIMULATION: Live GPS activated (Manual override)');
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-[0.98]"
                  >
                    Simulate Live GPS Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationTracker;
