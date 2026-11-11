// ============================================================================
// Progresión de AP Super (dominio puro, sin DOM ni three.js).
// CONTRATO fijado por Claude: no cambiar nombres ni firmas exportadas.
// Port de apsuperapp/domain (Kotlin); la referencia está en ../../referencia/kotlin.
// Solo imports relativos (lo corre también el vitest de la raíz).
// ============================================================================
import levelsData from "./levels.json";

export type SequenceId = "Hombre" | "Mujer";
export const SEQUENCES: SequenceId[] = ["Hombre", "Mujer"];

/** Los seis timbres del método (carpetas de samples en el CDN). */
export const TIMBRES = ["Piano", "Cello", "Corno", "Coro", "Fagot", "Guitarra"] as const;
export type Timbre = (typeof TIMBRES)[number];

export type Accidentals = "sharps" | "flats";

/** Una altura concreta. midi: E2 = 40 … E5 = 76. */
export interface Pitch {
  midi: number;
  pitchClass: number; // 0 = C … 11 = B
  octave: number;     // C4 = midi 60 → 4
}

export interface Level {
  number: number;            // 1…147
  world: number;             // 1…5 (ver worldOfLevel)
  pitches: Pitch[];          // en orden ascendente
  timbres: Timbre[];
  requiredStreak: number;    // 20
  comment: string;           // español
  commentEnglish: string;
  /** Botones de respuesta: clases de altura sin repetir, en orden cromático desde C. */
  answerClasses: number[];
}

export interface Question {
  pitch: Pitch;
  timbre: Timbre;
}

/** semitones 0…6 por el camino corto; direction +1 arriba, -1 abajo, 0 en acierto y tritono. */
export interface ErrorDistance {
  semitones: number;
  direction: number;
}

export interface SequenceProgress {
  completed: number[];                 // números de nivel completados
  streaks: Record<number, number>;     // racha actual por nivel
  bestStreaks: Record<number, number>; // mejor racha por nivel
}

/** Rango de niveles de cada mundo: Pradera 1–36, Océano 37–69, Cosmos 70–103, Pantano 104–138, Nubes 139–147. */
export const WORLD_RANGES: Record<number, [number, number]> = {
  1: [1, 36],
  2: [37, 69],
  3: [70, 103],
  4: [104, 138],
  5: [139, 147],
};

const PITCH_PATTERN = /^([A-Ga-g])([#b♯♭]?)(-?\d)$/;
const NATURALS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
const REPEAT_PROBABILITY = 0.1;
const STORAGE_KEY_PREFIX = "walking-ap:progress:v1:";

interface RawLevel {
  number: number;
  pitches: string[];
  instruments: string[];
  requiredStreak: number;
  comment: string;
  commentEnglish?: string;
}

const levelsCache: Partial<Record<SequenceId, Level[]>> = {};

function floorMod(a: number, b: number): number {
  return ((a % b) + b) % b;
}

function parseTimbre(name: string): Timbre | null {
  const key = name.trim().toLowerCase();
  return TIMBRES.find((t) => t.toLowerCase() === key) ?? null;
}

function progressKey(sequence: SequenceId): string {
  return `${STORAGE_KEY_PREFIX}${sequence}`;
}

function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([key, val]) =>
      key.trim() !== "" &&
      Number.isFinite(Number(key)) &&
      typeof val === "number" &&
      Number.isFinite(val),
  );
}

/** "F#3", "Gb3", "eb4" → Pitch; null si no es válida. */
export function parsePitch(text: string): Pitch | null {
  const match = PITCH_PATTERN.exec(text.trim());
  if (!match) return null;
  const [, letter, accidental, octaveText] = match;
  const base = NATURALS[letter.toUpperCase()];
  const shift =
    accidental === "#" || accidental === "♯"
      ? 1
      : accidental === "b" || accidental === "♭"
        ? -1
        : 0;
  const octave = parseInt(octaveText, 10);
  return pitchFromMidi((octave + 1) * 12 + base + shift);
}

export function pitchFromMidi(midi: number): Pitch {
  return {
    midi,
    pitchClass: floorMod(midi, 12),
    octave: Math.floor(midi / 12) - 1,
  };
}

