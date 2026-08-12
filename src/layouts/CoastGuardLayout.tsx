import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Shield, Users } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';
import { CoastGuardNavigation } from '../components/CoastGuardNavigation';
import { BoatData } from '../App';
import { useLanguage } from '../contexts/LanguageContext';

interface CoastGuardLayoutProps {
  allBoats: BoatData[];
  onLogout: () => void;
}

export const CoastGuardLayout: React.FC<CoastGuardLayoutProps> = ({ allBoats, onLogout }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/roles');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Sticky Header Stack Container to prevent mid-page floating on scroll */}
      <div className="sticky top-0 z-50 shadow-md">
        <header className="bg-red-700 text-white">
          <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <Shield className="h-7 w-7 sm:h-8 sm:w-8 mr-3 flex-shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold">{t('cg.title')}</h1>
                  <p className="text-red-100 text-xs">{t('cg.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-red-100 text-red-900">
                  <Users className="h-4 w-4 mr-1" />
                  {t('cg.vesselsTracked', { count: allBoats.length })}
                </div>
                <div className="bg-red-800 rounded-full border border-red-600">
                  <LanguageToggle />
                </div>
                <button
                  onClick={handleLogoutClick}
                  className="text-red-100 hover:text-white transition-colors font-semibold text-sm"
                >
                  {t('nav.cgLogout')}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-Header Tabs Navigation */}
        <CoastGuardNavigation />
      </div>

      {/* Page Content */}
      <div className="flex-1 bg-slate-50">
        <Outlet />
      </div>
    </div>
  );
};
