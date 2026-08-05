import React from 'react';
import { Link } from 'react-router-dom';
import { Anchor, Shield, ArrowRight } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle';

export const RoleSelectionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />

      {/* Header */}
      <header className="px-8 py-6 flex items-center justify-between border-b border-slate-900 bg-slate-950/80 backdrop-blur-md relative z-10">
        <Link to="/" className="flex items-center space-x-3">
          <div className="bg-sky-600 p-2 rounded-xl">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">BLUE SHIELD AI</span>
        </Link>

        <div className="bg-slate-900 rounded-full border border-slate-800 px-2 py-1">
          <LanguageToggle />
        </div>
      </header>

      {/* Role Selection Container */}
      <main className="container mx-auto px-6 py-12 flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="text-center mb-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
            System Identity Verification
          </div>
          <h2 className="text-4xl font-extrabold text-white">Select Your Operating Role</h2>
          <p className="mt-3 text-slate-400 text-lg">
            Choose your workspace portal to access safe navigation or maritime command centers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Fisherman Portal Card */}
          <Link
            to="/fisherman/login"
            className="group bg-slate-900/80 border-2 border-slate-800 hover:border-sky-500 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-sky-950 border border-sky-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Anchor className="w-8 h-8 text-sky-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Fisherman Portal (மீனவர் தளம்)</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Direct access to real-time border proximity gauges, weather forecasts, spoken Tamil alerts, and instant emergency SOS.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between font-bold text-sky-400">
              <span>Enter Fisherman Workspace</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>

          {/* Coast Guard Portal Card */}
          <Link
            to="/coastguard/login"
            className="group bg-slate-900/80 border-2 border-slate-800 hover:border-red-500 p-8 rounded-3xl transition-all duration-300 shadow-xl hover:shadow-red-500/10 flex flex-col justify-between"
          >
            <div>
              <div className="w-16 h-16 rounded-2xl bg-red-950 border border-red-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Coast Guard Command Center</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Restricted access for defense operations, multi-vessel telemetry tracking, AI risk scores, and direct messaging.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between font-bold text-red-400">
              <span>Authenticate Operator</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-slate-500 text-sm border-t border-slate-900">
        BLUE SHIELD AI Security Portal · Indian Maritime Boundary Protection
      </footer>
    </div>
  );
};
