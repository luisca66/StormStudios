/**
 * tie-chain.ts — Notas ligadas como una sola nota al editar (Sequencer v5).
 *
 * La partitura guarda una nota ligada como eventos consecutivos de la misma
 * voz y las mismas alturas, con `tie` en todos menos el último (así se escribe:
 * una mitad ligada sobre la barra). Al editar, en cambio, es una sola nota:
 * se selecciona, se mueve y se borra completa, y el editor de teclas la dibuja
 * como una barra continua. El formato no cambia.
 */
import { durationTicks } from "./model";
import { normalizeSelection, parseKey } from "./note-selection";
import type { NoteEvent, Score } from "./types";

const samePitches = (a: NoteEvent, b: NoteEvent) => a.pitches.length > 0 && [...a.pitches].sort().join() === [...b.pitches].sort().join();
/** ¿`a` se liga a `b`? (b empieza justo donde termina a, con las mismas alturas). */
export const tiesInto = (a: NoteEvent, b: NoteEvent) => a.tie && a.start + durationTicks(a) === b.start && samePitches(a, b);

/** Para cada evento de una voz: si viene ligado del anterior y si se liga al siguiente. */
export function tieLinks(events: NoteEvent[]): Map<string, { fromPrevious: boolean; toNext: boolean }> {
  const sorted = [...events].sort((a, b) => a.start - b.start), links = new Map<string, { fromPrevious: boolean; toNext: boolean }>();
  sorted.forEach((event, i) => {
    const previous = sorted[i - 1], next = sorted[i + 1];
    links.set(event.id, { fromPrevious: !!previous && tiesInto(previous, event), toNext: !!next && tiesInto(event, next) });
  });
  return links;
}

/** Los ids de la nota ligada completa que contiene `id`, en orden (solo `id` si no está ligada). */
export function tieChain(score: Score, id: string): string[] {
  const voice = score.voices.find(v => v.events.some(e => e.id === id));
  if (!voice) return [id];
  const sorted = [...voice.events].sort((a, b) => a.start - b.start);
  let first = sorted.findIndex(e => e.id === id), last = first;
  while (first > 0 && tiesInto(sorted[first - 1], sorted[first])) first--;
  while (last < sorted.length - 1 && tiesInto(sorted[last], sorted[last + 1])) last++;
  return sorted.slice(first, last + 1).map(e => e.id);
}

/** Amplía una selección a las notas ligadas completas (una altura de acorde arrastra esa altura en toda la cadena). */
export function withTieChains(score: Score, keys: string[]): string[] {
  return normalizeSelection(score, keys.flatMap(key => {
    const { id, pitch } = parseKey(key);
    return tieChain(score, id).map(member => pitch === undefined ? member : `${member}@${pitch}`);
  }));
}
