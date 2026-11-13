/**
 * voice-leading.ts — Movimientos melódicos y armónicos (Curso Medrano pp. 13–15).
 *
 * Núcleo reutilizable del Maestro Virtual para todo lo que enlace notas en el
 * tiempo: la Lección 7 lo usa sobre melodías sueltas y las lecciones de enlaces
 * y corales lo usarán sobre el cuarteto completo.
 *
 * MOVIMIENTOS MELÓDICOS (una voz):
 * 1. Intervalos permitidos: 2a m, 2a M, 3a m, 3a M, 4a J, 5a J, 6a m, 6a M, 8a J.
 *    Sin aumentados, sin 7as ni intervalos mayores que la 8a.
 * 2. Grado conjunto (2as), camino corto (3as), salto corto (4a J), saltos largos (5a J, 6as, 8a J).
 * 3. No se practica el salto de 8a con la sensible.
 * 4. Se permiten 5a, 4a y 7a disminuidas si a continuación la voz cambia de dirección.
 * 5. No dos saltos sucesivos en la misma dirección, salvo 4a y 5a (o 5a y 4a).
 * La nota repetida es opcional: prohibida en las melodías de la Lección 7, permitida en los enlaces.
 *
 * MOVIMIENTOS ARMÓNICOS (entre dos voces, de un acorde al siguiente):
 * 1. No 5as ni 8as paralelas o contrarias (el unísono cuenta como 8a).
 * 2. Se permiten 5as paralelas cuando una de las dos, o las dos, no son justas.
 * 3. Se permiten 5as contrarias en voces no extremas.
 * 4. No dos saltos simultáneos en la misma dirección, salvo que ambos sean de 4a justa.
 */
import { letterIndex, type Spelling } from './spelling';

/** Nota con altura absoluta y grafía (Do4 = MIDI 60). */
export type Pitch = { midi: number; spelling: Spelling };

export type IntervalQuality = 'P' | 'M' | 'm' | 'A' | 'd' | 'AA' | 'dd';

export type Interval = {
  /** Número de intervalo (1 = unísono, 8 = octava, 10 = décima). */
  number: number;
  /** Número reducido a la octava (1–7; la 8a y el unísono dan 1). */
  simple: number;
  quality: IntervalQuality;
  semitones: number;
  /** +1 sube, −1 baja, 0 repite (en intervalos melódicos). */
  direction: 1 | -1 | 0;
};

export type MelodicClass = 'repeat' | 'step' | 'short-path' | 'short-leap' | 'long-leap' | 'diminished' | 'forbidden';

const PERFECT_SIMPLE = new Set([1, 4, 5]);
const MAJOR_BASE: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };

const diatonicStep = (p: Pitch) => Math.floor((p.midi - p.spelling.alter) / 12) * 7 + letterIndex(p.spelling.letter);

/** Intervalo entre dos notas, por grafía. Para el melódico, `from` → `to`; para el armónico, grave → agudo. */
export function intervalBetween(from: Pitch, to: Pitch): Interval {
  const steps = diatonicStep(to) - diatonicStep(from);
  const direction = (Math.sign(to.midi - from.midi) || Math.sign(steps)) as 1 | -1 | 0;
  const number = Math.abs(steps) + 1;
  const semitones = Math.abs(to.midi - from.midi);
  const simple = ((number - 1) % 7) + 1;
  const diff = semitones - 12 * Math.floor((number - 1) / 7) - MAJOR_BASE[simple];
  let quality: IntervalQuality;
  if (PERFECT_SIMPLE.has(simple)) quality = diff === 0 ? 'P' : diff === -1 ? 'd' : diff === 1 ? 'A' : diff < 0 ? 'dd' : 'AA';
  else quality = diff === 0 ? 'M' : diff === -1 ? 'm' : diff === -2 ? 'd' : diff === 1 ? 'A' : diff < 0 ? 'dd' : 'AA';
  return { number, simple, quality, semitones, direction };
}

