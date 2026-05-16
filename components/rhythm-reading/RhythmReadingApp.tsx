"use client";

import { EjercicioPlayer } from "./_components/EjercicioPlayer";

type RhythmReadingLocale = "es" | "en";

const COPY = {
  es: {
    eyebrow: "Módulo Propedéutico · P02",
    title: "Lectura Rítmica",
    subtitle: "Selecciona un patrón, ajusta el tempo y tapea la figura.",
  },
  en: {
    eyebrow: "Preparatory Module · P02",
    title: "Rhythm Reading",
    subtitle: "Choose a pattern, adjust the tempo, and tap the rhythm.",
  },
};

export function RhythmReadingApp({
  locale = "es",
}: {
  locale?: RhythmReadingLocale;
}) {
  const copy = COPY[locale];

  return (
    <div
      className="relative min-h-screen"
      style={{ background: "var(--ss-bg)", color: "var(--ss-text)" }}
    >
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />
      <div className="ss-orb ss-orb-c" aria-hidden />

      <div
        className="relative z-10"
        style={{ maxWidth: "860px", margin: "0 auto", padding: "96px 24px 48px" }}
      >
        <div className="mb-8 text-center">
          <p
            className="ss-mono mb-3 text-xs uppercase tracking-widest"
            style={{ color: "rgba(139,92,246,0.8)" }}
          >
            {copy.eyebrow}
          </p>
          <h1
            className="ss-serif mb-2"
            style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", lineHeight: 1.1 }}
          >
            <span className="ss-text-gradient">{copy.title}</span>
          </h1>
          <p
            className="ss-mono"
            style={{ color: "rgba(240,238,255,0.4)", fontSize: "0.85rem" }}
          >
            {copy.subtitle}
          </p>
        </div>

        <EjercicioPlayer locale={locale} />
      </div>
    </div>
  );
}
