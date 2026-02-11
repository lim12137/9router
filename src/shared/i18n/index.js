"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { en, zh } from "./locales";

const LanguageContext = createContext();

const SUPPORTED_LANGUAGES = {
  en: { name: "English", flag: "🇺🇸" },
  zh: { name: "简体中文", flag: "🇨🇳" },
};

const DEFAULT_LANGUAGE = "en";

/**
 * Get initial language from localStorage or browser
 */
function getInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  // Try localStorage first
  const saved = localStorage.getItem("9router-language");
  if (saved && SUPPORTED_LANGUAGES[saved]) {
    return saved;
  }

  // Try browser language
  const browserLang = navigator.language.split("-")[0];
  return SUPPORTED_LANGUAGES[browserLang] ? browserLang : DEFAULT_LANGUAGE;
}

/**
 * Translate function
 */
function translate(t, lang, key, params = {}) {
  const keys = key.split(".");
  let value = t[lang];

  for (const k of keys) {
    if (value && typeof value === "object") {
      value = value[k];
    } else {
      value = key;
      break;
    }
  }

  if (typeof value !== "string") {
    return key;
  }

  // Replace params like {name}
  return value.replace(/\{(\w+)\}/g, (match, param) => params[param] || match);
}

/**
 * I18n Provider Component
 */
export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = (lang) => {
    if (SUPPORTED_LANGUAGES[lang]) {
      setLanguageState(lang);
      localStorage.setItem("9router-language", lang);
    }
  };

  const t = useMemo(() => {
    return (key, params) => translate({ en, zh }, language, key, params);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * useI18n Hook
 */
export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

// Re-export locales
export { en, zh };
