import React, { createContext, useContext, useState } from 'react';
import translations from './translations';

const LanguageContext = createContext({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') || 'en'
  );

  const setLang = (l) => {
    localStorage.setItem('lang', l);
    setLangState(l);
  };

  /**
   * Translate a key with optional variable interpolation.
   * Example: t('collection.title', { n: 42, worth: ' worth $12.00' })
   */
  const t = (key, vars = {}) => {
    const str =
      translations[lang]?.[key] ??
      translations['en']?.[key] ??
      key;
    return Object.entries(vars).reduce(
      (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? '')),
      str
    );
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useI18n = () => useContext(LanguageContext);
