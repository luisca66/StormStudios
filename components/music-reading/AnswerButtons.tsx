"use client";

import { getNoteLabel } from "@/lib/music-reading";
import type { NoteName, NotationMode } from "@/lib/music-reading";

interface AnswerButtonsProps {
  disabled?: boolean;
  locale: "es" | "en";
  notationMode: NotationMode;
  onAnswer: (note: NoteName) => void;
}

const ANSWER_ROWS: NoteName[][] = [
  ["C", "D", "E", "F"],
  ["G", "A", "B"],
];

export function AnswerButtons({
  disabled = false,
  locale,
  notationMode,
  onAnswer,
}: AnswerButtonsProps) {
  const answerLabel = locale === "en" ? "Answer" : "Responder";

  return (
    <section className="rounded-lg border border-white/10 bg-[#151f2d]/86 p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        {ANSWER_ROWS.map((row) => (
          <div
            className={row.length === 4 ? "grid grid-cols-4 gap-3" : "grid grid-cols-3 gap-3"}
            key={row.join("-")}
          >
            {row.map((note) => (
              <button
                aria-label={`${answerLabel} ${getNoteLabel(note, notationMode)}`}
                className="min-h-14 rounded-lg border border-white/10 bg-white/[0.06] px-3 text-base font-semibold text-white transition hover:border-[#44d7b6]/60 hover:bg-[#44d7b6]/12 focus:outline-none focus:ring-2 focus:ring-[#f1c75b] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={disabled}
                key={note}
                onClick={() => onAnswer(note)}
                type="button"
              >
                {getNoteLabel(note, notationMode)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
