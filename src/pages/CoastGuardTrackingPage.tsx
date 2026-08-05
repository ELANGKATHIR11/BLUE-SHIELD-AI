import React from 'react';
import WorldMap from '../components/WorldMap';
import RiskScoreBoard from '../components/RiskScoreBoard';
import CoastGuardVesselStatus from '../components/CoastGuardVesselStatus';
import CoastGuardLocationTracker from '../components/CoastGuardLocationTracker';
import AlertSystem from '../components/AlertSystem';
import DigitalTwinPanel from '../components/DigitalTwinPanel';
import { BoatData, CoastGuardVessel, Alert } from '../App';

interface CoastGuardTrackingPageProps {
  allBoats: BoatData[];
  coastGuardVessel: CoastGuardVessel | null;
  isCoastGuardTracking: boolean;
  alerts: Alert[];
  anomalyScores: Record<string, number>;
  riskProbabilities: Record<string, number>;
  updateCoastGuardLocation: (lat: number, lng: number, speed: number, heading: number) => void;
  toggleCoastGuardTracking: () => void;
}

export const CoastGuardTrackingPage: React.FC<CoastGuardTrackingPageProps> = ({
  allBoats,
  coastGuardVessel,
  isCoastGuardTracking,
  alerts,
  anomalyScores,
  riskProbabilities,
  updateCoastGuardLocation,
  toggleCoastGuardTracking
}) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <WorldMap
            boats={allBoats}
            userType="coastguard"
            coastGuardVessel={coastGuardVessel}
            onBoatSelect={(boat) => console.log('Selected boat:', boat)}
          />
          <RiskScoreBoard boats={allBoats} anomalyScores={anomalyScores} riskProbabilities={riskProbabilities} />
        </div>

        <div className="space-y-6">
          {coastGuardVessel && <CoastGuardVesselStatus vessel={coastGuardVessel} />}
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
    </div>
  );
};
