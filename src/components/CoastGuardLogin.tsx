import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, ArrowRight, Waves } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CoastGuardLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

const CoastGuardLogin: React.FC<CoastGuardLoginProps> = ({ onLogin, onBack }) => {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Simulated short delay for professional feel
    setTimeout(() => {
      if (username === 'Admin' && password === 'admin') {
        onLogin();
      } else {
        setError(t('cg_login.invalid'));
        setIsSubmitting(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-8 text-center bg-gradient-to-b from-white/5 to-transparent">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-600 rounded-3xl mb-6 shadow-2xl shadow-red-900/50 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-2">SECURE GATEWAY</h2>
            <div className="flex items-center justify-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest mb-4">
              <Waves className="h-3 w-3" />
              {t('cg_login.subtitle')}
              <Waves className="h-3 w-3" />
            </div>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-red-500 to-transparent mx-auto"></div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('cg_login.username')}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-bold tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('cg_login.password')}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm font-bold tracking-widest placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 transition-all duration-300"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 animate-shake">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-xs font-bold text-red-400 uppercase tracking-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 tracking-[0.2em] transition-all duration-300 transform group-active:scale-[0.98]">
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    {t('cg_login.authenticating')}
                  </div>
                ) : (
                  <>
                    {t('cg_login.system_login')}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="p-6 bg-white/5 text-center">
            <button
               onClick={onBack}
               className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors duration-300 flex items-center justify-center gap-2 mx-auto"
            >
              ← Back to Portal Selection
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
          Classified Digital Surveillance Network v2.4
        </p>
      </div>
    </div>
  );
};

export default CoastGuardLogin;