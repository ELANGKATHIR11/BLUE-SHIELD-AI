import React from 'react';
import { NavLink } from 'react-router-dom';
import { Compass, MessageSquare, Activity, Shield } from 'lucide-react';

export const CoastGuardNavigation: React.FC = () => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between shadow-sm">
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
          <span>Vessel Tracking (GIS Map)</span>
        </NavLink>

        <NavLink
          to="/coastguard/communication"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <MessageSquare className="w-4 h-4" />
          <span>Fisher Communication</span>
        </NavLink>

        <NavLink
          to="/coastguard/ai-control"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              isActive ? 'bg-red-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`
          }
        >
          <Activity className="w-4 h-4" />
          <span>AI Engine Control Center</span>
        </NavLink>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
        <Shield className="w-4 h-4 text-red-600" />
        <span>AUTHENTICATED COMMANDER</span>
      </div>
    </div>
  );
};
