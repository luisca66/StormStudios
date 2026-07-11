// Teoría de notas (PLAN §3.2) — port TS de music-theory.js de la webapp seria.

import type { ChordType } from "./chords";

export const SAMPLE_MIN_NOTE = "C2";
export const SAMPLE_MAX_NOTE = "C7";

const notePattern = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/;
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteToMidi(note: string): number {
  const match = note.trim().match(notePattern);
  if (!match) throw new Error(`Formato de nota inválido: ${note}`);

  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = parseInt(match[3], 10);

  const bases: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = bases[letter];
  if (base === undefined) throw new Error(`Nota inválida: ${note}`);

  let alteration = 0;
  if (accidental === "#" || accidental === "♯") alteration = 1;
  if (accidental === "b" || accidental === "♭") alteration = -1;

  return (octave + 1) * 12 + base + alteration;
}

export const sampleMinMidi = noteToMidi(SAMPLE_MIN_NOTE); // 36
export const sampleMaxMidi = noteToMidi(SAMPLE_MAX_NOTE); // 96

export function midiToNote(midi: number): string {
  let noteIndex = midi % 12;
  if (noteIndex < 0) noteIndex += 12;
  const octave = Math.floor(midi / 12) - 1;
  return sharpNames[noteIndex] + octave;
}

export function chromaticRange(start: string, end: string): string[] {
  const startMidi = noteToMidi(start);
  const endMidi = noteToMidi(end);
  if (startMidi > endMidi) return [];
  const range: string[] = [];
  for (let i = startMidi; i <= endMidi; i++) range.push(midiToNote(i));
  return range;
}

export function chordNotes(root: string, chordType: ChordType): string[] {
  const rootMidi = noteToMidi(root);
  return chordType.intervals.map((interval) => midiToNote(rootMidi + interval));
}

// TODAS las notas del acorde deben caber en el rango de samples [C2, C7].
export function hasSamplesFor(root: string, chordType: ChordType): boolean {
  const rootMidi = noteToMidi(root);
  return chordType.intervals.every((interval) => {
    const midi = rootMidi + interval;
    return midi >= sampleMinMidi && midi <= sampleMaxMidi;
  });
}
