/**
 * chord-track.ts — La pista de acordes del Sequencer v5 (público y autor).
 *
 * La pista NO añade nada al formato de la partitura: son las anotaciones
 * `kind: "roman"` que ya existen en la v4, ordenadas en el tiempo. Un proyecto
 * de la v5 se abre igual en la v4 y en el flujo de stills/video.
 *
 * Aquí solo se lee y se escribe cifrado a mano. Nada de este archivo genera
 * notas: eso es del modo autor (`score-bridge.ts`).
 */
import { locateTick, measureStart, measureTicks, newId, scoreTicks, validateScore } from "../model";
import { PPQ, type Score } from "../types";
import { keyModel, parseChordToken, type ChordSpec } from "./chords";

export type ChordSlot = {
  id: string; text: string; measure: number; beat: number;
  tick: number; endTick: number; key: string;
  /** null = el texto no es un acorde del material del curso en esa tonalidad (se conserva como texto libre). */
  chord: ChordSpec | null;
};

const annotationTick = (score: Score, measure: number, beat: number) => measureStart(score, measure) + Math.round((beat - 1) * PPQ);

/** Pista de acordes en orden; cada acorde dura hasta el siguiente o hasta el fin de su compás. */
export function chordTrack(score: Score): ChordSlot[] {
  const sorted = (score.annotations ?? [])
    .filter(a => a.kind === "roman" && a.text.trim())
    .map(a => ({ a, tick: annotationTick(score, a.measure, a.beat) }))
    .sort((x, y) => x.tick - y.tick);
  return sorted.map(({ a, tick }, index) => {
    const measureEnd = measureStart(score, a.measure) + measureTicks(score.measures[a.measure - 1]);
    const endTick = Math.min(sorted[index + 1]?.tick ?? measureEnd, measureEnd);
    const key = score.measures[a.measure - 1].key;
    let chord: ChordSpec | null = null;
    try { chord = parseChordToken(a.text, keyModel(key)); } catch { chord = null; }
    return { id: a.id, text: a.text, measure: a.measure, beat: a.beat, tick, endTick, key, chord };
  });
}

/** Escribe (o reemplaza) el cifrado de un compás y pulso. Texto vacío = borrar. */
export function setChordAt(score: Score, measure: number, beat: number, text: string): Score {
  const next = structuredClone(score);
  const rest = (next.annotations ?? []).filter(a => !(a.kind === "roman" && a.measure === measure && Math.abs(a.beat - beat) < 1e-6));
  if (text.trim()) rest.push({ id: newId(), measure, beat, text: text.trim(), kind: "roman" });
  next.annotations = rest;
  return validateScore(next);
}

/**
 * Escribe una progresión de texto («I IV V I», «C – F – G – C») a partir de un
 * compás, un acorde cada `beats` pulsos de negra. Reemplaza el cifrado que
 * hubiera en ese tramo y añade los compases que falten.
 */
export function writeProgression(score: Score, text: string, startMeasure: number, beats: number): { score: Score; written: number } {
  const tokens = text.split(/[\s,;|]+|\s*[–—]\s*|\s+-\s+/).map(token => token.trim()).filter(Boolean);
  const next = structuredClone(score);
  if (!tokens.length) return { score: next, written: 0 };
  const start = measureStart(next, startMeasure), step = Math.round(beats * PPQ), end = start + step * tokens.length;
  while (scoreTicks(next) < end) { const last = next.measures.at(-1)!; next.measures.push({ id: newId(), key: last.key, time: [...last.time] }); }
  next.annotations = (next.annotations ?? []).filter(a => {
    if (a.kind !== "roman") return true;
    const tick = annotationTick(next, a.measure, a.beat);
    return tick < start || tick >= end;
  });
  tokens.forEach((token, index) => {
    const at = locateTick(next, start + index * step);
    next.annotations!.push({ id: newId(), measure: at.measure, beat: at.beat, text: token, kind: "roman" });
  });
  return { score: validateScore(next), written: tokens.length };
}

/** Borra toda la pista de acordes. */
export function clearChordTrack(score: Score): Score {
  return validateScore({ ...structuredClone(score), annotations: (score.annotations ?? []).filter(a => a.kind !== "roman") });
}
