import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translate, Language, TranslationParams } from '../i18n';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  toggleLanguage: () => {},
  setLanguage: () => {},
  t: (k, params) => translate(k, params, 'en'),
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    // Load language from localStorage if available
    const saved = localStorage.getItem('blueShieldLanguage');
    if (saved === 'en' || saved === 'ta') {
      return saved;
    }
    // Fallback to browser language if available
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('ta')) {
      return 'ta';
    }
    return 'en';
  });

  // Save language to localStorage and update <html lang="..."> attribute
  useEffect(() => {
    localStorage.setItem('blueShieldLanguage', lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const toggleLanguage = () => setLang((p) => (p === 'en' ? 'ta' : 'en'));
  const setLanguage = (newLang: Language) => setLang(newLang);
  
  const t = (key: string, params?: TranslationParams): string => {
    return translate(key, params, lang);
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
