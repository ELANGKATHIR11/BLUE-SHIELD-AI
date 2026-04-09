import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageToggle: React.FC = () => {
  const { lang, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20 text-white shadow-sm"
      title="Toggle Language (English / தமிழ்)"
    >
      <Languages className="h-4 w-4" />
      <span className="text-sm font-bold uppercase tracking-wider">
        {lang === 'en' ? 'தமிழ்' : 'English'}
      </span>
    </button>
  );
};

export default LanguageToggle;
