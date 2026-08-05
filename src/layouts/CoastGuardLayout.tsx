import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import { CoastGuardNavigation } from '../components/CoastGuardNavigation';
import { BoatData } from '../App';

interface CoastGuardLayoutProps {
  allBoats: BoatData[];
  onLogout: () => void;
}

export const CoastGuardLayout: React.FC<CoastGuardLayoutProps> = ({ allBoats, onLogout }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/roles');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="bg-red-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-2xl font-bold">Coast Guard Command Center</h1>
                <p className="text-red-100">Maritime Safety & Vessel Monitoring</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-900">
                <Users className="h-4 w-4 mr-1" />
                {allBoats.length} Vessels Tracked
              </div>
              <div className="bg-red-800 rounded-full border border-red-600">
                <LanguageToggle />
              </div>
              <button
                onClick={handleLogoutClick}
                className="text-red-100 hover:text-white transition-colors font-semibold"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Sub-Header Tabs Navigation */}
      <CoastGuardNavigation />

      {/* Page Content */}
      <div className="flex-1 bg-slate-50">
        <Outlet />
      </div>
    </div>
  );
};
