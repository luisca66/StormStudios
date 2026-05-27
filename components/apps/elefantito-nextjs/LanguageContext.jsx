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
    setMounted(true);
  }, [initialLanguage]);

  const toggleLanguage = () => {
    const newLang = lang === "es" ? "en" : "es";
    setLang(newLang);

    const { pathname, search, hash } = window.location;
    const parts = pathname.split("/");
    if (parts[1] === "es" || parts[1] === "en") {
      parts[1] = newLang;
    } else {
      parts.splice(1, 0, newLang);
    }
    window.location.assign(`${parts.join("/")}${search}${hash}`);
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
