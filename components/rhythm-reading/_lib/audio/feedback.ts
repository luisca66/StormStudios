/**
 * feedback.ts — Disparo de sonidos de acierto y error.
 * Usa los buffers pre-cargados por samples.ts.
 * Si el buffer no está listo, falla silenciosamente (sin lanzar excepción).
 */

import { getAudioContext, getMasterGain } from './engine';
import { loadBuffer, SAMPLE_ACIERTO_URL, SAMPLE_ERROR_URL } from './samples';

/**
 * Dispara un buffer de audio en el tiempo dado (por defecto: ahora).
 * Cadena: BufferSource → masterGain → destination
 */
function playBuffer(buffer: AudioBuffer, time?: number): void {
  const ctx = getAudioContext();
  const master = getMasterGain();
  const t = time ?? ctx.currentTime;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(master);
  source.start(t);
}

/** Reproduce el sonido de acierto. */
export async function playAcierto(time?: number): Promise<void> {
  const buffer = await loadBuffer(SAMPLE_ACIERTO_URL);
  if (buffer) playBuffer(buffer, time);
}

/** Reproduce el sonido de error. */
export async function playError(time?: number): Promise<void> {
  const buffer = await loadBuffer(SAMPLE_ERROR_URL);
  if (buffer) playBuffer(buffer, time);
}
