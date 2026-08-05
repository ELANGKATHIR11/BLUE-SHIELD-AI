import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Waves, Anchor, Radio, Users, Compass, Activity, ArrowRight, Lock } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="bg-sky-600 p-2.5 rounded-xl shadow-lg shadow-sky-500/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">BLUE SHIELD AI</h1>
            <p className="text-xs text-sky-400 font-bold uppercase tracking-widest">Maritime Operating System (MarOS)</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="bg-slate-800 rounded-full border border-slate-700 px-2 py-1">
            <LanguageToggle />
          </div>
          <Link
            to="/roles"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition-all shadow-md shadow-sky-600/20 flex items-center gap-2"
          >
            <span>Portal Access</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 py-16 flex flex-col justify-center items-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-950/80 border border-sky-800 text-sky-300 text-xs font-bold uppercase tracking-wider mb-8">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          Next-Gen AI Maritime Safety & Enforcement
        </div>

        <h2 className="text-5xl md:text-7xl font-black text-white tracking-tight max-w-4xl leading-tight">
          Protecting Indian Fishermen & Guarding Maritime Frontiers
        </h2>

        <p className="mt-6 text-xl text-slate-400 max-w-2xl font-normal leading-relaxed">
          Integrated Digital Twin, Edge AI anomaly prediction, PostGIS spatial boundary enforcement, and real-time LoRa fallback communication.
        </p>

        <div className="mt-10 flex flex-wrap gap-4 justify-center">
          <Link
            to="/roles"
            className="px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-sky-600/30 flex items-center gap-3"
          >
            <Compass className="w-6 h-6" />
            <span>Select System Role</span>
          </Link>

          <Link
            to="/coastguard/tracking"
            className="px-8 py-4 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-lg font-bold rounded-2xl transition-all flex items-center gap-3"
          >
            <Activity className="w-6 h-6 text-sky-400" />
            <span>Live Fleet GIS View</span>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-left w-full max-w-5xl">
          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
            <Anchor className="w-10 h-10 text-sky-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Fisherman Safety Workspace</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sunlight-optimized, symbol-first navigation, voice Tamil alerts, and instant 1-tap SOS emergency broadcasting.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
            <Users className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Coast Guard Command Center</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Multi-vessel PostGIS telemetry monitoring, predictive border drift analysis, and direct broadcast communication.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl backdrop-blur-md">
            <Activity className="w-10 h-10 text-amber-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">AI Control Engine</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Kalman filter trajectory estimations, anomaly detection scores, and automated international boundary risk scoring.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-slate-500 text-sm">
        BLUE SHIELD AI Maritime Operating System © 2026. Enterprise Safety Platform.
      </footer>
    </div>
  );
};
