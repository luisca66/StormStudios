/**
 * music.ts — Núcleo musical puro de Desglose (sin DOM, sin audio).
 *
 * Portado de la app Android (MainActivity.kt). Es la ÚNICA fuente de verdad
 * para el cálculo de notas, generación de acordes y evaluación de afinación.
 * La UI Vite (apps-src/desglose) y los tests (music.test.ts) consumen este módulo.
 *
 * Convención de notas: nombres con sostenidos ("C#4"), octava científica, igual
 * que los nombres de archivo de los samples en R2 ({Timbre}/{Nota}.mp3).
 */

/** Nombres de las 12 clases de altura, solo sostenidos (coincide con los samples). */
export const SHARP_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

const LETTER_SEMITONES: Record<string, number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/** Módulo positivo (JS `%` puede dar negativo). */
function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Convierte un nombre de nota ("C4", "F#3", "Bb2") a su número MIDI.
 * Acepta `#`/`♯` y `b`/`♭` como alteraciones. C4 = MIDI 60.
 */
export function noteToMidi(note: string): number {
  if (!note) return 0;
  const letter = note[0].toUpperCase();
  let accidental = "";
  let octaveStr = "";
  for (const ch of note.slice(1)) {
    if (ch >= "0" && ch <= "9") octaveStr += ch;
    else accidental += ch;
  }
  const octave = octaveStr === "" ? 4 : parseInt(octaveStr, 10);
  let offset = LETTER_SEMITONES[letter] ?? 0;
  for (const acc of accidental) {
    if (acc === "#" || acc === "♯") offset += 1;
    if (acc === "b" || acc === "♭") offset -= 1;
  }
  return (octave + 1) * 12 + offset;
}

/** Convierte un número MIDI a nombre de nota con sostenidos ("C#4"). */
export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[mod(midi, 12)]}${octave}`;
}

/** Lista cromática inclusiva de `start` a `end` (ambos nombres de nota). */
export function generateChromaticNotes(start: string, end: string): string[] {
  const startMidi = noteToMidi(start);
  const endMidi = noteToMidi(end);
  const notes: string[] = [];
  for (let midi = startMidi; midi <= endMidi; midi++) {
    notes.push(midiToNote(midi));
  }
  return notes;
}

/**
 * Sub-rango de `allNotes` entre `startNote` y `endNote` (inclusive).
 * Si el inicio está por encima del fin, devuelve el rango invertido.
 */
export function filterChromaticRange(
  allNotes: string[],
  startNote: string,
  endNote: string,
): string[] {
  const startIndex = Math.max(allNotes.indexOf(startNote), 0);
  const endIndex = Math.max(allNotes.indexOf(endNote), 0);
  if (startIndex <= endIndex) {
    return allNotes.slice(startIndex, endIndex + 1);
  }
  return allNotes.slice(endIndex, startIndex + 1).reverse();
}

/**
 * Elige `numberOfNotes` notas distintas al azar del rango disponible y las
 * devuelve ordenadas de grave a agudo. Vacío si no hay suficientes notas.
 * `rng` es inyectable para tests deterministas.
 */
export function generateRandomChord(
  availableNotes: string[],
  numberOfNotes: number,
  rng: () => number = Math.random,
): string[] {
  if (availableNotes.length < numberOfNotes) return [];
  const pool = [...availableNotes];
  // Fisher–Yates
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, numberOfNotes).sort((a, b) => noteToMidi(a) - noteToMidi(b));
}

/** Frecuencia (Hz) → MIDI continuo (con decimales). A4 = 440 Hz = MIDI 69. */
export function frequencyToPreciseMidi(frequency: number): number {
  if (frequency <= 0) return 0;
  return 69 + 12 * Math.log2(frequency / 440);
}

export type GradeReason = "ok" | "wrong-pitch" | "no-clear" | "silence";

export interface Grade {
  /** `true` si la clase de altura coincide y la afinación está dentro de tolerancia. */
  correct: boolean;
  reason: GradeReason;
  /** MIDI entero detectado (clase de altura comparada con `% 12`). */
  detectedMidi?: number;
  /** Desviación de afinación en semitonos respecto al MIDI entero más cercano. */
  deviation?: number;
}

/**
 * Evalúa un intento de canto contra la nota esperada.
 *
 * Replica la lógica Android: agrupa las frecuencias detectadas por su MIDI
 * redondeado, toma el grupo más frecuente, promedia, y acepta si la CLASE de
 * altura (octava-agnóstica, `% 12`) coincide y la desviación de afinación es
 * menor que `tolerance` (0.25 semitonos por defecto).
 */
export function gradeAttempt(
  detectedFrequencies: number[],
  expectedNote: string,
  tolerance = 0.25,
): Grade {
  if (detectedFrequencies.length === 0) {
    return { correct: false, reason: "silence" };
  }

  const midis = detectedFrequencies
    .map(frequencyToPreciseMidi)
    .filter((m) => m > 0);
  if (midis.length === 0) {
    return { correct: false, reason: "silence" };
  }

  const groups = new Map<number, number[]>();
  for (const midi of midis) {
    const key = Math.round(midi);
    const bucket = groups.get(key);
    if (bucket) bucket.push(midi);
    else groups.set(key, [midi]);
  }

  let bestKey: number | null = null;
  let bestSize = 0;
  for (const [key, bucket] of groups) {
    if (bucket.length > bestSize) {
      bestSize = bucket.length;
      bestKey = key;
    }
  }
  if (bestKey === null) {
    return { correct: false, reason: "no-clear" };
  }

  const avg = average(groups.get(bestKey)!);
  const detectedInt = Math.round(avg);
  const deviation = Math.abs(avg - detectedInt);
  const expectedClass = mod(noteToMidi(expectedNote), 12);
  const detectedClass = mod(detectedInt, 12);
  const correct = detectedClass === expectedClass && deviation < tolerance;

  return {
    correct,
    reason: correct ? "ok" : "wrong-pitch",
    detectedMidi: detectedInt,
    deviation,
  };
}
