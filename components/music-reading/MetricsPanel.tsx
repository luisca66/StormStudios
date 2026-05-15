"use client";

import {
  formatAverageMs,
  formatPercent,
  getAccuracy,
  getAverageResponseMs,
} from "@/lib/music-reading";
import type { SessionStats } from "@/lib/music-reading";

interface MetricsPanelProps {
  exerciseNumber: number;
  locale: "es" | "en";
  roundLength: number;
  stats: SessionStats;
}

export function MetricsPanel({
  exerciseNumber,
  locale,
  roundLength,
  stats,
}: MetricsPanelProps) {
  const copy = COPY[locale];

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">{copy.metrics}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Metric label={copy.correct} value={stats.correct.toString()} />
        <Metric label={copy.errors} value={stats.incorrect.toString()} />
        <Metric label={copy.accuracy} value={formatPercent(getAccuracy(stats))} />
        <Metric label={copy.streak} value={stats.currentStreak.toString()} />
        <Metric
          label={copy.average}
          value={formatAverageMs(getAverageResponseMs(stats))}
        />
        <Metric label={copy.exercise} value={`${exerciseNumber}/${roundLength}`} />
      </dl>
    </section>
  );
}

const COPY = {
  es: {
    metrics: "Métricas",
    correct: "Aciertos",
    errors: "Errores",
    accuracy: "Precisión",
    streak: "Racha",
    average: "Promedio",
    exercise: "Ejercicio",
  },
  en: {
    metrics: "Metrics",
    correct: "Correct",
    errors: "Errors",
    accuracy: "Accuracy",
    streak: "Streak",
    average: "Average",
    exercise: "Exercise",
  },
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#8d9bad]">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-white">{value}</dd>
    </div>
  );
}
