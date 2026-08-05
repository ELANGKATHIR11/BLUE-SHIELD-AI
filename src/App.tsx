import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { FishermanLoginPage } from './pages/FishermanLoginPage';
import { CoastGuardLoginPage } from './pages/CoastGuardLoginPage';
import { FishermanPage } from './pages/FishermanPage';
import { CoastGuardLayout } from './layouts/CoastGuardLayout';
import { CoastGuardTrackingPage } from './pages/CoastGuardTrackingPage';
import { CoastGuardCommunicationPage } from './pages/CoastGuardCommunicationPage';
import { CoastGuardAIEnginePage } from './pages/CoastGuardAIEnginePage';

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
  
  // ML Model outputs
  const [riskProbabilities, setRiskProbabilities] = useState<Record<string, number>>({});
  const [anomalyScores, setAnomalyScores] = useState<Record<string, number>>({});
  
  const vesselTrackersRef = useRef<Map<string, VesselTracker>>(new Map());
  const violationNotifiedRef = useRef<Set<string>>(new Set());

  const addAlert = (alert: Omit<Alert, 'id' | 'timestamp'>) => {
    const newAlert: Alert = {
      ...alert,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    setAlerts(prev => [newAlert, ...prev].slice(0, 50));
  };

  useEffect(() => {
    initializeBoundaries();
  }, []);

  // Coast Guard Vessel Init & Realtime Subscriptions
  useEffect(() => {
    if (isCGAuthenticated) {
      const cgVessel: CoastGuardVessel = {
        vesselId: 'CG-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        vesselName: 'Coast Guard Patrol Vessel',
        location: { lat: 0, lng: 0, timestamp: Date.now() },
        speed: 0,
        heading: 0,
        lastUpdate: Date.now(),
        isTracking: false
      };
      setCoastGuardVessel(cgVessel);

      const unsubscribe = userService.subscribeToVessels((vessels) => {
        setAllBoats(vessels);
      });

      return () => unsubscribe();
    }
  }, [isCGAuthenticated]);

  // Message Subscriptions
  useEffect(() => {
    const aisId = boatData ? boatData.aisId : null;
    const unsubscribe = userService.subscribeToMessages(aisId, (msgs) => {
      setMessages(msgs);
      if (boatData) {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage && lastMessage.senderId === 'COAST_GUARD' && lastMessage.receiverId === boatData.aisId) {
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
  }, [boatData]);

  // Risk Calculations in CG Mode
  useEffect(() => {
    if (!isCGAuthenticated || allBoats.length === 0) return;

    const riskCalculationInterval = setInterval(() => {
      const newRiskProbs: Record<string, number> = {};
      const newAnomalyScores: Record<string, number> = {};

      for (const boat of allBoats) {
        try {
          if (!vesselTrackersRef.current.has(boat.aisId)) {
            vesselTrackersRef.current.set(boat.aisId, new VesselTracker());
          }
          const tracker = vesselTrackersRef.current.get(boat.aisId)!;
          const position = { lat: boat.location.lat, lng: boat.location.lng };
          const timestamp = boat.location.timestamp || Date.now();
          tracker.addMeasurement({ lat: position.lat, lng: position.lng, timestamp });

          telemetryEngine.recordExecution('kalman-filter', Math.random() * 5, true, 1);

          const prediction = tracker.predictNextPosition();
          const riskInput = {
            distanceToBorder: calculateApproxDistanceToBorder(position),
            headingDegrees: boat.heading,
            speedKnots: boat.speed,
            predictedLat: prediction.lat,
            predictedLng: prediction.lng,
            timeWindowMinutes: 15
          };

          const riskScore = calculateRisk(riskInput);
          newRiskProbs[boat.aisId] = riskScore.riskProbability;

          const recentHistory = tracker.getHistory(5);
          const historyForAnomaly = recentHistory.map(h => ({
            lat: h.position.lat,
            lng: h.position.lng,
            timestamp: h.timestamp,
            speed: boat.speed,
            heading: boat.heading
          }));

          const anomalyResults = detectAnomalies(historyForAnomaly);
          newAnomalyScores[boat.aisId] = anomalyResults.anomalyScore;

          const eeZAlerts = checkExtendedEEZBoundaries(position, boat.aisId, boat.boatId);
          eeZAlerts.forEach(alertText => {
            const isDanger = alertText.includes('CRITICAL') || alertText.includes('BREACH');
            addAlert({
              type: isDanger ? 'danger' : 'warning',
              message: `${boat.boatId} (${boat.aisId}): ${alertText}`,
              targetBoat: boat.boatId
            });

            if (isDanger && !violationNotifiedRef.current.has(boat.aisId)) {
              violationNotifiedRef.current.add(boat.aisId);
              userService.sendMessage({
                senderId: 'COAST_GUARD',
                senderName: 'Coast Guard Command',
                receiverId: boat.aisId,
                message: alertText,
                priority: 'high'
              });
            }
          });
        } catch (err) {
          console.error(`Error calculating risk for boat ${boat.aisId}:`, err);
        }
      }

      setRiskProbabilities(newRiskProbs);
      setAnomalyScores(newAnomalyScores);
    }, 3000);

    return () => clearInterval(riskCalculationInterval);
  }, [isCGAuthenticated, allBoats]);

  const calculateApproxDistanceToBorder = (pos: { lat: number; lng: number }): number => {
    const imblLat = 9.9200;
    const imblLng = 79.5200;
    const dLat = (pos.lat - imblLat) * 111.0;
    const dLng = (pos.lng - imblLng) * 111.0 * Math.cos((pos.lat * Math.PI) / 180);
    return Math.sqrt(dLat * dLat + dLng * dLng);
  };

  const handleFishermanRegistration = (data: BoatData) => {
    setBoatData(data);
    setIsTracking(true);
    userService.registerVessel(data);
    addAlert({
      type: 'info',
      message: `System active. AIS Transponder ID: ${data.aisId}`,
      targetBoat: data.boatId
    });
  };

  const updateLocation = (lat: number, lng: number, speed: number, heading: number) => {
    if (!boatData) return;

    const newLocation = { lat, lng, timestamp: Date.now() };
    const status = checkGeofence(newLocation);
    
    const updatedBoat: BoatData = {
      ...boatData,
      location: newLocation,
      speed,
      heading,
      status,
      lastUpdate: Date.now()
    };

    setBoatData(updatedBoat);
    userService.updateVesselLocation(updatedBoat);
  };

  const updateBoatStatus = (newStatus: 'safe' | 'warning' | 'danger') => {
    if (!boatData) return;
    const updated = { ...boatData, status: newStatus };
    setBoatData(updated);
    userService.updateVesselLocation(updated);
  };

  const handleRiskUpdate = (riskProbability: number, anomalyScore: number) => {
    if (!boatData) return;
    setRiskProbabilities(prev => ({ ...prev, [boatData.aisId]: riskProbability }));
    setAnomalyScores(prev => ({ ...prev, [boatData.aisId]: anomalyScore }));
  };

  const updateCoastGuardLocation = (lat: number, lng: number, speed: number, heading: number) => {
    if (!coastGuardVessel) return;
    const updated: CoastGuardVessel = {
      ...coastGuardVessel,
      location: { lat, lng, timestamp: Date.now() },
      speed,
      heading,
      lastUpdate: Date.now()
    };
    setCoastGuardVessel(updated);
  };

  const toggleCoastGuardTracking = () => {
    setIsCoastGuardTracking(prev => !prev);
  };

  const sendCoastGuardMessage = (receiverId: string, messageText: string, priority: 'normal' | 'high' | 'medium') => {
    userService.sendMessage({
      senderId: 'COAST_GUARD',
      senderName: 'Coast Guard Command Center',
      receiverId,
      message: messageText,
      priority
    });
  };

  const updateBoatStatusByCoastGuard = (boatId: string, newStatus: 'safe' | 'warning' | 'danger') => {
    setAllBoats(prev => prev.map(boat => {
      if (boat.boatId === boatId || boat.aisId === boatId) {
        const updated = { ...boat, status: newStatus };
        userService.updateVesselLocation(updated);
        return updated;
      }
      return boat;
    }));
  };

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/roles" element={<RoleSelectionPage />} />
      <Route path="/fisherman/login" element={<FishermanLoginPage onLogin={handleFishermanRegistration} />} />
      <Route path="/coastguard/login" element={<CoastGuardLoginPage onAuthenticate={() => setIsCGAuthenticated(true)} />} />
      <Route
        path="/fisherman/workspace"
        element={
          <FishermanPage
            boatData={boatData}
            isTracking={isTracking}
            alerts={alerts}
            updateLocation={updateLocation}
            updateBoatStatus={updateBoatStatus}
            handleRiskUpdate={handleRiskUpdate}
            addAlert={addAlert}
            onLogout={() => setBoatData(null)}
          />
        }
      />

      {/* Coast Guard Sub-Pages Layout */}
      <Route
        path="/coastguard"
        element={
          isCGAuthenticated ? (
            <CoastGuardLayout allBoats={allBoats} onLogout={() => setIsCGAuthenticated(false)} />
          ) : (
            <Navigate to="/coastguard/login" replace />
          )
        }
      >
        <Route index element={<Navigate to="/coastguard/tracking" replace />} />
        <Route
          path="tracking"
          element={
            <CoastGuardTrackingPage
              allBoats={allBoats}
              coastGuardVessel={coastGuardVessel}
              isCoastGuardTracking={isCoastGuardTracking}
              alerts={alerts}
              anomalyScores={anomalyScores}
              riskProbabilities={riskProbabilities}
              updateCoastGuardLocation={updateCoastGuardLocation}
              toggleCoastGuardTracking={toggleCoastGuardTracking}
            />
          }
        />
        <Route
          path="communication"
          element={
            <CoastGuardCommunicationPage
              allBoats={allBoats}
              messages={messages}
              sendCoastGuardMessage={sendCoastGuardMessage}
              updateBoatStatusByCoastGuard={updateBoatStatusByCoastGuard}
            />
          }
        />
        <Route path="ai-control" element={<CoastGuardAIEnginePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
