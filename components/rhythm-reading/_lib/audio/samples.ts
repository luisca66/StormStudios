/**
 * samples.ts — Carga de buffers de audio desde Cloudflare.
 * Patrón: fetch → arrayBuffer → decodeAudioData → cache en memoria.
 * Los buffers NO se copian al repo; siempre se cargan desde URL.
 *
 * TODO: Luis debe reemplazar las URLs con las rutas reales en su bucket.
 */

import { getAudioContext } from './engine';

// ── URLs de Cloudflare (llenar con las rutas reales) ─────────────────────────

const CLOUDFLARE_BASE = 'https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev';

/** URL del sonido de acierto. */
export const SAMPLE_ACIERTO_URL = `${CLOUDFLARE_BASE}/acierto.mp3`;

/** URL del sonido de error. */
export const SAMPLE_ERROR_URL = `${CLOUDFLARE_BASE}/error.mp3`;

// ── Cache en memoria ──────────────────────────────────────────────────────────

const _cache = new Map<string, AudioBuffer>();

// ── Carga ─────────────────────────────────────────────────────────────────────

/**
 * Carga un buffer desde `url`.
 * Usa caché en memoria: la segunda llamada con la misma URL es instantánea.
 * Retorna `null` si la carga falla (no lanza excepción).
 */
export async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  if (_cache.has(url)) return _cache.get(url)!;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} para ${url}`);
    const arrayBuffer = await response.arrayBuffer();
    const ctx = getAudioContext();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    _cache.set(url, audioBuffer);
    return audioBuffer;
  } catch (err) {
    console.warn('[samples] No se pudo cargar:', url, err);
    return null;
  }
}

/**
 * Pre-carga los samples de feedback (acierto y error) al iniciar la app.
 * Llamar desde un handler de usuario para que el AudioContext esté desbloqueado.
 */
export async function preloadFeedbackSamples(): Promise<void> {
  await Promise.all([
    loadBuffer(SAMPLE_ACIERTO_URL),
    loadBuffer(SAMPLE_ERROR_URL),
  ]);
}
