/** config.ts — Constantes de Desglose (samples, rango, parámetros de juego). */

/** Bucket público R2 con los samples (compartido con "Cantar Acordes"). */
export const R2_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

export const FEEDBACK_OK_URL = `${R2_BASE}/acierto.mp3`;
export const FEEDBACK_ERROR_URL = `${R2_BASE}/error.mp3`;

/** Timbres con samples reales en R2 (carpeta = nombre). */
export const TIMBRES = ["Piano", "Cello", "Corno", "Fagot", "Coro"] as const;
export type Timbre = (typeof TIMBRES)[number];

/** "Mixto" reparte un timbre aleatorio por cada nota del acorde. */
export const INSTRUMENT_OPTIONS = [...TIMBRES, "Mixto"] as const;
export type Instrument = (typeof INSTRUMENT_OPTIONS)[number];

/** Rango de samples disponible: C2 (MIDI 36) a C7 (MIDI 96). */
export const RANGE_LOW = "C2";
export const RANGE_HIGH = "C7";

/** Defaults de sesión. */
export const DEFAULT_START = "C3";
export const DEFAULT_END = "C6";
export const DEFAULT_INSTRUMENT: Instrument = "Piano";
export const DEFAULT_CHORD_SIZE = 2;
export const DEFAULT_VOLUME = 0.72;

/** Tamaños de acorde seleccionables. */
export const CHORD_SIZES = [2, 3, 4, 5, 6] as const;

/** Ventana de captura del micrófono por nota (ms). */
export const LISTEN_WINDOW_MS = 2500;

/** Tolerancia de afinación en semitonos (igual que la app Android). */
export const TUNING_TOLERANCE = 0.25;

/** Construye la URL del sample (codifica `#` → `%23`). */
export function sampleUrl(timbre: Timbre, note: string): string {
  return `${R2_BASE}/${timbre}/${encodeURIComponent(note)}.mp3`;
}