/** Clasificación de Medrano de un intervalo melódico. */
export function classifyMelodic(iv: Interval): MelodicClass {
  const { number: n, quality: q } = iv;
  if (n === 1) return q === 'P' ? 'repeat' : 'forbidden';
  if (n === 2 && (q === 'M' || q === 'm')) return 'step';
  if (n === 3 && (q === 'M' || q === 'm')) return 'short-path';
  if (n === 4 && q === 'P') return 'short-leap';
  if ((n === 5 && q === 'P') || (n === 6 && (q === 'M' || q === 'm')) || (n === 8 && q === 'P')) return 'long-leap';
  if (q === 'd' && (n === 4 || n === 5 || n === 7)) return 'diminished';
  return 'forbidden';
}

/** Salto: de la 4a en adelante (Medrano: salto corto = 4a J; saltos largos = 5a, 6as y 8a). */
export const isLeap = (iv: Interval) => iv.direction !== 0 && iv.number >= 4;

const QUALITY_NAMES: Record<'es' | 'en', Record<IntervalQuality, string>> = {
  es: { P: 'justa', M: 'mayor', m: 'menor', A: 'aumentada', d: 'disminuida', AA: 'doble aumentada', dd: 'doble disminuida' },
  en: { P: 'perfect', M: 'major', m: 'minor', A: 'augmented', d: 'diminished', AA: 'doubly augmented', dd: 'doubly diminished' },
};
const ES_NUMBER: Record<number, string> = { 1: 'unísono', 8: '8a' };

