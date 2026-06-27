export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";
export const DEFAULT_VOLUME = 0.78;
export const LISTEN_WINDOW_MS = 3000;
export const TUNING_TOLERANCE = 0.25;
export const STATS_KEY = "storm.intervalos.cantados.stats.v1";

export const TIMBRES = ["Piano", "Corno", "Coro", "Fagot", "Cello"] as const;
export type Timbre = (typeof TIMBRES)[number];

export type Instrument = Timbre | "random";

export const INSTRUMENTS: Instrument[] = ["Piano", "Corno", "Coro", "Fagot", "Cello", "random"];

export function sampleUrl(timbre: Timbre, note: string): string {
  return `${AUDIO_BASE}/${timbre}/${encodeURIComponent(note.replace(/b/g, "♭"))}.mp3`;
}

export function feedbackUrl(ok: boolean): string {
  return `${AUDIO_BASE}/${ok ? "acierto" : "error"}.mp3`;
}
