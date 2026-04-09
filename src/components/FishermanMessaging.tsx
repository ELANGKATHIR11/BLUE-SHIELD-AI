import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Shield, AlertTriangle, Check, CheckCheck } from 'lucide-react';
import { userService, Message } from '../services/userService';
import { BoatData } from '../App';

interface FishermanMessagingProps {
  boatData: BoatData;
}

const FishermanMessaging: React.FC<FishermanMessagingProps> = ({ boatData }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boatData.aisId) {
      const unsubscribe = userService.subscribeToMessages(boatData.aisId, (msgs) => {
        setMessages(msgs);
        
        // Auto-mark unread messages from Coast Guard as read
        msgs.forEach(msg => {
          if (msg.receiverId === boatData.aisId && msg.status !== 'read') {
            userService.markMessageAsRead(msg.id);
          }
        });
      });
      return () => unsubscribe();
    }
  }, [boatData.aisId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await userService.sendMessage({
        senderId: boatData.aisId,
        receiverId: 'COAST_GUARD',
        message: newMessage.trim(),
        priority,
        senderName: boatData.boatId
      });
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const getPriorityColor = (p: Message['priority']) => {
    switch (p) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-blue-50 overflow-hidden flex flex-col h-[500px]">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-bold tracking-wide uppercase text-sm">COAST GUARD COMMS</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold bg-white/10 px-2 py-1 rounded border border-white/20">
          <Shield className="h-3 w-3" />
          ENCRYPTED CHANNEL
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
            <MessageSquare className="h-12 w-12 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.senderId === boatData.aisId ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-3 shadow-sm ${
                msg.senderId === boatData.aisId 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-blue-100 text-slate-800 rounded-tl-none'
              }`}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-tighter ${
                    msg.senderId === boatData.aisId ? 'text-blue-200' : 'text-blue-600'
                  }`}>
                    {msg.senderId === boatData.aisId ? 'YOU' : 'COAST GUARD'}
                  </span>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className={`h-3 w-3 ${getPriorityColor(msg.priority)}`} />
                    <span className="text-[10px] font-mono opacity-60">
                      {new Date(msg.timestamp?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{msg.message}</p>
                <div className={`flex justify-end mt-1 ${msg.senderId === boatData.aisId ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.status === 'read' ? (
                    <CheckCheck className="h-3 w-3" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 mb-3">
          {(['low', 'medium', 'high'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest py-1.5 rounded-lg border transition-all ${
                priority === p 
                  ? p === 'high' ? 'bg-red-50 border-red-200 text-red-600' :
                    p === 'medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-600' :
                    'bg-blue-50 border-blue-200 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type message to Command..."
            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            title="Send message"
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-2 rounded-xl transition-all shadow-lg shadow-blue-200"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default FishermanMessaging;
