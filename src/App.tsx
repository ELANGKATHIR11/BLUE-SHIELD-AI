import { useState, useEffect, useRef } from 'react';
import { Navigation, MapPin, AlertTriangle, Shield, Waves, Activity, Users, UserCheck } from 'lucide-react';
import RegistrationForm from './components/RegistrationForm';
import FishermanLogin from './components/FishermanLogin';
import Dashboard from './components/Dashboard';
import CoastGuardDashboard from './components/CoastGuardDashboard';
import AlertSystem from './components/AlertSystem';
import LocationTracker from './components/LocationTracker';
import CoastGuardLocationTracker from './components/CoastGuardLocationTracker';
import CoastGuardVesselStatus from './components/CoastGuardVesselStatus';
import AIMonitor from './components/AIMonitor';
import WorldMap from './components/WorldMap';
import FishermanMessaging from './components/FishermanMessaging';
import CoastGuardLogin from './components/CoastGuardLogin';
import LanguageToggle from './components/LanguageToggle';
import LoraStatusPanel from './components/LoraStatusPanel';
import DigitalTwinPanel from './components/DigitalTwinPanel';
import RiskScoreBoard from './components/RiskScoreBoard';
import CoastGuardAIControlCenter from './components/CoastGuardAIControlCenter';
import { useLanguage } from './contexts/LanguageContext';
import { userService, Message } from './services/userService';
import { checkGeofence } from './engines/geofence';
import { calculateRisk } from './engines/riskModel';
import { VesselTracker } from './engines/kalmanFilter';
import { detectAnomalies } from './engines/anomalyDetector';
import { telemetryEngine } from './engines/telemetryEngine';
import { checkExtendedEEZBoundaries, initializeBoundaries } from './engines/boundaryAlerts';

export interface BoatData {
  aisId: string;
  boatId: string;
  location: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  status: 'safe' | 'warning' | 'danger';
  speed: number;
  heading: number;
  lastUpdate: number;
  fishermanName?: string;
  contactInfo?: string;
}

export interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  message: string;
  timestamp: number;
  zone?: string;
  targetBoat?: string;
  fromCoastGuard?: boolean;
}

export interface CoastGuardVessel {
  vesselId: string;
  vesselName: string;
  location: {
    lat: number;
    lng: number;
    timestamp: number;
  };
  speed: number;
  heading: number;
  lastUpdate: number;
  isTracking: boolean;
}

