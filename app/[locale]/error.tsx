"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  const locale = useLocale();
  const es = locale === "es";

  useEffect(() => {
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
      <p className="text-7xl mb-6" aria-hidden="true">
        🎻
      </p>
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        {es ? "Algo salió mal" : "Something went wrong"}
      </h1>
      <p className="text-lg text-gray-600 mb-10">
        {es
          ? "Ocurrió un error inesperado. Puedes intentar de nuevo."
          : "An unexpected error occurred. You can try again."}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
      >
        {es ? "Reintentar" : "Try again"}
      </button>
    </div>
  );
}
