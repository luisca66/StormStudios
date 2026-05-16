/**
 * metronomo.ts — Metrónomo de precisión con Web Audio API.
 *
 * Usa el patrón "lookahead scheduler":
 *   - setTimeout (LOOKAHEAD_MS) despierta al scheduler periódicamente.
 *   - El scheduler agenda clicks con AudioContext.currentTime, NO con setTimeout.
 *   - setTimeout aquí NO es timing crítico; el timing real lo hace el motor de audio.
 *
 * Patrón de click idéntico al de secuenciador.html:
 *   OscillatorNode square → GainNode (envelope) → masterGain → destination
 */

import { getAudioContext, getMasterGain } from './engine';
import type { CompasType } from '../generador/tipos';

// ── Constantes ────────────────────────────────────────────────────────────────

/** Con qué frecuencia despierta el scheduler (ms). No es el timing del audio. */
const LOOKAHEAD_MS = 25;

/** Cuántos segundos hacia adelante se agendan clicks en cada iteración. */
const SCHEDULE_AHEAD_SECS = 0.1;

/** Duración del click en segundos (de secuenciador.html). */
const CLICK_DUR_SECS = 0.055;

/** Frecuencia e intensidad por tipo de beat (de secuenciador.html). */
const CLICK_DOWNBEAT = { freq: 1000, vol: 0.3 };
const CLICK_SUBDIVISION = { freq: 800, vol: 0.15 };

// ── Estado interno del scheduler ─────────────────────────────────────────────

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let nextBeatTime = 0;   // AudioContext.currentTime del próximo click
let currentBeat = 0;    // índice del beat dentro del ciclo completo

let _bpm = 120;
let _numBeats = 4;       // beats por compás (numerador de la indicación)
let _totalBeats = 4;     // numBeats × numCompases (duración del loop)
let _onBeat: ((beatIndex: number, time: number) => void) | null = null;

// ── Helpers de audio ─────────────────────────────────────────────────────────

function playClick(isDownbeat: boolean, time: number): void {
  const ctx = getAudioContext();
  const master = getMasterGain();
  const { freq, vol } = isDownbeat ? CLICK_DOWNBEAT : CLICK_SUBDIVISION;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, time);

  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.005);
  gain.gain.linearRampToValueAtTime(0, time + CLICK_DUR_SECS);

  osc.connect(gain);
  gain.connect(master);

  osc.start(time);
  osc.stop(time + CLICK_DUR_SECS + 0.02);
}

// ── Scheduler loop ────────────────────────────────────────────────────────────

function scheduler(): void {
  const ctx = getAudioContext();
  const secondsPerBeat = 60 / _bpm;

  while (nextBeatTime < ctx.currentTime + SCHEDULE_AHEAD_SECS) {
    const beatInCompas = currentBeat % _numBeats;
    playClick(beatInCompas === 0, nextBeatTime);
    _onBeat?.(currentBeat, nextBeatTime);

    nextBeatTime += secondsPerBeat;
    currentBeat = (currentBeat + 1) % _totalBeats;
  }

  schedulerTimer = setTimeout(scheduler, LOOKAHEAD_MS);
}

// ── API pública ───────────────────────────────────────────────────────────────

export interface MetronomoConfig {
  bpm: number;
  compas: CompasType;
  /** Número de compases que dura el loop. */
  numCompases: number;
  /**
   * Callback que se llama en cada beat agendado.
   * `beatIndex` es 0-based dentro del ciclo completo.
   * `time` es el AudioContext.currentTime del beat (para sincronizar cursor).
   */
  onBeat?: (beatIndex: number, time: number) => void;
}

/** Inicia el metrónomo. Detiene cualquier instancia previa. */
export function startMetronomo(config: MetronomoConfig): void {
  stopMetronomo();

  _bpm = config.bpm;
  _numBeats = parseInt(config.compas.split('/')[0]);
  _totalBeats = _numBeats * config.numCompases;
  _onBeat = config.onBeat ?? null;

  const ctx = getAudioContext();
  // Pequeño offset inicial para que el primer click no se corte
  nextBeatTime = ctx.currentTime + 0.05;
  currentBeat = 0;

  scheduler();
}

/** Detiene el metrónomo. */
export function stopMetronomo(): void {
  if (schedulerTimer !== null) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}

/** Indica si el metrónomo está activo. */
export function isMetronomoRunning(): boolean {
  return schedulerTimer !== null;
}
