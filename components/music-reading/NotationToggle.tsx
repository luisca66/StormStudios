"use client";

import type { NotationMode } from "@/lib/music-reading";

interface NotationToggleProps {
  locale: "es" | "en";
  mode: NotationMode;
  onChange: (mode: NotationMode) => void;
}

const OPTIONS: Array<{ label: string; mode: NotationMode }> = [
  { label: "Do Re Mi", mode: "latin" },
  { label: "C D E", mode: "english" },
];

const COPY = {
  es: {
    groupLabel: "Sistema de nombres de notas",
    latinLabel: "Usar nombres latinos",
    englishLabel: "Usar nombres anglosajones",
  },
  en: {
    groupLabel: "Note naming system",
    latinLabel: "Use solfege note names",
    englishLabel: "Use English note names",
  },
};

export function NotationToggle({ locale, mode, onChange }: NotationToggleProps) {
  const copy = COPY[locale];

  return (
    <div
      aria-label={copy.groupLabel}
      className="inline-grid grid-cols-2 rounded-lg border border-[#44d7b6]/30 bg-[#0b121b] p-1"
      role="group"
    >
      {OPTIONS.map((option) => {
        const isActive = option.mode === mode;

        return (
          <button
            aria-label={
              option.mode === "latin"
                ? copy.latinLabel
                : copy.englishLabel
            }
            aria-pressed={isActive}
            className={[
              "min-h-8 rounded-md px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#f1c75b]",
              isActive
                ? "bg-[#44d7b6] text-[#06110f]"
                : "text-[#44d7b6] hover:bg-[#44d7b6]/10",
            ].join(" ")}
            key={option.mode}
            onClick={() => onChange(option.mode)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
