/**
 * measure-edit.ts — Insertar, quitar y duplicar compases completos (Sequencer v5).
 *
 * Todo lo que vive en el tiempo se mueve junto: eventos de las cinco voces,
 * anotaciones (cifrado y texto) y rangos de escena. Las funciones devuelven
 * una partitura nueva y validada; la original no cambia.
 */
import { durationTicks, measureStart, measureTicks, newId, validateScore } from "./model";
import type { Score } from "./types";

function assertMeasure(score: Score, oneBased: number) {
  if (!Number.isInteger(oneBased) || oneBased < 1 || oneBased > score.measures.length) throw new RangeError(`El compás ${oneBased} no existe.`);
}

/** Inserta un compás vacío después del compás dado (0 = al principio), con su misma armadura y métrica. */
export function insertMeasureAfter(score: Score, oneBased: number): Score {
  if (oneBased !== 0) assertMeasure(score, oneBased);
  const next = structuredClone(score);
  const model = next.measures[Math.max(0, oneBased - 1)];
  const at = oneBased === 0 ? 0 : measureStart(score, oneBased) + measureTicks(score.measures[oneBased - 1]);
  const length = measureTicks(model);
  next.measures.splice(oneBased, 0, { id: newId(), key: model.key, time: [...model.time] });
  for (const voice of next.voices) for (const event of voice.events) if (event.start >= at) event.start += length;
  for (const annotation of next.annotations ?? []) if (annotation.measure > oneBased) annotation.measure += 1;
  for (const scene of next.scenes) {
    if (scene.startMeasure > oneBased) scene.startMeasure += 1;
    if (scene.endMeasure > oneBased) scene.endMeasure += 1;
  }
  return validateScore(next);
}

/** Quita un compás con todo lo que contiene; lo que sigue se recorre. La partitura conserva al menos un compás. */
export function removeMeasure(score: Score, oneBased: number): Score {
  assertMeasure(score, oneBased);
  if (score.measures.length === 1) throw new Error("La partitura necesita al menos un compás.");
  const next = structuredClone(score);
  const start = measureStart(score, oneBased), length = measureTicks(score.measures[oneBased - 1]), end = start + length;
  // Un cambio de armadura, métrica o clave que empezaba aquí pasa al compás siguiente.
  const removed = next.measures[oneBased - 1], following = next.measures[oneBased];
  if (following) {
    if (removed.keyChange) following.keyChange = true;
    if (removed.timeChange) following.timeChange = true;
    if (removed.clefs) following.clefs = { ...removed.clefs, ...following.clefs };
  }
  next.measures.splice(oneBased - 1, 1);
  for (const voice of next.voices) {
    voice.events = voice.events.filter(event => event.start < start || event.start >= end);
    for (const event of voice.events) {
      if (event.start >= end) event.start -= length;
      // Una ligadura que entraba al compás quitado ya no tiene a dónde llegar.
      else if (event.tie && event.start + durationTicks(event) === start) event.tie = false;
    }
  }
  next.annotations = (next.annotations ?? []).filter(a => a.measure !== oneBased).map(a => a.measure > oneBased ? { ...a, measure: a.measure - 1 } : a);
  const last = next.measures.length;
  for (const scene of next.scenes) {
    if (scene.startMeasure > oneBased) scene.startMeasure -= 1;
    if (scene.endMeasure >= oneBased) scene.endMeasure -= 1;
    scene.endMeasure = Math.min(Math.max(scene.endMeasure, 1), last);
    scene.startMeasure = Math.min(Math.max(scene.startMeasure, 1), scene.endMeasure);
  }
  return validateScore(next);
}

/** Copia música y anotaciones de un compás a otro de la misma duración, reemplazando lo que hubiera. */
export function duplicateMeasure(score: Score, from: number, to: number): Score {
  assertMeasure(score, from); assertMeasure(score, to);
  if (from === to) return validateScore(structuredClone(score));
  const length = measureTicks(score.measures[from - 1]);
  if (measureTicks(score.measures[to - 1]) !== length) throw new Error("Los dos compases deben durar lo mismo.");
  const next = structuredClone(score);
  const source = measureStart(score, from), target = measureStart(score, to);
  for (const voice of next.voices) {
    const copies = voice.events.filter(e => e.start >= source && e.start < source + length).map(e => ({ ...e, id: newId(), start: target + e.start - source, pitches: [...e.pitches] }));
    voice.events = [...voice.events.filter(e => e.start < target || e.start >= target + length), ...copies].sort((a, b) => a.start - b.start);
  }
  next.annotations = [...(next.annotations ?? []).filter(a => a.measure !== to),
    ...(score.annotations ?? []).filter(a => a.measure === from).map(a => ({ ...a, id: newId(), measure: to }))];
  return validateScore(next);
}
