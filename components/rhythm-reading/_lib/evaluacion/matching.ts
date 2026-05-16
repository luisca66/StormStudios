/**
 * matching.ts — Comparación de onsets recibidos vs. esperados.
 *
 * El alumno toca onsets capturados con performance.now().
 * Los beats esperados se calculan a partir del AudioContext.currentTime
 * convertido a la misma base que performance.now().
 *
 * Corrección de latencia:
 *   El audio se reproduce `outputLatencyMs` ms después de que el motor lo agenda.
 *   El alumno toca en respuesta a lo que escucha, no a lo que se agenda.
 *   Por lo tanto restamos outputLatencyMs a los tiempos esperados antes de comparar,
 *   para que la ventana esté centrada en el momento en que el alumno oyó el beat.
 *
 * Algoritmo greedy (O(n·m)):
 *   Para cada beat esperado, buscamos el onset recibido más cercano dentro de la ventana.
 *   Cada onset puede "ganar" un solo beat (no se reutiliza).
 */

import type { PatronRitmico, Duracion } from '../generador/tipos';
import { esSilencio } from '../generador/tipos';

/** Un onset recibido del alumno (ms, performance.now()) */
export type OnsetMs = number;

/** Resultado de evaluar un beat individual */
export interface BeatResult {
  /** Tiempo esperado del beat (ms, ajustado por latencia) */
  expectedMs: number;
  /** Onset del alumno que ganó este beat, o null si nadie lo tocó a tiempo */
  matchedOnsetMs: number | null;
  /** Diferencia en ms (positivo = tarde, negativo = temprano). null si no hubo match */
  errorMs: number | null;
  /** true si el beat fue tocado dentro de la ventana */
  acierto: boolean;
}

/** Resultado global de la evaluación de un patrón */
export interface MatchResult {
  beats: BeatResult[];
  totalBeats: number;
  aciertos: number;
  /** Porcentaje 0-100 */
  score: number;
}

// ── Conversión de patrón a tiempos esperados ─────────────────────────────────

const DURACION_EN_BEATS: Record<Duracion, number> = {
  w: 4,   wr: 4,
  h: 2,   hr: 2,
  hd: 3,  hdr: 3,
  q: 1,   qr: 1,
  qd: 1.5, qdr: 1.5,
  '8': 0.5,  '8r': 0.5,
  '8d': 0.75, '8dr': 0.75,
  '16': 0.25, '16r': 0.25,
};

/**
 * Convierte un PatronRitmico a un array de tiempos esperados en ms.
 *
 * @param patron          El patrón rítmico a convertir.
 * @param firstBeatPerfMs Tiempo en ms (performance.now()) del primer beat del patrón.
 * @param bpm             Tempo en beats por minuto.
 * @returns               Array de tiempos en ms (performance.now()), uno por nota.
 */
export function patronToExpectedMs(
  patron: PatronRitmico,
  firstBeatPerfMs: number,
  bpm: number,
): number[] {
  const beatMs = (60 / bpm) * 1000;
  const expected: number[] = [];
  let cursor = firstBeatPerfMs;

  for (const compas of patron.compases) {
    for (const dur of compas) {
      // Los silencios avanzan el cursor pero NO generan onset esperado.
      // El alumno no toca en los silencios.
      if (!esSilencio(dur)) {
        expected.push(cursor);
      }
      cursor += DURACION_EN_BEATS[dur] * beatMs;
    }
  }

  return expected;
}

// ── Matching ──────────────────────────────────────────────────────────────────

/**
 * Compara los onsets recibidos con los tiempos esperados del patrón.
 *
 * @param expectedMs      Tiempos esperados en ms (performance.now(), SIN ajustar por latencia).
 * @param receivedMs      Onsets del alumno en ms (performance.now()).
 * @param ventanaMs       Ventana de aceptación en ms (calculada con calcularVentana).
 * @param outputLatencyMs Latencia de salida de audio en ms (AudioContext.outputLatency × 1000).
 *                        Se resta a expectedMs para centrar la ventana en lo que el alumno oyó.
 * @returns               MatchResult con detalles de cada beat.
 */
export function matchOnsets(
  expectedMs: number[],
  receivedMs: OnsetMs[],
  ventanaMs: number,
  outputLatencyMs: number,
): MatchResult {
  // Ajustamos los esperados: el alumno oye el beat con outputLatencyMs de retraso,
  // así que la ventana se centra en expectedMs + outputLatencyMs.
  const adjusted = expectedMs.map((t) => t + outputLatencyMs);

  // Copia mutable de received para marcar onsets ya usados
  const available = [...receivedMs];

  const beats: BeatResult[] = adjusted.map((exp) => {
    let bestIdx = -1;
    let bestDiff = Infinity;

    for (let i = 0; i < available.length; i++) {
      const diff = available[i] - exp; // positivo = tarde
      const absDiff = Math.abs(diff);
      if (absDiff <= ventanaMs && absDiff < bestDiff) {
        bestDiff = absDiff;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) {
      return { expectedMs: exp, matchedOnsetMs: null, errorMs: null, acierto: false };
    }

    const matchedOnsetMs = available[bestIdx];
    const errorMs = matchedOnsetMs - exp;
    // Consumir el onset para que no pueda ganar otro beat
    available.splice(bestIdx, 1);

    return { expectedMs: exp, matchedOnsetMs, errorMs, acierto: true };
  });

  const aciertos = beats.filter((b) => b.acierto).length;
  const totalBeats = beats.length;

  return {
    beats,
    totalBeats,
    aciertos,
    score: totalBeats > 0 ? Math.round((aciertos / totalBeats) * 100) : 0,
  };
}
