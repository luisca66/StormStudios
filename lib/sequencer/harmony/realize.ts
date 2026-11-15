/**
 * realize.ts — De una progresión de acordes a las cuatro voces (modo autor).
 *
 * Búsqueda en haz sobre las disposiciones de `voicing.ts`. Cada paso se acepta
 * solo si cumple las reglas del curso, revisadas con las MISMAS funciones del
 * Maestro Virtual (`voice-leading.ts`):
 * - Movimientos armónicos: sin 5as ni 8as paralelas o contrarias, sin saltos
 *   simultáneos en la misma dirección (salvo dos 4as justas).
 * - Movimientos melódicos por voz: solo intervalos permitidos, disminuidos
 *   con cambio de dirección, sin dos saltos seguidos en la misma dirección,
 *   sin salto de 8a con la sensible. La nota repetida se permite (enlaces).
 *
 * Entre las soluciones correctas se prefiere la de menor movimiento: notas
 * comunes que se quedan, grados conjuntos y sensible que resuelve.
 */
import { SATB_VOICES, type KeyModel, type SatbVoice } from "@/lib/maestro-virtual/satb-chords-validator";
import type { ProgressionChord } from "@/lib/maestro-virtual/harmonic-material";
import { checkHarmonicMotion, checkMelodicLine, intervalBetween, isLeap } from "@/lib/maestro-virtual/voice-leading";
import { enumerateVoicings, voicingCost, type Voicing } from "./voicing";

export type Realization = { voicings: Voicing[]; cost: number };
export type RealizeOptions = {
  /** Soprano obligada, un MIDI por acorde (armonizar una melodía). */
  soprano?: number[];
  /** Ancho del haz; más ancho = más lento y más exhaustivo. */
  beam?: number;
  /** Cuántas realizaciones distintas devolver, de mejor a peor. */
  results?: number;
};

const pcOf = (midi: number) => ((midi % 12) + 12) % 12;

/** ¿Es aceptable añadir `next` tras `path`? `final` = es el último acorde. */
function transitionAllowed(model: KeyModel, path: Voicing[], next: Voicing, final: boolean): boolean {
  const prev = path[path.length - 1];
  if (checkHarmonicMotion(SATB_VOICES, prev, next).length) return false;
  for (const voice of SATB_VOICES) {
    const line = [...path.slice(-2).map(v => v[voice]), next[voice]];
    const last = line.length - 2; // índice del intervalo recién añadido
    const issues = checkMelodicLine(line, { leadingPc: model.leadingPc, allowRepeat: true });
    for (const issue of issues) {
      if (issue.rule === "MELODIC_DIMINISHED_UNRESOLVED") {
        // El disminuido recién escrito se juzga en el paso siguiente, salvo al final.
        if (issue.index < last || final) return false;
      } else if (issue.index === last) return false;
    }
  }
  return true;
}

function transitionCost(model: KeyModel, prev: Voicing, next: Voicing, nextChord: ProgressionChord): number {
  let cost = 0;
  const weights: Record<SatbVoice, number> = { SOPRANO: 1, ALTO: 1, TENOR: 1, BASS: 0.3 };
  let up = 0, down = 0;
  for (const voice of SATB_VOICES) {
    const delta = next[voice].midi - prev[voice].midi;
    cost += Math.abs(delta) * weights[voice];
    if (delta > 0) up++; else if (delta < 0) down++;
    if (voice !== "BASS" && delta && isLeap(intervalBetween(prev[voice], next[voice]))) cost += 2;
  }
  if (up === 4 || down === 4) cost += 3; // las cuatro voces en la misma dirección
  // Invasión: una voz rebasa la nota que acaba de dejar su vecina.
  for (let i = 0; i + 1 < SATB_VOICES.length; i++) {
    const upper = SATB_VOICES[i], lower = SATB_VOICES[i + 1];
    if (next[lower].midi > prev[upper].midi || next[upper].midi < prev[lower].midi) cost += 3;
  }
  // La sensible en voz extrema prefiere resolver a la tónica cuando el acorde la tiene.
  const tonicPc = model.triads[0][0].pc;
  const nextHasTonic = model.triads[nextChord.degree - 1].some(t => t.pc === tonicPc);
  if (nextHasTonic) for (const voice of ["SOPRANO", "BASS"] as const) {
    if (pcOf(prev[voice].midi) === model.leadingPc && next[voice].midi - prev[voice].midi !== 1) cost += 3;
  }
  return cost;
}

/** Realiza la progresión; devuelve [] si ninguna disposición cumple las reglas. */
export function realize(model: KeyModel, chords: ProgressionChord[], options: RealizeOptions = {}): Realization[] {
  const beam = options.beam ?? 160;
  const results = options.results ?? 1;
  if (!chords.length) return [];
  let paths: Realization[] = [];
  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    const candidates = enumerateVoicings(model, chord, { soprano: options.soprano?.[i] })
      .map(voicing => ({ voicing, cost: voicingCost(voicing, chord) }));
    const final = i === chords.length - 1;
    const next: Realization[] = [];
    if (i === 0) {
      for (const c of candidates) next.push({ voicings: [c.voicing], cost: c.cost });
    } else {
      for (const path of paths) {
        const prev = path.voicings[path.voicings.length - 1];
        for (const c of candidates) {
          if (!transitionAllowed(model, path.voicings, c.voicing, final)) continue;
          next.push({ voicings: [...path.voicings, c.voicing], cost: path.cost + c.cost + transitionCost(model, prev, c.voicing, chord) });
        }
      }
    }
    if (!next.length) return [];
    next.sort((a, b) => a.cost - b.cost);
    paths = next.slice(0, beam);
  }
  // Un solo acorde: no hay enlace que revisar.
  return paths.slice(0, results);
}
