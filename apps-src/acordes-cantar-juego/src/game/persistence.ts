// Persistencia en localStorage (PLAN §7.7) — guardar tras CADA cuerda resuelta
// (cerrar la pestaña a media partida no debe perder el Atlas). Lógica pura.

import { STORAGE_KEYS, type GameMode } from "@/config";

export interface Progress {
  unlockedLayer: number;
  expeditionBest?: number;
  timeAttackBest?: number;
  survivalBest?: number;
}

export interface AtlasEntry {
  attempts: number;
  completed: number;
  bestStreak: number;
  bestAvgCents: number | null; // media de |cents| de la MEJOR pasada — solo mejora
  firstCompletedISO?: string;
}

export type Atlas = Record<string, AtlasEntry>;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin almacenamiento: seguir sin persistir
  }
}

export function loadProgress(): Progress {
  return read<Progress>(STORAGE_KEYS.progress, { unlockedLayer: 1 });
}

export function saveUnlockedLayer(layer: number): void {
  const p = loadProgress();
  if (layer > p.unlockedLayer) {
    p.unlockedLayer = Math.min(5, layer);
    write(STORAGE_KEYS.progress, p);
  }
}

const BEST_KEY: Record<GameMode, keyof Progress> = {
  EXPEDITION: "expeditionBest",
  TIME_ATTACK: "timeAttackBest",
  SURVIVAL: "survivalBest",
};

export function saveBestScore(mode: GameMode, score: number): void {
  const p = loadProgress();
  const key = BEST_KEY[mode];
  if (score > ((p[key] as number | undefined) ?? 0)) {
    (p[key] as number) = score;
    write(STORAGE_KEYS.progress, p);
  }
}

export function loadAtlas(): Atlas {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.atlas);
    return raw ? (JSON.parse(raw) as Atlas) : {};
  } catch {
    return {};
  }
}

function entryOf(atlas: Atlas, typeId: string): AtlasEntry {
  return (atlas[typeId] ??= {
    attempts: 0,
    completed: 0,
    bestStreak: 0,
    bestAvgCents: null,
  });
}

/** Cuerda perdida (expirada): registra el intento. */
export function recordAttempt(typeId: string): void {
  const atlas = loadAtlas();
  entryOf(atlas, typeId).attempts++;
  write(STORAGE_KEYS.atlas, atlas);
}

export interface CompletionResult {
  firstTime: boolean;
  improvedCents: boolean;
}

/** Cuerda completada: intento + completada + racha + precisión (solo mejora). */
export function recordCompleted(
  typeId: string,
  streak: number,
  avgCents: number,
): CompletionResult {
  const atlas = loadAtlas();
  const e = entryOf(atlas, typeId);
  e.attempts++;
  e.completed++;
  const firstTime = !e.firstCompletedISO;
  if (firstTime) e.firstCompletedISO = new Date().toISOString();
  e.bestStreak = Math.max(e.bestStreak, streak);
  const improvedCents = e.bestAvgCents === null || avgCents < e.bestAvgCents;
  if (improvedCents) e.bestAvgCents = avgCents; // NUNCA empeora (§7.6)
  write(STORAGE_KEYS.atlas, atlas);
  return { firstTime, improvedCents };
}
