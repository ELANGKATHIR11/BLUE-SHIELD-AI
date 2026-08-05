import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FishermanLogin from '../components/FishermanLogin';
import RegistrationForm from '../components/RegistrationForm';
import { Waves, ArrowLeft } from 'lucide-react';

interface FishermanLoginPageProps {
  onLogin: (aisId: string, boatId: string, fishermanName: string, contactInfo: string) => void;
}

export const FishermanLoginPage: React.FC<FishermanLoginPageProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  const handleLoginSuccess = (aisId: string, boatId: string, fishermanName: string, contactInfo: string) => {
    onLogin(aisId, boatId, fishermanName, contactInfo);
    navigate('/fisherman/workspace');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-sky-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
        <Link to="/roles" className="flex items-center gap-2 text-sky-200 hover:text-white bg-slate-900/40 px-4 py-2 rounded-xl backdrop-blur-sm transition-colors text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Roles</span>
        </Link>
      </div>

      <div className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center mb-3">
          <Waves className="h-12 w-12 text-sky-400 mr-3 animate-pulse" />
          <h1 className="text-4xl font-extrabold tracking-tight">BLUE SHIELD AI</h1>
        </div>
        <p className="text-sky-200 font-medium">Fisherman Access Portal (மீனவர் பாதுகாப்பு தளம்)</p>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
        <div className="flex bg-slate-950 p-1.5 rounded-2xl mb-8 border border-slate-800">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === 'login' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Fisherman Login
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
              mode === 'register' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register Boat
          </button>
        </div>

        {mode === 'login' ? (
          <FishermanLogin onLogin={handleLoginSuccess} onBack={() => navigate('/roles')} />
        ) : (
          <RegistrationForm onRegister={(boatData) => handleLoginSuccess(boatData.aisId, boatData.boatId, boatData.fishermanName || '', boatData.contactInfo || '')} />
        )}
      </div>
    </div>
  );
};
