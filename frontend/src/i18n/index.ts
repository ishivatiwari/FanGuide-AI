/**
 * FanGuide AI — i18n Configuration
 *
 * Supports: English (en), Spanish (es), French (fr), Portuguese (pt), Arabic (ar)
 * Arabic uses RTL layout — the <html dir> attribute is updated on language change.
 *
 * Translation keys are used throughout the UI for all visible labels.
 * The AI assistant responds in the selected language natively (no separate
 * translation tool call is needed — Claude handles this in the system prompt).
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';

export const RTL_LANGUAGES = ['ar'];

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      pt: { translation: pt },
      ar: { translation: ar },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

/** Call this whenever the language changes to update dir attribute for RTL. */
export function applyLanguageDirection(lang: string): void {
  const dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lang);
}

export default i18n;
