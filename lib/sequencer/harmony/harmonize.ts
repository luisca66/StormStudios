/**
 * harmonize.ts — Armonizar una melodía de soprano (modo autor).
 *
 * Dos etapas:
 * 1. Elegir progresiones: cada nota admite los acordes del material del curso
 *    que la contienen; los enlaces deben estar en la tabla de Medrano
 *    (`MAJOR_LINKS`) y cumplir las continuaciones obligadas (`checkProgression`).
 *    Se prefiere empezar y terminar en I, cadencia V–I y estados fundamentales.
 * 2. Realizar cada progresión con la soprano fija (`realize`).
 *
 * Devuelve varias armonizaciones distintas para que el autor elija.
 */
import type { KeyModel } from "@/lib/maestro-virtual/satb-chords-validator";
import { checkProgression, MAJOR_LINKS, type ProgressionChord } from "@/lib/maestro-virtual/harmonic-material";
import { realize, type Realization } from "./realize";

export type Harmonization = Realization & { chords: ProgressionChord[] };
export type HarmonizeOptions = { results?: number; beam?: number };

const pcOf = (midi: number) => ((midi % 12) + 12) % 12;
const same = (a: ProgressionChord, b: ProgressionChord) => a.degree === b.degree && a.inversion === b.inversion;

/** Acordes que aparecen en la tabla de enlaces del curso. */
export const MATERIAL: ProgressionChord[] = MAJOR_LINKS
  .flatMap(link => [link.from, link.to])
  .filter((chord, index, all) => all.findIndex(other => same(other, chord)) === index);

const linked = (a: ProgressionChord, b: ProgressionChord) =>
  MAJOR_LINKS.some(link => same(link.from, a) && same(link.to, b));

function chordCost(chord: ProgressionChord, index: number, length: number): number {
  let cost = 0;
  if (chord.inversion) cost += 0.6;
  if (chord.degree === 7) cost += 1;
  if (chord.degree === 3) cost += 1.5;
  if (chord.degree === 6) cost += 0.4;
  const tonic = chord.degree === 1 && chord.inversion === 0;
  if (index === 0 && !tonic) cost += 6;
  if (index === length - 1 && !tonic) cost += 40;
  if (index === length - 2 && length > 1 && !(chord.degree === 5 && chord.inversion === 0)) cost += chord.degree === 4 || chord.degree === 5 ? 1.5 : 4;
  return cost;
}

/** Progresiones candidatas para la melodía, de mejor a peor. */
export function progressionsFor(model: KeyModel, soprano: number[], limit = 12, beam = 400): ProgressionChord[][] {
  type Path = { chords: ProgressionChord[]; cost: number };
  let paths: Path[] = [{ chords: [], cost: 0 }];
  for (let i = 0; i < soprano.length; i++) {
    const pc = pcOf(soprano[i]);
    const options = MATERIAL.filter(chord => model.triads[chord.degree - 1].some(tone => tone.pc === pc));
    const next: Path[] = [];
    for (const path of paths) {
      const prev = path.chords[path.chords.length - 1];
      for (const chord of options) {
        if (prev && !linked(prev, chord)) continue;
        // Variedad: no volver enseguida al mismo grado dos acordes atrás (I–V–I–V…) cuesta un poco.
        const back = path.chords[path.chords.length - 2];
        const echo = back && back.degree === chord.degree ? 0.8 : 0;
        next.push({ chords: [...path.chords, chord], cost: path.cost + chordCost(chord, i, soprano.length) + echo });
      }
    }
    if (!next.length) return [];
    next.sort((a, b) => a.cost - b.cost);
    paths = next.slice(0, beam);
  }
  return paths.filter(path => !checkProgression(path.chords).length).slice(0, limit).map(path => path.chords);
}

/** Cuántos acordes distinguen dos progresiones del mismo largo. */
const distance = (a: ProgressionChord[], b: ProgressionChord[]) => a.filter((chord, index) => !same(chord, b[index])).length;

export function harmonize(model: KeyModel, soprano: number[], options: HarmonizeOptions = {}): Harmonization[] {
  if (!soprano.length) return [];
  const wanted = options.results ?? 3;
  const candidates = progressionsFor(model, soprano, 80);
  // Primero opciones que de verdad suenen distintas (al menos dos acordes de diferencia);
  // si no alcanzan, se completa con las siguientes mejores.
  const out: Harmonization[] = [];
  for (const minimum of [Math.min(2, soprano.length), 1]) {
    for (const chords of candidates) {
      if (out.length >= wanted) return out;
      if (out.some(option => distance(option.chords, chords) < minimum)) continue;
      const [best] = realize(model, chords, { soprano, beam: options.beam });
      if (best) out.push({ ...best, chords });
    }
  }
  return out;
}
