import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { translations } from '../data/translations';

export type Language = 'en' | 'ta';

interface LanguageContextType {
  lang: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  toggleLanguage: () => {},
  t: (k) => k,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(() => {
    // Load language from localStorage if available
    const saved = localStorage.getItem('blueShieldLanguage');
    return (saved as Language) || 'en';
  });

  // Save language to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('blueShieldLanguage', lang);
  }, [lang]);

  const toggleLanguage = () => setLang(p => p === 'en' ? 'ta' : 'en');
  const t = (key: string): string => translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  return <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>{children}</LanguageContext.Provider>;
};
// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => useContext(LanguageContext);
