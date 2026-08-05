import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CoastGuardLogin from '../components/CoastGuardLogin';
import { Shield, ArrowLeft } from 'lucide-react';

interface CoastGuardLoginPageProps {
  onAuthenticate: () => void;
}

export const CoastGuardLoginPage: React.FC<CoastGuardLoginPageProps> = ({ onAuthenticate }) => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    onAuthenticate();
    navigate('/coastguard/tracking');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-6 left-6 z-10">
        <Link to="/roles" className="flex items-center gap-2 text-slate-300 hover:text-white bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 transition-colors text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Roles</span>
        </Link>
      </div>

      <div className="text-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-red-950 border border-red-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-3xl font-black">Coast Guard Command Portal</h1>
        <p className="text-slate-400 text-sm mt-1">Restricted Tactical Access · Defense Systems</p>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
        <CoastGuardLogin onLogin={handleLoginSuccess} onBack={() => navigate('/roles')} />
      </div>
    </div>
  );
};
