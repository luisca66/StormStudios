// Teoría de notas (PLAN §3.2 y §3.4) — port TS de music-theory.js de la webapp seria,
// más validRoots (elección de fundamental dentro del registro vocal).

import type { ChordType } from "./chords";
import type { Register } from "@/config";
import { REGISTERS } from "@/config";

export const SAMPLE_MIN_NOTE = "C2";
export const SAMPLE_MAX_NOTE = "C7";

const notePattern = /^([A-Ga-g])([#b♯♭]?)(-?\d+)$/;
const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function noteToMidi(note: string): number {
  const match = note.trim().match(notePattern);
  if (!match) throw new Error(`Formato de nota inválido: ${note}`);

  const letter = match[1];
  const accidental = match[2];
  const octaveText = match[3];

  let base: number;
  switch (letter.toUpperCase()) {
    case "C": base = 0; break;
    case "D": base = 2; break;
    case "E": base = 4; break;
    case "F": base = 5; break;
    case "G": base = 7; break;
    case "A": base = 9; break;
    case "B": base = 11; break;
    default: throw new Error(`Nota inválida: ${note}`);
  }

  let alteration = 0;
  if (accidental === "#" || accidental === "♯") alteration = 1;
  if (accidental === "b" || accidental === "♭") alteration = -1;

  return (parseInt(octaveText, 10) + 1) * 12 + base + alteration;
}

export const sampleMinMidi = noteToMidi(SAMPLE_MIN_NOTE); // 36
export const sampleMaxMidi = noteToMidi(SAMPLE_MAX_NOTE); // 96

export function midiToNote(midi: number): string {
  let noteIndex = midi % 12;
  if (noteIndex < 0) noteIndex += 12; // módulo JS con negativos
  const octave = Math.floor(midi / 12) - 1;
  return sharpNames[noteIndex] + octave;
}

// Nombre de clase de altura para el ANUNCIO de la consola ("Sol · 7ª menor"):
// solfeo en es, letras en en. (Las etiquetas de linterna usan midiToNote.)
const SOLFEGE = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
export function pitchClassName(midi: number, lang: "es" | "en"): string {
  const pc = ((midi % 12) + 12) % 12;
  return lang === "es" ? SOLFEGE[pc] : sharpNames[pc];
}

// Frecuencia de los targets del afinador (PLAN §3.2).
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function chordNotes(root: string, chordType: ChordType): string[] {
  const rootMidi = noteToMidi(root);
  return chordType.intervals.map((interval) => midiToNote(rootMidi + interval));
}

export function hasSamplesFor(root: string, chordType: ChordType): boolean {
  return chordNotes(root, chordType).every((note) => {
    const midi = noteToMidi(note);
    return midi >= sampleMinMidi && midi <= sampleMaxMidi;
  });
}

export function maxInterval(chordType: ChordType): number {
  return Math.max(...chordType.intervals);
}

// Fundamentales válidas (MIDI) para que el acorde COMPLETO quepa en el registro vocal
// (PLAN §3.4). El span máximo es 21 st y los registros miden 26 st → nunca es vacío.
// La comprobación de samples es defensa en profundidad (dentro de los registros
// vocales siempre se cumple).
export function validRoots(chordType: ChordType, register: Register): number[] {
  const { lo, hi } = REGISTERS[register];
  const top = hi - maxInterval(chordType);
  const roots: number[] = [];
  for (let r = lo; r <= top; r++) {
    if (hasSamplesFor(midiToNote(r), chordType)) roots.push(r);
  }
  return roots;
}