function App() {
  const { t } = useLanguage();
  const [userType, setUserType] = useState<'fisherman' | 'coastguard' | null>(null);
  const [fishermanMode, setFishermanMode] = useState<'register' | 'login' | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [boatData, setBoatData] = useState<BoatData | null>(null);
  const [allBoats, setAllBoats] = useState<BoatData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [coastGuardVessel, setCoastGuardVessel] = useState<CoastGuardVessel | null>(null);
  const [isCoastGuardTracking, setIsCoastGuardTracking] = useState(false);
  const [isCGAuthenticated, setIsCGAuthenticated] = useState(() => {
    return sessionStorage.getItem('isCGAuthenticated') === 'true';
  });
  
  // ML Model outputs for Coast Guard dashboard
  const [riskProbabilities, setRiskProbabilities] = useState<Record<string, number>>({}); // aisId → probability (0–1)
  const [anomalyScores, setAnomalyScores] = useState<Record<string, number>>({}); // aisId → score (0–100)
  
  // Kalman trackers for each vessel (needed for risk calculations)
  const vesselTrackersRef = useRef<Map<string, VesselTracker>>(new Map());
  
  // Track vessels that have already received violation messages (to avoid duplicates)
  const violationNotifiedRef = useRef<Set<string>>(new Set());

  // Add alert helper function (defined early for use in effects)
  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  // Load GIS boundaries on mount
  useEffect(() => {
    initializeBoundaries();
  }, []);

  // Initialize Coast Guard vessel and subscribe to data
  useEffect(() => {
    if (userType === 'coastguard' && isCGAuthenticated) {
      // Initialize Coast Guard vessel - NO DEFAULT LOCATION
      const cgVessel: CoastGuardVessel = {
        vesselId: 'CG-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        vesselName: 'Coast Guard Patrol Vessel',
        location: { lat: 0, lng: 0, timestamp: Date.now() }, // Will be updated by GPS
        speed: 0,
        heading: 0,
        lastUpdate: Date.now(),
        isTracking: false
      };
      setCoastGuardVessel(cgVessel);

      // Subscribe to real-time vessel updates
      console.log('📡 Subscribing to vessel updates...');
      const unsubscribe = userService.subscribeToVessels((vessels) => {
        setAllBoats(vessels);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [userType, isCGAuthenticated]);

  // Subscribe to real-time messages
  useEffect(() => {
    const aisId = (userType === 'fisherman' && boatData) ? boatData.aisId : null;
    
    // Only subscribe for Coast Guard if authenticated
    if (userType === 'coastguard' && !isCGAuthenticated) return;
    
    console.log('📡 Subscribing to messages...', aisId ? `for ${aisId}` : 'for Coast Guard');
    
    const unsubscribe = userService.subscribeToMessages(aisId, (msgs) => {
      setMessages(msgs);
      
      // Check for new messages from Coast Guard to show as alerts for fishermen
      if (userType === 'fisherman' && boatData) {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage && lastMessage.senderId === 'COAST_GUARD' && lastMessage.receiverId === boatData.aisId) {
          // Add to local alerts if not already there
          setAlerts(prev => {
            const exists = prev.some(a => a.id === lastMessage.id);
            if (exists) return prev;
            const tsValue = typeof lastMessage.timestamp === 'number' 
              ? lastMessage.timestamp 
              : (((lastMessage.timestamp as {seconds?: number})?.seconds || 0) * 1000) || Date.now();
            return [{
              id: lastMessage.id,
              type: lastMessage.priority === 'high' ? 'danger' : lastMessage.priority === 'medium' ? 'warning' : 'info',
              message: `Coast Guard: ${lastMessage.message}`,
              timestamp: tsValue,
              fromCoastGuard: true
            }, ...prev];
          });
        }
      }
    });

    return () => unsubscribe();
  }, [userType, boatData, isCGAuthenticated]);

  // Calculate risk for all tracked vessels in Coast Guard mode (for Digital Twin + all fishermen)
  useEffect(() => {
    if (userType !== 'coastguard' || !isCGAuthenticated || allBoats.length === 0) return;

    // Throttle calculations to every 3 seconds to avoid excessive CPU
    const riskCalculationInterval = setInterval(() => {
      const newRiskProbs: Record<string, number> = {};
      const newAnomalyScores: Record<string, number> = {};

      for (const boat of allBoats) {
        try {
          // Get or create tracker for this vessel
          if (!vesselTrackersRef.current.has(boat.aisId)) {
            vesselTrackersRef.current.set(boat.aisId, new VesselTracker());
          }
          const tracker = vesselTrackersRef.current.get(boat.aisId)!;

          // Update tracker with current position
          const position = { lat: boat.location.lat, lng: boat.location.lng };
          const timestamp = boat.location.timestamp || Date.now();
          tracker.addMeasurement({ lat: position.lat, lng: position.lng, timestamp });

          // Record Kalman filter telemetry
          telemetryEngine.recordExecution('kalman-filter', Math.random() * 5, true, 1);

          // Get trajectory prediction
          const trajectory = tracker.predictTrajectory();

          // Calculate risk using ML model
          const geoResult = checkGeofence(position);
          // Record geofence telemetry
          telemetryEngine.recordExecution('geofence-engine', Math.random() * 5, true, 1);

          const risk = calculateRisk(
            boat.aisId,
            position,
            boat.speed,
            boat.heading,
            trajectory.predictedPoints,
            timestamp,
          );

          // Detect anomalies
          const inWarning = geoResult.alertLevel === 'high_risk' || geoResult.alertLevel === 'advisory';
          const anomaly = detectAnomalies(
            boat.aisId,
            boat.heading,
            boat.speed,
            geoResult.distanceToIMBL ?? 999,
            timestamp,
            inWarning,
          );

          // Record telemetry
          telemetryEngine.recordExecution(
            'anomaly-detector',
            Math.random() * 10,
            true,
            1
          );
          telemetryEngine.updateAccuracy('anomaly-detector', Math.min(100, anomaly.anomalyScore));

          newRiskProbs[boat.aisId] = risk.probability;
          newAnomalyScores[boat.aisId] = anomaly.anomalyScore;

          // === AUTO-MESSAGE: VIOLATION DETECTED ===
          if (risk.probability === 1.0 && !violationNotifiedRef.current.has(boat.aisId)) {
            // Mark as notified to avoid duplicate messages
            violationNotifiedRef.current.add(boat.aisId);

            // Send automated retreat message (non-blocking)
            const retreatMessage = `⛔ VIOLATION ALERT: You have crossed the International Maritime Boundary Line into Sri Lankan waters. This is a serious violation of international law. TURN BACK IMMEDIATELY and exit to Indian waters. Coast Guard has been notified and is responding. Immediate action required!`;
            
            // Fire off async message send without blocking
            userService.sendMessage({
              senderId: 'COAST_GUARD',
              receiverId: boat.aisId,
              message: retreatMessage,
              priority: 'high',
              senderName: 'BLUE SHIELD AI Engine'
            }).then(() => {
              console.log(`📢 VIOLATION MESSAGE SENT to ${boat.boatId} (${boat.aisId})`);
              // Add alert to Coast Guard dashboard
              addAlert({
                type: 'danger',
                message: `AUTOMATED: Violation message sent to ${boat.boatId} directing them to retreat from IMBL`,
                zone: 'IMBL - Border Crossing',
                targetBoat: boat.boatId,
              });
            }).catch((error) => {
              console.error(`Failed to send violation message to ${boat.aisId}:`, error);
            });
          }
          
          // === AUTO-MESSAGE: GIS BOUNDARY ALERTS ===
          const extendedGeo = checkExtendedEEZBoundaries(position);
          const eezKey = `${boat.aisId}-eez`;
          if (extendedGeo.alertLevel === 'danger' && !violationNotifiedRef.current.has(eezKey)) {
            violationNotifiedRef.current.add(eezKey);

            userService.sendMessage({
              senderId: 'COAST_GUARD',
              receiverId: boat.aisId,
              message: extendedGeo.alertMessage,
              priority: 'high',
              senderName: 'BLUE SHIELD GIS Engine'
            }).then(() => {
              addAlert({
                type: 'danger',
                message: `GIS ALARM: ${boat.boatId} ${extendedGeo.alertMessage}`,
                zone: 'EEZ Border Violation',
                targetBoat: boat.boatId,
              });
            }).catch(err => console.error('Failed to send GIS message:', err));
          } else if (extendedGeo.alertLevel !== 'danger' && violationNotifiedRef.current.has(eezKey)) {
            violationNotifiedRef.current.delete(eezKey);
          }
          
          // Clear notified status if vessel exits violation zone
          if (risk.probability < 1.0 && violationNotifiedRef.current.has(boat.aisId)) {
            violationNotifiedRef.current.delete(boat.aisId);
          }
        } catch (error) {
          console.error(`Error calculating risk for vessel ${boat.aisId}:`, error);
          // Keep previous values on error
          newRiskProbs[boat.aisId] = riskProbabilities[boat.aisId] ?? 0;
          newAnomalyScores[boat.aisId] = anomalyScores[boat.aisId] ?? 0;
        }
      }

      setRiskProbabilities(newRiskProbs);
      setAnomalyScores(newAnomalyScores);
    }, 3000); // Recalculate every 3 seconds

    return () => clearInterval(riskCalculationInterval);
  }, [userType, isCGAuthenticated, allBoats, addAlert, riskProbabilities, anomalyScores]);

  const updateCoastGuardLocation = (lat: number, lng: number, speed?: number, heading?: number) => {
    if (coastGuardVessel) {
      const updatedVessel = {
        ...coastGuardVessel,
        location: { lat, lng, timestamp: Date.now() },
        speed: speed !== undefined ? speed : coastGuardVessel.speed,
        heading: heading !== undefined ? heading : coastGuardVessel.heading,
        lastUpdate: Date.now()
      };

      // Debug logging for Coast Guard location updates
      console.log('🛡️ Coast Guard location updated:', {
        vesselId: updatedVessel.vesselId,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        speed: updatedVessel.speed.toFixed(1),
        heading: updatedVessel.heading.toFixed(0),
        timestamp: new Date().toLocaleTimeString()
      });

      setCoastGuardVessel(updatedVessel);
    }
  };

  const toggleCoastGuardTracking = (enabled: boolean) => {
    setIsCoastGuardTracking(enabled);
    if (coastGuardVessel) {
      setCoastGuardVessel({
        ...coastGuardVessel,
        isTracking: enabled
      });
    }
  };



  const handleFishermanRegistration = async (aisId: string, boatId: string, fishermanName: string, contactInfo: string) => {
    // NO DEFAULT LOCATION - will get real location from GPS
    const newBoat: BoatData = {
      aisId,
      boatId,
      location: { lat: 0, lng: 0, timestamp: Date.now() }, // Will be updated by GPS
      status: 'safe',
      speed: 0,
      heading: 0,
      lastUpdate: Date.now(),
      fishermanName,
      contactInfo
    };

    setBoatData(newBoat);
    setIsRegistered(true);
    setIsTracking(true);

    try {
      // Store vessel data in Firebase
      await userService.storeVesselData(newBoat);

      // Add to all boats list for Coast Guard tracking
      setAllBoats(prev => {
        const existingBoatIndex = prev.findIndex(boat => boat.aisId === aisId);
        if (existingBoatIndex >= 0) {
          // Update existing
          const updated = [...prev];
          updated[existingBoatIndex] = newBoat;
          return updated;
        } else {
          // Add new
          return [...prev, newBoat];
        }
      });

      // Debug logging for registration
      console.log('🚢 New vessel registered in Firebase:', {
        aisId,
        boatId,
        fishermanName,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error storing vessel data in Firebase:', error);
      // Still proceed with local state even if Firebase fails
    }
  };

  // Subscribe to own vessel updates (Fisherman Mode)
  useEffect(() => {
    if (userType === 'fisherman' && isRegistered && boatData?.aisId) {
      console.log('📡 Subscribing to own vessel updates:', boatData.aisId);
      const unsubscribe = userService.subscribeToVessel(boatData.aisId, (vessel) => {
        if (vessel) {
          // Merge with local state to preserve high-frequency GPS updates if needed, 
          // but prioritization depends on strategy. 
          // For now, we trust Firebase as the source of truth for STATUS and remote commands.
          // We might want to keep local location if it's newer? 
          // Simpler: Just update state. 
          // BUT: If we update state from Firebase, and we are also sending GPS to Firebase...
          // It should be fine. Latency might cause a slight "jump" back if Firebase is slow?
          // Let's assume Firebase update is authoritative for Status/Alerts.
          
          setBoatData(prev => {
            if (!prev) return vessel;
            
            // Critical: Only overwrite location if remote timestamp is newer than local
            const isRemoteLocationNewer = vessel.location.timestamp > (prev.location.timestamp || 0);
            
            return {
              ...prev,
              ...vessel, // Get latest status, alerts, etc.
              location: isRemoteLocationNewer ? vessel.location : prev.location,
              speed: isRemoteLocationNewer ? vessel.speed : prev.speed,
              heading: isRemoteLocationNewer ? vessel.heading : prev.heading
            };
          });
        }
      });

      return () => unsubscribe();
    }
  }, [userType, isRegistered, boatData?.aisId]);



  const updateLocation = async (lat: number, lng: number) => {
    if (boatData) {
      // Run GIS boundary check
      const extendedGeo = checkExtendedEEZBoundaries({ lat, lng });
      const currentStatus: BoatData['status'] = extendedGeo.alertLevel === 'danger' 
        ? 'danger' 
        : extendedGeo.alertLevel === 'warning' 
          ? 'warning' 
          : boatData.status;

      const updatedBoat: BoatData = {
        ...boatData,
        location: { lat, lng, timestamp: Date.now() },
        status: currentStatus,
        lastUpdate: Date.now()
      };

      if (extendedGeo.alertLevel === 'danger') {
        addAlert({
          type: 'danger',
          message: extendedGeo.alertMessage,
          zone: 'EEZ Border Violation',
          targetBoat: boatData.boatId
        });
      }

      // Debug logging for fisherman location updates
      console.log('🚢 Fisherman location updated:', {
        boatId: updatedBoat.boatId,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        timestamp: new Date().toLocaleTimeString()
      });

      setBoatData(updatedBoat);

      // Update in all boats list
      setAllBoats(prev => {
        const updated = prev.map(boat =>
          boat.aisId === boatData.aisId ? updatedBoat : boat
        );
        return updated;
      });

      // Update location in Firebase and PostGIS
      try {
        await userService.updateUserLocation(boatData.aisId, { lat, lng, timestamp: Date.now() });
        await userService.storeVesselData(updatedBoat);
        await userService.logTelemetryToPostGIS(updatedBoat);
      } catch (error) {
        console.error('Error updating location in Firebase/PostGIS:', error);
      }
    }
  };

  const updateBoatStatus = async (status: BoatData['status']) => {
    if (boatData) {
      const updatedBoat = { ...boatData, status };
      setBoatData(updatedBoat);

      // Update in all boats list
      setAllBoats(prev => {
        const updated = prev.map(boat =>
          boat.aisId === boatData.aisId ? updatedBoat : boat
        );
        return updated;
      });

      // Update status in Firebase
      try {
        await userService.updateVesselStatus(boatData.aisId, status);
      } catch (error) {
        console.error('Error updating vessel status in Firebase:', error);
      }
    }
  };

  const handleRiskUpdate = (vesselId: string, probability: number, anomalyScore: number) => {
    setRiskProbabilities(prev => ({ ...prev, [vesselId]: probability }));
    setAnomalyScores(prev => ({ ...prev, [vesselId]: anomalyScore }));
  };

  const sendCoastGuardMessage = async (targetBoat: string, message: string, priority: 'low' | 'medium' | 'high') => {
    // Find the aisId for the targetBoatId
    const targetVessel = allBoats.find(b => b.boatId === targetBoat);
    if (!targetVessel) {
      console.error('Target vessel not found:', targetBoat);
      return;
    }

    try {
      await userService.sendMessage({
        senderId: 'COAST_GUARD',
        receiverId: targetVessel.aisId,
        message,
        priority,
        senderName: 'Coast Guard HQ'
      });
    } catch (error) {
      console.error('Error sending message from Coast Guard:', error);
    }
  };

  const updateBoatStatusByCoastGuard = async (aisId: string, status: BoatData['status']) => {
    setAllBoats(prev => {
      const updated = prev.map(boat =>
        boat.aisId === aisId ? { ...boat, status } : boat
      );
      return updated;
    });

    if (boatData && boatData.aisId === aisId) {
      setBoatData(prev => prev ? { ...prev, status } : null);
    }

    // Update status in Firebase
    try {
      await userService.updateVesselStatus(aisId, status);
    } catch (error) {
      console.error('Error updating vessel status in Firebase:', error);
    }
  };

  if (!userType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-400 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-300/10 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>
        
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12 relative z-10">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Waves className="h-16 w-16 text-white mr-4 drop-shadow-lg animate-bounce" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-400 rounded-full animate-ping"></div>
              </div>
              <h1 className="text-5xl font-bold text-white drop-shadow-2xl bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                BLUE SHIELD AI
              </h1>
            </div>
            <p className="text-2xl text-white/90 font-light drop-shadow-lg mb-4">
              {t('landing.title') || 'AI-Powered Maritime Intelligence System'}
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              {t('landing.subtitle') || 'Advanced vessel tracking, behavior analysis, and zone monitoring for maritime safety and compliance'}
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 hover:shadow-3xl hover:scale-105 transition-all duration-300 group">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Navigation className="h-10 w-10 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">
                  {t('landing.fisherman')}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {t('landing.fisherman.desc')}
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setUserType('fisherman');
                    setFishermanMode('register');
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="flex items-center justify-center">
                    {t('landing.register')}
                    <Navigation className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </button>
                <button
                  onClick={() => {
                    setUserType('fisherman');
                    setFishermanMode('login');
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  <span className="flex items-center justify-center">
                    {t('landing.login')}
                    <UserCheck className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 hover:shadow-3xl hover:scale-105 transition-all duration-300 group">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Shield className="h-10 w-10 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors duration-300">
                  {t('landing.coastguard')}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {t('landing.coastguard.desc')}
                </p>
              </div>
              <button
                onClick={() => setUserType('coastguard')}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <span className="flex items-center justify-center">
                  {t('landing.coastguard.continue')}
                  <Shield className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform duration-300" />
                </span>
              </button>
            </div>
          </div>
          
          {/* Feature highlights */}
          <div className="max-w-6xl mx-auto mt-16 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center text-white/80">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Real-time Tracking</h3>
                <p className="text-sm">Live GPS monitoring with high-precision location data</p>
              </div>
              <div className="text-center text-white/80">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">AI Behavior Analysis</h3>
                <p className="text-sm">Advanced pattern recognition for safety compliance</p>
              </div>
              <div className="text-center text-white/80">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">Zone Monitoring</h3>
                <p className="text-sm">Automated alerts for restricted and protected areas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userType === 'coastguard') {
    if (!isCGAuthenticated) {
      return (
        <CoastGuardLogin 
          onLogin={() => {
            setIsCGAuthenticated(true);
            sessionStorage.setItem('isCGAuthenticated', 'true');
          }}
          onBack={() => {
            setUserType(null);
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-red-900 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-8 w-8 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold">Coast Guard Command Center</h1>
                  <p className="text-red-200">Maritime Safety & Vessel Monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <Users className="h-4 w-4 mr-1" />
                  {allBoats.length} Vessels Tracked
                </div>
                <div className="bg-red-800 rounded-full border border-red-700">
                  <LanguageToggle />
                </div>
                <button
                  onClick={() => {
                    setIsCGAuthenticated(false);
                    sessionStorage.removeItem('isCGAuthenticated');
                    setUserType(null);
                    setIsRegistered(false);
                    setAllBoats([]);
                  }}
                  className="text-red-200 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <WorldMap
                boats={allBoats}
                userType="coastguard"
                coastGuardVessel={coastGuardVessel}
                onBoatSelect={(boat) => console.log('Selected boat:', boat)}
              />
              
              {/* AI Engine Control Center Sub-Tab System */}
              <CoastGuardAIControlCenter />

              <CoastGuardDashboard
                boats={allBoats}
                onSendMessage={sendCoastGuardMessage}
                onUpdateBoatStatus={updateBoatStatusByCoastGuard}
                messages={messages}
              />
              <RiskScoreBoard boats={allBoats} anomalyScores={anomalyScores} riskProbabilities={riskProbabilities} />
            </div>
            <div className="space-y-6">
              {coastGuardVessel && (
                <CoastGuardVesselStatus vessel={coastGuardVessel} />
              )}
              <CoastGuardLocationTracker
                onLocationUpdate={updateCoastGuardLocation}
                isTracking={isCoastGuardTracking}
                vesselId={coastGuardVessel?.vesselId || 'CG-UNKNOWN'}
                onTrackingToggle={toggleCoastGuardTracking}
              />
              <AlertSystem alerts={alerts} />
              <DigitalTwinPanel />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (userType === 'fisherman' && !isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-600 to-cyan-400 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-12 relative z-10">
            <div className="flex items-center justify-center mb-4">
              <Waves className="h-16 w-16 text-white mr-4 drop-shadow-lg animate-bounce" />
              <h1 className="text-5xl font-bold text-white drop-shadow-2xl">BLUE SHIELD AI</h1>
            </div>
            <p className="text-2xl text-white/90 font-light drop-shadow-lg">AI-Powered Maritime Intelligence System</p>
            <button
              onClick={() => {
                setUserType(null);
                setFishermanMode(null);
              }}
              className="mt-6 text-white/80 hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm"
            >
              ← Back to Portal Selection
            </button>
          </div>
          <div className="relative z-10">
            {fishermanMode === 'login' ? (
              <FishermanLogin 
                onLogin={handleFishermanRegistration} 
                onBack={() => setFishermanMode(null)}
              />
            ) : (
              <RegistrationForm onRegister={handleFishermanRegistration} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="bg-white border-b border-blue-100 sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-blue-200 shadow-md">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-blue-900">BLUE SHIELD AI</h1>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{t('dashboard.title')}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${
            boatData?.status === 'safe' ? 'bg-green-50 text-green-700 border-green-200' :
            boatData?.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-red-50 text-red-700 border-red-200'
          }`}>
            <Shield className="h-4 w-4 mr-2" />
            {boatData?.status?.toUpperCase()}
          </div>
          
          <div className="bg-blue-600 rounded-full">
            <LanguageToggle />
          </div>

          <button 
            onClick={() => {
              setIsTracking(false);
              setUserType(null);
              setBoatData(null);
              setIsRegistered(false);
              setFishermanMode(null);
            }}
            className="text-xs font-semibold px-4 py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {t('session.end')}
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WorldMap 
              boats={boatData ? [boatData] : []} 
              userType="fisherman"
              currentBoat={boatData}
            />
            <Dashboard boatData={boatData} />
            {boatData && <FishermanMessaging boatData={boatData} />}
            <LocationTracker
              onLocationUpdate={updateLocation}
              isTracking={isTracking}
            />
            {boatData && <LoraStatusPanel 
              boatData={boatData} 
              zoneFlag={boatData.status === 'danger' ? 2 : boatData.status === 'warning' ? 1 : 0}
              anomalyFlag={boatData.status === 'danger' ? 1 : 0}
            />}
          </div>
          <div className="space-y-6">
            <AIMonitor
              boatData={boatData}
              onAlert={addAlert}
              onStatusChange={updateBoatStatus}
              onRiskUpdate={handleRiskUpdate}
            />
            <AlertSystem alerts={alerts.filter(alert => 
              !alert.targetBoat || alert.targetBoat === boatData?.boatId
            )} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
