"use client";

import { formatAverageMs, formatPercent } from "@/lib/music-reading";
import type { RoundSummary } from "@/lib/music-reading";

interface SessionSummaryProps {
  levelTitle: string;
  locale: "es" | "en";
  onContinue: () => void;
  summary: RoundSummary;
}

export function SessionSummary({
  levelTitle,
  locale,
  onContinue,
  summary,
}: SessionSummaryProps) {
  const copy = COPY[locale];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <section
        aria-modal="true"
        className="w-full max-w-lg rounded-lg border border-white/10 bg-[#101722] p-5 shadow-2xl shadow-black/40"
        role="dialog"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#44d7b6]">
          {copy.roundSummary}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {summary.passed ? copy.levelPassed : copy.repeatLevel}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#b6c3d3]">
          {levelTitle}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <SummaryMetric label={copy.correct} value={summary.correct.toString()} />
          <SummaryMetric label={copy.errors} value={summary.incorrect.toString()} />
          <SummaryMetric
            label={copy.accuracy}
            value={formatPercent(summary.accuracy)}
          />
          <SummaryMetric
            label={copy.average}
            value={formatAverageMs(summary.averageResponseMs)}
          />
          <SummaryMetric label={copy.bestStreak} value={summary.bestStreak.toString()} />
          <SummaryMetric label={copy.nextLevel} value={summary.nextLevelId.toString()} />
        </dl>

        <button
          className="mt-6 min-h-11 w-full rounded-lg bg-[#44d7b6] px-4 text-sm font-semibold text-[#06110f] transition hover:bg-[#69e2c8] focus:outline-none focus:ring-2 focus:ring-[#f1c75b]"
          onClick={onContinue}
          type="button"
        >
          {copy.continue}
        </button>
      </section>
    </div>
  );
}

const COPY = {
  es: {
    roundSummary: "Resumen de ronda",
    levelPassed: "Nivel superado",
    repeatLevel: "Repite el nivel",
    correct: "Aciertos",
    errors: "Errores",
    accuracy: "Precisión",
    average: "Promedio",
    bestStreak: "Mejor racha",
    nextLevel: "Siguiente nivel",
    continue: "Continuar",
  },
  en: {
    roundSummary: "Round summary",
    levelPassed: "Level passed",
    repeatLevel: "Repeat this level",
    correct: "Correct",
    errors: "Errors",
    accuracy: "Accuracy",
    average: "Average",
    bestStreak: "Best streak",
    nextLevel: "Next level",
    continue: "Continue",
  },
};

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <dt className="text-[#8d9bad]">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-white">{value}</dd>
    </div>
  );
}