/** Nombre sin octava: "F#" o "Gb". */
export function pitchClassName(pitchClass: number, accidentals: Accidentals = "sharps"): string {
  const index = floorMod(pitchClass, 12);
  return accidentals === "sharps" ? SHARP_NAMES[index] : FLAT_NAMES[index];
}

/** Nombre con octava: "F#3" o "Gb3". */
export function pitchName(pitch: Pitch, accidentals: Accidentals = "sharps"): string {
  return `${pitchClassName(pitch.pitchClass, accidentals)}${pitch.octave}`;
}

/** Nombre del archivo de sample, siempre con sostenidos y sin extensión: "F#3". */
export function sampleName(pitch: Pitch): string {
  return pitchName(pitch, "sharps");
}

export function worldOfLevel(levelNumber: number): number {
  for (const [worldStr, [min, max]] of Object.entries(WORLD_RANGES)) {
    if (levelNumber >= min && levelNumber <= max) {
      return Number(worldStr);
    }
  }
  return levelNumber < 1 ? 1 : 5;
}

/** Los 147 niveles de la secuencia, leídos de levels.json, en orden. */
export function getLevels(sequence: SequenceId): Level[] {
  const cached = levelsCache[sequence];
  if (cached) return cached;

  const rawList: RawLevel[] = (levelsData as Record<SequenceId, RawLevel[]>)[sequence] ?? [];
  const parsed: Level[] = rawList.map((raw) => {
    const pitches = raw.pitches
      .map((p) => parsePitch(p))
      .filter((p): p is Pitch => p !== null)
      .sort((a, b) => a.midi - b.midi);

    const timbres = Array.from(
      new Set(
        raw.instruments
          .map((inst) => parseTimbre(inst))
          .filter((t): t is Timbre => t !== null),
      ),
    );

    const answerClasses = Array.from(new Set(pitches.map((p) => p.pitchClass))).sort(
      (a, b) => a - b,
    );

    return {
      number: raw.number,
      world: worldOfLevel(raw.number),
      pitches,
      timbres,
      requiredStreak: raw.requiredStreak,
      comment: raw.comment,
      commentEnglish: raw.commentEnglish ?? "",
      answerClasses,
    };
  });

  parsed.sort((a, b) => a.number - b.number);
  levelsCache[sequence] = parsed;
  return parsed;
}

export function getLevel(sequence: SequenceId, levelNumber: number): Level | undefined {
  return getLevels(sequence).find((level) => level.number === levelNumber);
}

export function levelsOfWorld(sequence: SequenceId, world: number): Level[] {
  return getLevels(sequence).filter((level) => level.world === world);
}

export function errorDistance(answeredClass: number, correctClass: number): ErrorDistance {
  const up = floorMod(answeredClass - correctClass, 12);
  if (up === 0) return { semitones: 0, direction: 0 };
  if (up === 6) return { semitones: 6, direction: 0 };
  if (up < 6) return { semitones: up, direction: 1 };
  return { semitones: 12 - up, direction: -1 };
}

/**
 * Elige nota y timbre de cada pregunta (port de QuestionGenerator.kt).
 * Nota: repite la anterior con probabilidad 1/10. Timbre: bolsa barajada sin repetir seguido.
 * `random` devuelve [0, 1); por defecto Math.random (se inyecta en las pruebas).
 */
export class QuestionGenerator {
  private lastPitch: Pitch | null = null;
  private lastTimbre: Timbre | null = null;
  private bag: Timbre[] = [];

  constructor(private random: () => number = Math.random) {}

  next(level: Level): Question {
    return {
      pitch: this.nextPitch(level.pitches),
      timbre: this.nextTimbre(level.timbres),
    };
  }

  reset(): void {
    this.lastPitch = null;
    this.lastTimbre = null;
    this.bag = [];
  }

  private pickRandom<T>(items: readonly T[]): T {
    const index = Math.floor(this.random() * items.length);
    return items[Math.min(index, items.length - 1)];
  }

  private nextPitch(pitches: Pitch[]): Pitch {
    const previous = this.lastPitch;
    const previousInLevel =
      previous !== null ? pitches.find((p) => p.midi === previous.midi) ?? null : null;
    const others =
      previousInLevel !== null ? pitches.filter((p) => p.midi !== previousInLevel.midi) : pitches;

    let choice: Pitch;
    if (previousInLevel === null || others.length === 0) {
      choice = this.pickRandom(pitches);
    } else if (this.random() < REPEAT_PROBABILITY) {
      choice = previousInLevel;
    } else {
      choice = this.pickRandom(others);
    }
    this.lastPitch = choice;
    return choice;
  }

