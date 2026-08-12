import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { lang, toggleLanguage, t } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/20 text-white shadow-sm font-sans active:scale-95"
      title={t('a11y.toggleLang')}
      aria-label={t('a11y.toggleLang')}
    >
      <Languages className="h-4 w-4 text-white opacity-90" />
      <span className="text-xs font-bold tracking-wider">
        {lang === 'en' ? 'தமிழ்' : 'English'}
      </span>
    </button>
  );
};

export default LanguageToggle;
