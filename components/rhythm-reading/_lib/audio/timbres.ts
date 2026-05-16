/**
 * timbres.ts — Kit de percusión para feedback de input del alumno.
 *
 * Samples alojados en Cloudflare R2 (mismo bucket que storm-bateria-v9.5.html).
 * Carga bajo demanda con caché en memoria vía loadBuffer de samples.ts.
 * Disparo con BufferSource → masterGain → destination (igual que feedback.ts).
 */

import { getAudioContext, getMasterGain } from './engine';
import { loadBuffer } from './samples';

// ── URLs del kit ──────────────────────────────────────────────────────────────

const KIT_BASE = 'https://pub-d7ddf9faaf4e4e83b747c800e18466a7.r2.dev';

export const TIMBRES = [
  { id: 'hh',    label: 'Hi-Hat',    url: `${KIT_BASE}/hh.wav`    },
  { id: 'sd',    label: 'Tarola',    url: `${KIT_BASE}/sd.wav`    },
  { id: 'bd',    label: 'Bombo',     url: `${KIT_BASE}/bd.wav`    },
  { id: 'hho',   label: 'HH Abierto',url: `${KIT_BASE}/hho.wav`   },
  { id: 't1',    label: 'Tom 1',     url: `${KIT_BASE}/t1.wav`    },
  { id: 'ft',    label: 'Tom Piso',  url: `${KIT_BASE}/ft.wav`    },
  { id: 'ride',  label: 'Ride',      url: `${KIT_BASE}/ride.wav`  },
  { id: 'crash', label: 'Crash',     url: `${KIT_BASE}/crash.wav` },
] as const;

export type TimbreId = typeof TIMBRES[number]['id'];
export const DEFAULT_TIMBRE_ID: TimbreId = 'hh';

// ── API ───────────────────────────────────────────────────────────────────────

/**
 * Pre-carga el sample de un timbre en el caché de Web Audio.
 * Llamar al seleccionar un timbre para que el primer disparo sea instantáneo.
 */
export async function preloadTimbre(id: TimbreId): Promise<void> {
  const entry = TIMBRES.find((t) => t.id === id);
  if (entry) await loadBuffer(entry.url);
}

/**
 * Pre-carga TODOS los timbres en paralelo.
 * Llamar justo después de initAudio() (primera interacción del usuario).
 * No bloquea — fire-and-forget. Los fetches corren en background mientras
 * el alumno ve la cuenta regresiva, así que para cuando empieza a tapear
 * todos los samples ya están en caché.
 */
export function preloadAllTimbres(): void {
  for (const t of TIMBRES) {
    loadBuffer(t.url); // sin await — fire and forget
  }
}

/**
 * Dispara el sample del timbre indicado.
 * Si el buffer no está cargado aún, lo carga y luego dispara.
 * Falla silenciosamente si la carga falla.
 *
 * @param id   Identificador del timbre.
 * @param time AudioContext.currentTime de disparo (por defecto: ahora).
 */
export async function playTimbre(id: TimbreId, time?: number): Promise<void> {
  const entry = TIMBRES.find((t) => t.id === id);
  if (!entry) return;

  const buffer = await loadBuffer(entry.url);
  if (!buffer) return;

  const ctx = getAudioContext();
  const master = getMasterGain();
  const t = time ?? ctx.currentTime;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(master);
  source.start(t);
}
