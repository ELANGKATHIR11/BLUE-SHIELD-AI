import React, { useState } from 'react';
import { Ship, Radio, ArrowRight, AlertCircle, Activity, UserCheck, Lock, Loader2, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { userService } from '../services/userService';

interface FishermanLoginProps {
  onLogin: (aisId: string, boatId: string, fishermanName: string, contactInfo: string) => void;
  onBack: () => void;
}

const FishermanLogin: React.FC<FishermanLoginProps> = ({ onLogin, onBack }) => {
  const { t } = useLanguage();
  const [aisId, setAisId] = useState('');
  const [boatId, setBoatId] = useState('');
  const [fishermanName, setFishermanName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [errors, setErrors] = useState<{ aisId?: string; boatId?: string; fishermanName?: string; contactInfo?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const validateForm = () => {
    const newErrors: { aisId?: string; boatId?: string; fishermanName?: string; contactInfo?: string; general?: string } = {};
    
    if (!aisId.trim()) {
      newErrors.aisId = t('form.ais_id.required');
    } else if (!/^\d{9}$/.test(aisId.trim())) {
      newErrors.aisId = t('form.ais_id.error');
    }

    if (!boatId.trim()) {
      newErrors.boatId = t('form.boat_id.required');
    } else if (boatId.trim().length < 3) {
      newErrors.boatId = t('form.boat_id.error');
    }

    if (!fishermanName.trim()) {
      newErrors.fishermanName = t('form.fisherman_name.required');
    }

    if (!contactInfo.trim()) {
      newErrors.contactInfo = t('form.contact_phone.required');
    } else if (!/^[+]?[1-9][\d]{0,15}$/.test(contactInfo.trim().replace(/[-\s]/g, ''))) {
      newErrors.contactInfo = t('form.contact_phone.error');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsSubmitting(true);
      setSubmitStatus('idle');
      setStatusMessage('');

      try {
        // Check if user exists and verify details
        const userDetails = await userService.getUserDetails(aisId.trim());
        
        if (!userDetails) {
          setSubmitStatus('error');
          setErrors({ general: t('login.no_vessel') });
          return;
        }

        // Verify the entered details match the registered details
        if (userDetails.boatId !== boatId.trim() || 
            userDetails.fishermanName !== fishermanName.trim() || 
            userDetails.contactInfo !== contactInfo.trim()) {
          setSubmitStatus('error');
          setErrors({ general: t('login.mismatch') });
          return;
        }

        setSubmitStatus('success');
        setStatusMessage(t('login.success'));

        // Call the login function with verified details
        setTimeout(() => {
          onLogin(
            userDetails.aisId,
            userDetails.boatId,
            userDetails.fishermanName,
            userDetails.contactInfo
          );
        }, 1500);

      } catch (error) {
        console.error('Login error:', error);
        setSubmitStatus('error');
        setErrors({ general: t('login.error') });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20 hover:shadow-3xl transition-all duration-300">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-6 shadow-lg animate-pulse">
            <UserCheck className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            {t('login.title')}
          </h2>
          <p className="text-gray-600 leading-relaxed">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="aisId" className="block text-sm font-medium text-gray-700 mb-2">
              <Radio className="h-4 w-4 inline mr-2" />
              {t('form.ais_id')}
            </label>
            <input
              type="text"
              id="aisId"
              value={aisId}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                setAisId(val);
              }}
              placeholder={t('form.ais_id.placeholder')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-slate-900 bg-white ${
                errors.aisId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } hover:border-blue-400 transition-all duration-200`}
              maxLength={9}
            />
            {errors.aisId && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.aisId}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="boatId" className="block text-sm font-medium text-gray-700 mb-2">
              <Ship className="h-4 w-4 inline mr-2" />
              {t('form.boat_id')}
            </label>
            <input
              type="text"
              id="boatId"
              value={boatId}
              onChange={(e) => setBoatId(e.target.value)}
              placeholder={t('form.boat_id.placeholder')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.boatId ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } hover:border-blue-400 transition-all duration-200`}
            />
            {errors.boatId && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.boatId}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="fishermanName" className="block text-sm font-medium text-gray-700 mb-2">
              <UserCheck className="h-4 w-4 inline mr-2" />
              {t('form.fisherman_name')}
            </label>
            <input
              type="text"
              id="fishermanName"
              value={fishermanName}
              onChange={(e) => setFishermanName(e.target.value)}
              placeholder={t('form.fisherman_name.placeholder')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.fishermanName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } hover:border-blue-400 transition-all duration-200`}
            />
            {errors.fishermanName && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.fishermanName}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="contactInfo" className="block text-sm font-medium text-gray-700 mb-2">
              <Radio className="h-4 w-4 inline mr-2" />
              {t('form.contact_phone')}
            </label>
            <input
              type="tel"
              id="contactInfo"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder={t('form.contact_phone.placeholder')}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                errors.contactInfo ? 'border-red-300 bg-red-50' : 'border-gray-300'
              } hover:border-blue-400 transition-all duration-200`}
            />
            {errors.contactInfo && (
              <div className="flex items-center mt-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.contactInfo}
              </div>
            )}
          </div>

          {errors.general && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <AlertCircle className="h-4 w-4 mr-2" />
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center group ${
              submitStatus === 'success' 
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white' 
                : submitStatus === 'error'
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
            } ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('login.logging_in')}
              </span>
            ) : submitStatus === 'success' ? (
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('login.success')}
              </span>
            ) : (
              <span className="flex items-center">
                {t('login.button')}
                <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>

          {statusMessage && (
            <div className={`mt-4 p-4 rounded-lg text-sm font-medium ${
              submitStatus === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {statusMessage}
            </div>
          )}
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            ← Back to Portal Selection
          </button>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            Demo Credentials
          </h3>
          <div className="text-xs text-blue-700 space-y-2">
            <div className="flex justify-between items-center">
              <span>AIS ID:</span>
              <span className="font-mono bg-white px-3 py-1 rounded-lg shadow-sm">123456789</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Boat ID:</span>
              <span className="font-mono bg-white px-3 py-1 rounded-lg shadow-sm">VESSEL-001</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Name:</span>
              <span className="font-mono bg-white px-3 py-1 rounded-lg shadow-sm">Captain Smith</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Phone:</span>
              <span className="font-mono bg-white px-3 py-1 rounded-lg shadow-sm">+1-555-0101</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FishermanLogin;
