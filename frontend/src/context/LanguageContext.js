import { createContext, useContext, useState } from 'react';
import en from '../locales/en.json';
import km from '../locales/km.json';

const dictionaries = { en, km };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');

  function setLanguage(code) {
    localStorage.setItem('lang', code);
    setLang(code);
  }

  function t(key) {
    return dictionaries[lang][key] || dictionaries.en[key] || key;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
