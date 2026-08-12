import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FishermanLogin from '../components/FishermanLogin';
import RegistrationForm from '../components/RegistrationForm';
import { Waves, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface FishermanLoginPageProps {
  onLogin: (aisId: string, boatId: string, fishermanName: string, contactInfo: string) => void;
}

export const FishermanLoginPage: React.FC<FishermanLoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLoginSuccess = (aisId: string, boatId: string, fishermanName: string, contactInfo: string) => {
    onLogin(aisId, boatId, fishermanName, contactInfo);
    navigate('/fisherman/workspace');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Link to="/roles" className="flex items-center gap-2 text-slate-700 hover:text-blue-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-colors text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('nav.backToRoles')}</span>
        </Link>
      </div>

      <div className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center mb-3">
          <Waves className="h-12 w-12 text-blue-600 mr-3 animate-pulse" />
          <h1 className="text-4xl font-extrabold text-blue-950 tracking-tight">{t('nav.brand')}</h1>
        </div>
        <p className="text-slate-600 font-medium">{t('auth.fishermanAccess')}</p>
      </div>

      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 border border-slate-200">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            {t('auth.fishermanLogin')}
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === 'register' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            {t('auth.registerBoat')}
          </button>
        </div>

        {mode === 'login' ? (
          <FishermanLogin onLogin={handleLoginSuccess} onBack={() => navigate('/roles')} />
        ) : (
          <RegistrationForm onRegister={handleLoginSuccess} />
        )}
      </div>
    </div>
  );
};
