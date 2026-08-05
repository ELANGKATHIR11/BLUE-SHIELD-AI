import React from 'react';
import CoastGuardAIControlCenter from '../components/CoastGuardAIControlCenter';

export const CoastGuardAIEnginePage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-100">AI Engine Control Center</h2>
          <p className="text-slate-400 text-sm">Kalman Trajectory Filters, Boundary Geo-Fencing & Anomaly Model Configuration</p>
        </div>
        <CoastGuardAIControlCenter />
      </div>
    </div>
  );
};
