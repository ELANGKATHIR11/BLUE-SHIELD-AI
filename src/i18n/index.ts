import { en } from './locales/en';
import { ta } from './locales/ta';
import { Language, TranslationParams, TranslationDictionary } from './types';

export * from './types';

export const locales: Record<Language, TranslationDictionary> = {
  en,
  ta,
};

// Legacy object reference for compatibility with existing code
export const translations = locales;

/**
 * Replace placeholders like {{boatId}} or {boatId} with parameter values
 */
export function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return Object.entries(params).reduce((str, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}|{\\s*${key}\\s*}`, 'g');
    return str.replace(pattern, String(value));
  }, template);
}

/**
 * Get translated text for a key, with fallback to English and variable interpolation
 */
export function translate(key: string, params?: TranslationParams, lang: Language = 'en'): string {
  const langDict = locales[lang];
  const fallbackDict = locales['en'];
  
  const template = langDict?.[key] ?? fallbackDict?.[key] ?? key;
  return interpolate(template, params);
}

/**
 * Development-time check to catch missing translation keys between languages
 */
export function validateTranslations(): void {
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return;

  const enKeys = new Set(Object.keys(en));
  const taKeys = new Set(Object.keys(ta));

  const missingInTa = [...enKeys].filter((k) => !taKeys.has(k));
  const missingInEn = [...taKeys].filter((k) => !enKeys.has(k));

  if (missingInTa.length > 0) {
    console.warn(`[i18n Validation] Missing Tamil translation keys (${missingInTa.length}):`, missingInTa);
  }
  if (missingInEn.length > 0) {
    console.warn(`[i18n Validation] Missing English translation keys (${missingInEn.length}):`, missingInEn);
  }
}

// Run validation in dev mode automatically
if (typeof window !== 'undefined') {
  validateTranslations();
}
