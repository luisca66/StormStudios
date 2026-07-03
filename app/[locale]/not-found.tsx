"use client";

import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const locale = useLocale();
  const es = locale === "es";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <p className="text-7xl mb-6" aria-hidden="true">
        🎼
      </p>
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
        {es ? "Página no encontrada" : "Page not found"}
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        {es
          ? "Esta nota no existe en la partitura. Puede que el enlace haya cambiado o que la página ya no esté disponible."
          : "This note isn't in the score. The link may have changed or the page may no longer exist."}
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
        >
          {es ? "Ir al inicio" : "Go home"}
        </Link>
        <Link
          href="/apps"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors"
        >
          {es ? "Ver las apps" : "Browse the apps"}
        </Link>
        <Link
          href="/curso-armonia"
          className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors"
        >
          {es ? "Curso de armonía" : "Harmony course"}
        </Link>
      </div>
    </div>
  );
}
