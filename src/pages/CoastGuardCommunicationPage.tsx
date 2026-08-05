import React from 'react';
import CoastGuardDashboard from '../components/CoastGuardDashboard';
import { BoatData } from '../App';
import { Message } from '../services/userService';

interface CoastGuardCommunicationPageProps {
  allBoats: BoatData[];
  messages: Message[];
  sendCoastGuardMessage: (receiverId: string, messageText: string, priority: 'normal' | 'high' | 'medium') => void;
  updateBoatStatusByCoastGuard: (boatId: string, newStatus: 'safe' | 'warning' | 'danger') => void;
}

export const CoastGuardCommunicationPage: React.FC<CoastGuardCommunicationPageProps> = ({
  allBoats,
  messages,
  sendCoastGuardMessage,
  updateBoatStatusByCoastGuard
}) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">Fisher Communication Dispatch</h2>
        <CoastGuardDashboard
          boats={allBoats}
          onSendMessage={sendCoastGuardMessage}
          onUpdateBoatStatus={updateBoatStatusByCoastGuard}
          messages={messages}
        />
      </div>
    </div>
  );
};
