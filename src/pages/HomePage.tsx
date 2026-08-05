import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Anchor, Users, Compass, Activity, ArrowRight } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-blue-100 bg-white/90 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-blue-900">BLUE SHIELD AI</h1>
            <p className="text-xs text-blue-600 font-bold uppercase tracking-widest">Maritime Operating System (MarOS)</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="bg-blue-50 rounded-full border border-blue-200 px-2 py-1">
            <LanguageToggle />
          </div>
          <Link
            to="/roles"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-2"
          >
            <span>Portal Access</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 py-16 flex flex-col justify-center items-center text-center relative z-10">
        <h2 className="text-5xl md:text-7xl font-black text-blue-950 tracking-tight max-w-4xl leading-tight">
          Protecting Indian Fishermen & Guarding Maritime Frontiers
        </h2>

        <p className="mt-6 text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
          Integrated Digital Twin, Edge AI anomaly prediction, PostGIS spatial boundary enforcement, and real-time LoRa fallback communication.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            to="/roles"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 flex items-center gap-3"
          >
            <Compass className="w-6 h-6" />
            <span>Select System Role</span>
          </Link>

          <Link
            to="/coastguard/tracking"
            className="px-8 py-4 bg-white border border-blue-200 hover:bg-blue-50 text-blue-900 text-lg font-bold rounded-2xl transition-all flex items-center gap-3 shadow-sm"
          >
            <Activity className="w-6 h-6 text-blue-600" />
            <span>Live Fleet GIS View</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-left w-full max-w-5xl">
          <div className="bg-white border border-blue-100 p-8 rounded-3xl shadow-lg shadow-blue-900/5 backdrop-blur-md">
            <Anchor className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold text-blue-950 mb-2">Fisherman Safety Workspace</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Sunlight-optimized, symbol-first navigation, voice Tamil alerts, and instant 1-tap SOS emergency broadcasting.
            </p>
          </div>

          <div className="bg-white border border-blue-100 p-8 rounded-3xl shadow-lg shadow-blue-900/5 backdrop-blur-md">
            <Users className="w-10 h-10 text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold text-blue-950 mb-2">Coast Guard Command Center</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Multi-vessel PostGIS telemetry monitoring, predictive border drift analysis, and direct broadcast communication.
            </p>
          </div>

          <div className="bg-white border border-blue-100 p-8 rounded-3xl shadow-lg shadow-blue-900/5 backdrop-blur-md">
            <Activity className="w-10 h-10 text-amber-600 mb-4" />
            <h3 className="text-xl font-bold text-blue-950 mb-2">AI Control Engine</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Kalman filter trajectory estimations, anomaly detection scores, and automated international boundary risk scoring.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-100 py-6 text-center text-slate-500 text-sm bg-white">
        BLUE SHIELD AI Maritime Operating System © 2026. Enterprise Safety Platform.
      </footer>
    </div>
  );
};
