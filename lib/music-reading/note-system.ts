import type { NoteName, NotationMode } from "./types";

export const NATURAL_NOTES: NoteName[] = ["C", "D", "E", "F", "G", "A", "B"];

export const NOTE_LABELS: Record<NotationMode, Record<NoteName, string>> = {
  latin: {
    C: "Do",
    D: "Re",
    E: "Mi",
    F: "Fa",
    G: "Sol",
    A: "La",
    B: "Si",
  },
  english: {
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    G: "G",
    A: "A",
    B: "B",
  },
};

const LATIN_TO_NOTE: Record<string, NoteName> = {
  do: "C",
  re: "D",
  mi: "E",
  fa: "F",
  sol: "G",
  la: "A",
  si: "B",
};

export function isNoteName(value: string): value is NoteName {
  return NATURAL_NOTES.includes(value.toUpperCase() as NoteName);
}

export function getNoteLabel(note: NoteName, mode: NotationMode): string {
  return NOTE_LABELS[mode][note];
}

export function getAnswerOptions(mode: NotationMode): string[] {
  return NATURAL_NOTES.map((note) => getNoteLabel(note, mode));
}

export function normalizeNoteInput(value: string): NoteName | null {
  const normalized = value.trim().toLowerCase();
  const latinNote = LATIN_TO_NOTE[normalized];

  if (latinNote) {
    return latinNote;
  }

  const englishNote = value.trim().toUpperCase();
  return isNoteName(englishNote) ? englishNote : null;
}
