import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, MessageSquare, Shield, Radio } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const CoastGuardNavigation: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm flex-wrap gap-2">
      <div className="flex items-center space-x-2">
        <NavLink
          to="/coastguard/tracking"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <Compass className="w-4 h-4" />
          <span>{t('nav.liveTracking')}</span>
        </NavLink>

        <NavLink
          to="/coastguard/communication"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
              isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <MessageSquare className="w-4 h-4" />
          <span>{t('nav.communication')}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </NavLink>
      </div>

      <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
        <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>TWO-WAY VOICE & TEXT ACTIVE</span>
        </div>
        <div className="flex items-center gap-1">
          <Shield className="w-4 h-4 text-red-600" />
          <span>{t('auth.cgLoginTitle')}</span>
        </div>
      </div>
    </div>
  );
};
