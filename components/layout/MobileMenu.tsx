"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Navigation from "./Navigation";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("nav");

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        aria-expanded={isOpen}
        aria-label={isOpen ? t("closeMenu") : t("openMenu")}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Panel del menú móvil */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 px-4 py-4">
          <Navigation mobile />
          <div className="mt-4 pt-4 border-t border-gray-100">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </>
  );
}
