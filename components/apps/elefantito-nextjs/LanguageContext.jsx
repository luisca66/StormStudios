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
    // The route locale is the source of truth. A saved in-app preference should
    // never force /en pages back into Spanish or /es pages back into English.
    const routeLanguage = translations[initialLanguage] ? initialLanguage : "es";
    setLang(routeLanguage);
    localStorage.setItem("app_language", routeLanguage);
    setMounted(true);
  }, [initialLanguage]);

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
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
