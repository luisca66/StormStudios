"use client";

import { MAX_LEVEL_ID } from "@/lib/music-reading";
import type { MusicReadingLevel, MusicReadingProgress } from "@/lib/music-reading";

interface LevelProgressProps {
  locale: "es" | "en";
  level: MusicReadingLevel;
  progress: MusicReadingProgress;
  onClearProgress: () => void;
  onLevelChange: (levelId: number) => void;
  onResetLevel: () => void;
}

export function LevelProgress({
  locale,
  level,
  onClearProgress,
  onLevelChange,
  onResetLevel,
  progress,
}: LevelProgressProps) {
  const copy = COPY[locale];
  const levelPercent = `${Math.round((level.id / MAX_LEVEL_ID) * 100)}%`;
  const levelOptions = Array.from({ length: MAX_LEVEL_ID }, (_, index) => {
    return index + 1;
  });

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{copy.progress}</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-[#b6c3d3] transition hover:border-[#44d7b6]/60 hover:text-[#44d7b6] focus:outline-none focus:ring-2 focus:ring-[#f1c75b]"
            onClick={onResetLevel}
            type="button"
          >
            {copy.resetLevel}
          </button>
          <button
            className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-[#8d9bad] transition hover:border-[#f1c75b]/60 hover:text-[#f1c75b] focus:outline-none focus:ring-2 focus:ring-[#f1c75b]"
            onClick={onClearProgress}
            type="button"
          >
            {copy.clearProgress}
          </button>
        </div>
      </div>
      <div
        aria-label={`${copy.levelProgress}: ${copy.level.toLowerCase()} ${level.id} ${copy.of} ${MAX_LEVEL_ID}`}
        aria-valuemax={MAX_LEVEL_ID}
        aria-valuemin={1}
        aria-valuenow={level.id}
        className="mt-4 h-2 overflow-hidden rounded-lg bg-white/10"
        role="progressbar"
      >
        <div className="h-full bg-[#44d7b6]" style={{ width: levelPercent }} />
      </div>
      <label className="mt-4 flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#8d9bad]">
        {copy.goToLevel}
        <select
          className="min-h-10 rounded-lg border border-white/10 bg-[#101722] px-3 text-sm font-semibold tracking-normal text-white outline-none transition focus:border-[#44d7b6]/70 focus:ring-2 focus:ring-[#f1c75b]"
          onChange={(event) => onLevelChange(Number(event.target.value))}
          onInput={(event) => onLevelChange(Number(event.currentTarget.value))}
          value={level.id}
        >
          {levelOptions.map((levelId) => (
            <option key={levelId} value={levelId}>
              {copy.level} {levelId}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <ClefStatus
          attempted={progress.clefs.treble.attempted}
          correct={progress.clefs.treble.correct}
          emptyLabel={copy.pending}
          label={copy.trebleClef}
        />
        <ClefStatus
          attempted={progress.clefs.bass.attempted}
          correct={progress.clefs.bass.correct}
          emptyLabel={copy.pending}
          label={copy.bassClef}
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-[#8d9bad]">
        {copy.bestLevel}: {progress.bestLevelId} · {copy.rounds}:{" "}
        {progress.completedRounds}
      </p>
    </section>
  );
}

const COPY = {
  es: {
    progress: "Progreso",
    resetLevel: "Reiniciar nivel",
    clearProgress: "Borrar progreso",
    levelProgress: "Progreso de niveles",
    goToLevel: "Ir a nivel",
    level: "Nivel",
    of: "de",
    trebleClef: "Clave de sol",
    bassClef: "Clave de fa",
    pending: "Pendiente",
    bestLevel: "Mejor nivel",
    rounds: "Rondas",
  },
  en: {
    progress: "Progress",
    resetLevel: "Reset level",
    clearProgress: "Clear progress",
    levelProgress: "Level progress",
    goToLevel: "Go to level",
    level: "Level",
    of: "of",
    trebleClef: "Treble clef",
    bassClef: "Bass clef",
    pending: "Pending",
    bestLevel: "Best level",
    rounds: "Rounds",
  },
};

function ClefStatus({
  attempted,
  correct,
  emptyLabel,
  label,
}: {
  attempted: number;
  correct: number;
  emptyLabel: string;
  label: string;
}) {
  const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

  return (
    <div>
      <p className="text-[#8d9bad]">{label}</p>
      <p className="mt-1 font-semibold text-white">
        {attempted === 0 ? emptyLabel : `${accuracy}%`}
      </p>
    </div>
  );
}
