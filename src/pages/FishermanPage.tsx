import React, { useState } from 'react';
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
import { Shield, Compass, MessageSquare, Radio, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FishermanPageProps {
  boatData: BoatData | null;
  isTracking: boolean;
  alerts: Alert[];
  updateLocation: (lat: number, lng: number, speed?: number, heading?: number) => void;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'communication' | 'hardware' | 'alerts'>('overview');

  const handleLogoutClick = () => {
    onLogout();
    navigate('/roles');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      {/* Unified Sticky Header & Sub-Tabs Container */}
      <div className="sticky top-0 z-50 shadow-sm bg-white">
        <header className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-blue-200 shadow-md">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-blue-900">{t('nav.brand')}</h1>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">{t('dashboard.title')}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`flex items-center px-4 py-1.5 rounded-full text-xs font-bold border ${
              boatData?.status === 'safe' ? 'bg-green-50 text-green-700 border-green-200' :
              boatData?.status === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
              'bg-red-50 text-red-700 border-red-200'
            }`}>
              <Shield className="h-4 w-4 mr-1.5" />
              {t(`status.${boatData?.status || 'safe'}`)}
            </div>
            
            <div className="bg-blue-600 rounded-full border border-blue-700">
              <LanguageToggle />
            </div>

            <button 
              onClick={handleLogoutClick}
              className="text-xs font-bold px-4 py-2 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
            >
              {t('nav.logout')}
            </button>
          </div>
        </header>

        {/* Fisherman Sub-Tabs Navigation Bar */}
        <nav className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>{t('nav.tabOverview')}</span>
            </button>

            <button
              onClick={() => setActiveTab('communication')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'communication' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t('nav.tabComms')}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveTab('hardware')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'hardware' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>{t('nav.tabHardware')}</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'alerts' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{t('nav.tabAlerts')}</span>
            </button>
          </div>

          {boatData && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>{boatData.boatId} ({boatData.aisId})</span>
            </div>
          )}
        </nav>
      </div>

      <main className="container mx-auto px-4 py-6 flex-1">
        {/* Tab 1: Overview & Map */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <WorldMap 
                boats={boatData ? [boatData] : []} 
                userType="fisherman"
                currentBoat={boatData}
              />
              <Dashboard boatData={boatData} />
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
        )}

        {/* Tab 2: Dedicated Two-Way Communications Tab */}
        {activeTab === 'communication' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t('nav.tabComms')}</h2>
                <p className="text-xs text-slate-500 mt-1">Direct encrypted link to Coast Guard Command Center · Spoken Audio & Dictation Enabled</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>LINK ACTIVE</span>
              </div>
            </div>
            {boatData ? (
              <FishermanMessaging boatData={boatData} />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-slate-200">
                <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-bold text-slate-600">{t('dashboard.waiting')}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Telemetry & LoRa Hardware */}
        {activeTab === 'hardware' && (
          <div className="max-w-4xl mx-auto space-y-6">
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
        )}

        {/* Tab 4: AI Monitoring & Alerts */}
        {activeTab === 'alerts' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
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
        )}
      </main>
    </div>
  );
};
