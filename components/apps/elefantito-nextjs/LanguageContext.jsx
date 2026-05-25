"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import es from "./es.json";
import en from "./en.json";

const translations = { es, en };

const LanguageContext = createContext();

export function LanguageProvider({ children, initialLanguage = "es" }) {
  const [lang, setLang] = useState(initialLanguage); // default to Spanish
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load preference from local storage if available
    const savedLang = localStorage.getItem("app_language");
    if (savedLang && translations[savedLang]) {
      setLang(savedLang);
    }
    setMounted(true);
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === "es" ? "en" : "es";
    setLang(newLang);
    localStorage.setItem("app_language", newLang);
  };

  const t = (key) => {
    return translations[lang][key] || key;
  };

  // Prevent hydration mismatch by returning nothing until mounted
  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
