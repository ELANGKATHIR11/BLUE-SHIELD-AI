import React from 'react';
import WorldMap from '../components/WorldMap';
import Dashboard from '../components/Dashboard';
import FishermanMessaging from '../components/FishermanMessaging';
import LocationTracker from '../components/LocationTracker';
import LoraStatusPanel from '../components/LoraStatusPanel';
import AIMonitor from '../components/AIMonitor';
import AlertSystem from '../components/AlertSystem';
import LanguageToggle from '../components/LanguageToggle';
import { BoatData, Alert } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FishermanPageProps {
  boatData: BoatData | null;
  isTracking: boolean;
  alerts: Alert[];
  updateLocation: (lat: number, lng: number) => void;
  updateBoatStatus: (status: 'safe' | 'warning' | 'danger') => void;
  handleRiskUpdate: (vesselId: string, probability: number, anomalyScore: number) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  onLogout: () => void;
}

export const FishermanPage: React.FC<FishermanPageProps> = ({
  boatData,
  isTracking,
  alerts,
  updateLocation,
  updateBoatStatus,
  handleRiskUpdate,
  addAlert,
  onLogout
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/roles');
  };

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
            onClick={handleLogoutClick}
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
};