  private nextTimbre(allowed: Timbre[]): Timbre {
    const pool = allowed.length > 0 ? allowed : [...TIMBRES];
    if (this.bag.length === 0 || this.bag.some((t) => !pool.includes(t))) {
      this.bag = [];
      const shuffled = Array.from(new Set(pool));
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        const tmp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = tmp;
      }
      if (shuffled.length > 1 && shuffled[0] === this.lastTimbre) {
        shuffled.push(shuffled.shift()!);
      }
      this.bag.push(...shuffled);
    }
    const next = this.bag.shift()!;
    this.lastTimbre = next;
    return next;
  }
}

export function emptyProgress(): SequenceProgress {
  return { completed: [], streaks: {}, bestStreaks: {} };
}

/**
 * Aplica una respuesta (port de SequenceProgress.record). No muta `progress`.
 * Un error regresa la racha a 0. `justCompleted` es true solo la primera vez que se llega a la meta.
 */
export function recordAnswer(
  progress: SequenceProgress,
  level: Level,
  correct: boolean,
): { progress: SequenceProgress; justCompleted: boolean } {
  const prevStreak = progress.streaks[level.number] ?? 0;
  const prevBest = progress.bestStreaks[level.number] ?? 0;
  const newStreak = correct ? prevStreak + 1 : 0;
  const alreadyCompleted = progress.completed.includes(level.number);
  const justCompleted = correct && newStreak >= level.requiredStreak && !alreadyCompleted;

  return {
    progress: {
      completed: justCompleted ? [...progress.completed, level.number] : [...progress.completed],
      streaks: { ...progress.streaks, [level.number]: newStreak },
      bestStreaks: { ...progress.bestStreaks, [level.number]: Math.max(prevBest, newStreak) },
    },
    justCompleted,
  };
}

/** Nivel donde conviene continuar: el primero sin completar; si todos están completos, el último. */
export function currentLevel(progress: SequenceProgress, levels: Level[]): Level {
  const completedSet = new Set(progress.completed);
  return levels.find((level) => !completedSet.has(level.number)) ?? levels[levels.length - 1];
}

/** Cuántos niveles de ese mundo están completados. */
export function completedInWorld(progress: SequenceProgress, world: number): number {
  const range = WORLD_RANGES[world];
  if (!range) return 0;
  const [min, max] = range;
  let count = 0;
  for (const levelNumber of new Set(progress.completed)) {
    if (levelNumber >= min && levelNumber <= max) {
      count++;
    }
  }
  return count;
}

/** Interfaz mínima de almacenamiento (localStorage la cumple); permite probar sin navegador. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Clave: `walking-ap:progress:v1:<sequence>`. Datos corruptos o ausentes → emptyProgress(). Nunca lanza. */
export function loadProgress(store: KeyValueStore, sequence: SequenceId): SequenceProgress {
  try {
    const raw = store.getItem(progressKey(sequence));
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return emptyProgress();
    }
    const obj = parsed as Record<string, unknown>;
    if (
      !isNumberArray(obj.completed) ||
      !isNumberRecord(obj.streaks) ||
      !isNumberRecord(obj.bestStreaks)
    ) {
      return emptyProgress();
    }
    const streaks: Record<number, number> = {};
    for (const [k, v] of Object.entries(obj.streaks)) {
      streaks[Number(k)] = v;
    }
    const bestStreaks: Record<number, number> = {};
    for (const [k, v] of Object.entries(obj.bestStreaks)) {
      bestStreaks[Number(k)] = v;
    }
    return {
      completed: [...obj.completed],
      streaks,
      bestStreaks,
    };
  } catch {
    return emptyProgress();
  }
}

/** Nunca lanza (modo privado, cuota llena). */
export function saveProgress(store: KeyValueStore, sequence: SequenceId, progress: SequenceProgress): void {
  try {
    store.setItem(progressKey(sequence), JSON.stringify(progress));
  } catch {
    // Ignora fallos de almacenamiento (cuota llena o modo privado).
  }
}
