/**
 * transpose.ts — Pasar un ejemplo completo a otra tonalidad (modo autor).
 *
 * Transporte por intervalo escrito, no por semitonos: cada nota conserva su
 * función y su grafía (el Fa# de Sol mayor se vuelve Do# en Re mayor, nunca
 * Reb). El cifrado romano no cambia. Se elige subir o bajar según qué versión
 * deja a las voces dentro de sus tesituras.
 *
 * Solo para el autor: sirve para preparar un mismo ejemplo en varias
 * tonalidades. No se importa desde código público.
 */
import { LESSON6_RANGES, type SatbVoice } from "@/lib/maestro-virtual/satb-chords-validator";
import { pitchToMidi, validateScore } from "../model";
import type { Score, VoiceId } from "../types";
import { keyModel } from "./chords";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const RANGE_OF: Partial<Record<VoiceId, SatbVoice>> = { soprano: "SOPRANO", alto: "ALTO", tenor: "TENOR", bass: "BASS" };

type Written = { step: number; alter: number }; // step = octava * 7 + índice de letra
const parse = (pitch: string): Written => {
  const match = /^([A-G])(#{1,2}|b{1,2})?(-?\d+)$/.exec(pitch);
  if (!match) throw new Error(`Nota no válida: ${pitch}`);
  const accidental = match[2] ?? "";
  return { step: Number(match[3]) * 7 + LETTERS.indexOf(match[1]), alter: accidental.startsWith("#") ? accidental.length : -accidental.length };
};
const midiOf = (note: Written) => 12 * (Math.floor(note.step / 7) + 1) + NATURAL[((note.step % 7) + 7) % 7] + note.alter;
const write = (note: Written) => LETTERS[((note.step % 7) + 7) % 7] + (note.alter > 0 ? "#".repeat(note.alter) : "b".repeat(-note.alter)) + Math.floor(note.step / 7);

/** Mueve una nota `steps` letras y `semitones` semitonos: la alteración sale de la diferencia. */
function shift(pitch: string, steps: number, semitones: number): string {
  const source = parse(pitch), step = source.step + steps;
  const alter = midiOf(source) + semitones - midiOf({ step, alter: 0 });
  if (Math.abs(alter) > 2) throw new Error(`${pitch} no se puede escribir en la tonalidad nueva (necesitaría una triple alteración).`);
  return write({ step, alter });
}

export type Transposition = {
  score: Score; from: string; to: string; direction: "up" | "down" | "same";
  /** Notas SATB que quedaron fuera de su tesitura: un transporte parejo no siempre cabe. */
  outside: number;
};

/** Transporta toda la partitura a `key`. Requiere una sola tonalidad mayor en toda la partitura. */
export function transposeToKey(score: Score, key: string): Transposition {
  const from = score.measures[0].key;
  if (score.measures.some(measure => measure.key !== from)) throw new Error("La partitura cambia de tonalidad; transporta un tramo a la vez.");
  const source = keyModel(from).tonic, target = keyModel(key).tonic;
  if (from === key) return { score: validateScore(structuredClone(score)), from, to: key, direction: "same", outside: 0 };
  const letter = (s: { letter: string }) => LETTERS.indexOf(s.letter.toUpperCase());
  const pc = (s: { letter: string; alter: number }) => NATURAL[letter(s)] + s.alter;
  // Intervalo ascendente entre tónicas (0–6 letras, 0–11 semitonos); bajar es su complemento.
  const up = { steps: (letter(target) - letter(source) + 7) % 7, semitones: (((pc(target) - pc(source)) % 12) + 12) % 12 };
  if (up.steps === 0) up.semitones = up.semitones > 6 ? up.semitones - 12 : up.semitones; // Do → Do# / Dob: misma letra
  const down = up.steps === 0 ? up : { steps: up.steps - 7, semitones: up.semitones - 12 };
  const apply = (move: { steps: number; semitones: number }) => {
    const next = structuredClone(score);
    let outside = 0;
    for (const voice of next.voices) {
      const range = RANGE_OF[voice.id] && LESSON6_RANGES[RANGE_OF[voice.id]!];
      for (const event of voice.events) {
        event.pitches = event.pitches.map(pitch => shift(pitch, move.steps, move.semitones));
        if (range) for (const pitch of event.pitches) { const midi = pitchToMidi(pitch); if (midi < range.min || midi > range.max) outside++; }
      }
    }
    for (const measure of next.measures) measure.key = key;
    return { next, outside };
  };
  const attempts = [{ move: up, direction: "up" as const }, { move: down, direction: "down" as const }]
    .flatMap(option => { try { return [{ ...option, ...apply(option.move) }]; } catch { return []; } });
  if (!attempts.length) throw new Error("Esta música no se puede escribir en la tonalidad elegida.");
  // Menos notas fuera de tesitura; en empate, el camino más corto.
  attempts.sort((a, b) => a.outside - b.outside || Math.abs(a.move.semitones) - Math.abs(b.move.semitones));
  const best = attempts[0];
  return { score: validateScore(best.next), from, to: key, direction: up.steps === 0 && up.semitones === 0 ? "same" : best.direction, outside: best.outside };
}
