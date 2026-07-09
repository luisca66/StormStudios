"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Navigation from "./Navigation";
import LanguageSwitcher from "@/components/ui/LanguageSwitcher";

const mobileMenuId = "mobile-navigation";

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("nav");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Botón hamburguesa */}
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="ss-menu-trigger md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        aria-controls={mobileMenuId}
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
        <div
          id={mobileMenuId}
          className="ss-mobile-menu md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 px-4 py-4"
        >
          <Navigation mobile onNavigate={closeMenu} />
          <div className="ss-header-language mt-4 pt-4 border-t border-gray-100">
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </>
  );
}