/** «3a menor», «4a aumentada», «unísono» / «minor 3rd», «augmented 4th», «unison». */
export function intervalName(iv: Interval, locale: 'es' | 'en'): string {
  if (locale === 'es') {
    if (iv.number === 1) return iv.quality === 'P' ? 'unísono' : `unísono ${QUALITY_NAMES.es[iv.quality]}`;
    return `${ES_NUMBER[iv.number] ?? `${iv.number}a`} ${QUALITY_NAMES.es[iv.quality]}`;
  }
  if (iv.number === 1) return iv.quality === 'P' ? 'unison' : `${QUALITY_NAMES.en[iv.quality]} unison`;
  const n = iv.number;
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${QUALITY_NAMES.en[iv.quality]} ${n === 8 ? 'octave' : n + suffix}`;
}

export const MELODIC_CLASS_NAMES: Record<MelodicClass, { es: string; en: string }> = {
  repeat: { es: 'nota repetida', en: 'repeated note' },
  step: { es: 'grado conjunto', en: 'step' },
  'short-path': { es: 'camino corto', en: 'short path' },
  'short-leap': { es: 'salto corto', en: 'short leap' },
  'long-leap': { es: 'salto largo', en: 'long leap' },
  diminished: { es: 'intervalo disminuido', en: 'diminished interval' },
  forbidden: { es: 'intervalo no permitido', en: 'interval not allowed' },
};

// ─── Movimientos melódicos ──────────────────────────────────────────────────

export type MelodicRule =
  | 'MELODIC_FORBIDDEN_INTERVAL'
  | 'MELODIC_REPEATED_NOTE'
  | 'MELODIC_LEADING_TONE_OCTAVE'
  | 'MELODIC_DIMINISHED_UNRESOLVED'
  | 'MELODIC_SUCCESSIVE_LEAPS';

/** `index` es el intervalo que rompe la regla: de la nota `index` a la `index + 1` (base 0). */
export type MelodicIssue = { rule: MelodicRule; index: number; interval: Interval; previous?: Interval };

export type MelodicOptions = {
  /** Clase de altura de la sensible de la tonalidad (regla 3). */
  leadingPc?: number;
  /** Nota repetida: false en las melodías de la Lección 7, true en enlaces y corales. */
  allowRepeat: boolean;
};

export function checkMelodicLine(line: Pitch[], options: MelodicOptions): MelodicIssue[] {
  const issues: MelodicIssue[] = [];
  const intervals = line.slice(1).map((p, i) => intervalBetween(line[i], p));
  intervals.forEach((iv, i) => {
    const kind = classifyMelodic(iv);
    if (kind === 'forbidden') issues.push({ rule: 'MELODIC_FORBIDDEN_INTERVAL', index: i, interval: iv });
    if (kind === 'repeat' && !options.allowRepeat) issues.push({ rule: 'MELODIC_REPEATED_NOTE', index: i, interval: iv });
    if (iv.number === 8 && iv.quality === 'P' && options.leadingPc !== undefined && ((line[i].midi % 12) + 12) % 12 === options.leadingPc) {
      issues.push({ rule: 'MELODIC_LEADING_TONE_OCTAVE', index: i, interval: iv });
    }
    if (kind === 'diminished') {
      const next = intervals[i + 1];
      if (!next || next.direction !== -iv.direction) issues.push({ rule: 'MELODIC_DIMINISHED_UNRESOLVED', index: i, interval: iv });
    }
    const prev = intervals[i - 1];
    // Un intervalo prohibido ya se reporta solo; no se suma como salto sucesivo.
    if (prev && kind !== 'forbidden' && classifyMelodic(prev) !== 'forbidden' && isLeap(prev) && isLeap(iv) && prev.direction === iv.direction) {
      const fourthFifth = (prev.number === 4 && iv.number === 5) || (prev.number === 5 && iv.number === 4);
      if (!fourthFifth) issues.push({ rule: 'MELODIC_SUCCESSIVE_LEAPS', index: i, interval: iv, previous: prev });
    }
  });
  return issues;
}

// ─── Movimientos armónicos ──────────────────────────────────────────────────

export type HarmonicRule =
  | 'HARMONIC_PARALLEL_OCTAVES'
  | 'HARMONIC_CONTRARY_OCTAVES'
  | 'HARMONIC_PARALLEL_FIFTHS'
  | 'HARMONIC_CONTRARY_FIFTHS'
  | 'HARMONIC_SIMULTANEOUS_LEAPS';

export type HarmonicIssue<V extends string> = {
  rule: HarmonicRule;
  /** Voz superior y voz inferior del par (según el orden recibido). */
  upper: V; lower: V;
  before: Interval; after: Interval;
};

const isOctaveClass = (iv: Interval) => iv.simple === 1 && iv.quality === 'P';
const isFifthClass = (iv: Interval) => iv.simple === 5;

/** Intervalo armónico entre dos notas simultáneas, siempre de la grave a la aguda. */
function harmonic(a: Pitch, b: Pitch): Interval {
  return a.midi <= b.midi ? intervalBetween(a, b) : intervalBetween(b, a);
}

/**
 * Revisa el enlace entre dos acordes. `voices` va de la voz más aguda a la más
 * grave (p. ej. S, A, T, B): la primera y la última son las voces extremas.
 * Las voces sin nota en alguno de los dos acordes se ignoran.
 */
export function checkHarmonicMotion<V extends string>(
  voices: readonly V[],
  before: Partial<Record<V, Pitch>>,
  after: Partial<Record<V, Pitch>>,
): HarmonicIssue<V>[] {
  const issues: HarmonicIssue<V>[] = [];
  const present = voices.filter(v => before[v] && after[v]);
  const extremes = new Set([voices[0], voices[voices.length - 1]]);
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    const upper = present[i], lower = present[j];
    const u0 = before[upper]!, u1 = after[upper]!, l0 = before[lower]!, l1 = after[lower]!;
    const du = Math.sign(u1.midi - u0.midi), dl = Math.sign(l1.midi - l0.midi);
    if (!du || !dl) continue; // si una voz se queda, no hay paralelas ni contrarias ni salto simultáneo
    const h0 = harmonic(l0, u0), h1 = harmonic(l1, u1);
    const parallel = du === dl;
    const base = { upper, lower, before: h0, after: h1 };
    if (isOctaveClass(h0) && isOctaveClass(h1)) {
      issues.push({ rule: parallel ? 'HARMONIC_PARALLEL_OCTAVES' : 'HARMONIC_CONTRARY_OCTAVES', ...base });
    } else if (isFifthClass(h0) && isFifthClass(h1) && h0.quality === 'P' && h1.quality === 'P') {
      if (parallel) issues.push({ rule: 'HARMONIC_PARALLEL_FIFTHS', ...base });
      else if (extremes.has(upper) && extremes.has(lower)) issues.push({ rule: 'HARMONIC_CONTRARY_FIFTHS', ...base });
    }
    if (parallel) {
      const mu = intervalBetween(u0, u1), ml = intervalBetween(l0, l1);
      if (isLeap(mu) && isLeap(ml)) {
        const bothFourths = mu.number === 4 && mu.quality === 'P' && ml.number === 4 && ml.quality === 'P';
        if (!bothFourths) issues.push({ rule: 'HARMONIC_SIMULTANEOUS_LEAPS', upper, lower, before: mu, after: ml });
      }
    }
  }
  return issues;
}
