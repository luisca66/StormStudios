/**
 * satb-chords-validator.ts — Lección 6: construcción de acordes en el cuarteto vocal.
 *
 * Tarea: 7 acordes, uno por grado de una escala mayor (cualquier tonalidad,
 * cualquier orden), en cualquier estado, posición melódica y disposición.
 * No se revisan movimientos melódicos ni enlaces.
 *
 * Reglas (Medrano pp. 12–13 y guion de Luis, 2025):
 * - Tesituras: S Do4–Sol5, A Sol3–Re5, T Si2–Sol4, B Fa2–Si3.
 * - Separaciones: S–A ≤ 12a, A–T ≤ 10a, T–B ≤ 15a. Sin cruce de voces.
 * - Se duplica cualquier nota excepto la sensible.
 * - Mayores y menores pueden suprimir la 5a; nunca el fundamental ni la 3a.
 * - Disminuidos (y aumentados) siempre completos.
 *
 * Devuelve errores (severity 'error') y la descripción de cada acorde
 * (severity 'info'): estado, posición melódica, disposición y duplicaciones.
 */
import type { ParsedNote, VoiceData } from './midi-parser';
import { buildScale } from './music-theory-core';
import { letterIndex, parseSpelling, sameSpelling, spellingName, type Spelling } from './spelling';

export type SatbVoice = 'SOPRANO' | 'ALTO' | 'TENOR' | 'BASS';
export type SatbFeedback = {
  rule: string; severity: 'error' | 'info'; position: number;
  titleEs: string; titleEn: string; detailEs: string; detailEn: string;
};

export const SATB_VOICES: SatbVoice[] = ['SOPRANO', 'ALTO', 'TENOR', 'BASS'];
export const VOICE_NAMES: Record<SatbVoice, { es: string; en: string }> = {
  SOPRANO: { es: 'soprano', en: 'soprano' },
  ALTO: { es: 'contralto', en: 'alto' },
  TENOR: { es: 'tenor', en: 'tenor' },
  BASS: { es: 'bajo', en: 'bass' },
};

/** Tesituras del guion de Luis (2025), en números MIDI con Do4 = 60. */
export const LESSON6_RANGES: Record<SatbVoice, { min: number; max: number; es: string; en: string }> = {
  SOPRANO: { min: 60, max: 79, es: 'Do4–Sol5', en: 'C4–G5' },
  ALTO: { min: 55, max: 74, es: 'Sol3–Re5', en: 'G3–D5' },
  TENOR: { min: 47, max: 67, es: 'Si2–Sol4', en: 'B2–G4' },
  BASS: { min: 41, max: 59, es: 'Fa2–Si3', en: 'F2–B3' },
};

/** Separación máxima entre voces vecinas, como número de intervalo (12 = doceava). */
export const LESSON6_SPACING: { upper: SatbVoice; lower: SatbVoice; max: number; maxSemitones: number }[] = [
  { upper: 'SOPRANO', lower: 'ALTO', max: 12, maxSemitones: 19 },
  { upper: 'ALTO', lower: 'TENOR', max: 10, maxSemitones: 16 },
  { upper: 'TENOR', lower: 'BASS', max: 15, maxSemitones: 24 },
];

export const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'] as const;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MEMBER = ['root', 'third', 'fifth'] as const;
type Member = typeof MEMBER[number];
const MEMBER_NAMES: Record<Member, { es: string; en: string }> = {
  root: { es: 'fundamental', en: 'root' },
  third: { es: 'tercera', en: 'third' },
  fifth: { es: 'quinta', en: 'fifth' },
};
const QUALITY = (degree: number) => degree === 6 ? 'diminished' : [0, 3, 4].includes(degree) ? 'major' : 'minor';
const QUALITY_NAMES = {
  major: { es: 'mayor', en: 'major' },
  minor: { es: 'menor', en: 'minor' },
  diminished: { es: 'disminuido', en: 'diminished' },
};

type ChordTone = { member: Member; pc: number; spelling: Spelling };
export type KeyModel = { key: string; tonic: Spelling; triads: ChordTone[][]; leadingPc: number };
export type Chord = { position: number; tick: number; notes: Partial<Record<SatbVoice, ParsedNote>>; problems: SatbVoice[] };
type Fit = { degree: number; inside: number; hasRoot: boolean; hasThird: boolean; score: number };

export const MAJOR_KEY_MODELS: KeyModel[] = MAJOR_KEYS.map(key => {
  const scale = buildScale(key, 'MAJOR').notes.slice(0, 7);
  const tone = (index: number, member: Member): ChordTone => {
    const note = scale[index % 7];
    return { member, pc: note.pitch, spelling: parseSpelling(note.nameEn)! };
  };
  return {
    key,
    tonic: parseSpelling(scale[0].nameEn)!,
    triads: scale.map((_, d) => [tone(d, 'root'), tone(d + 2, 'third'), tone(d + 4, 'fifth')]),
    leadingPc: scale[6].pitch,
  };
});

const pcOf = (midi: number) => ((midi % 12) + 12) % 12;
const keyName = (model: KeyModel, locale: 'es' | 'en') => spellingName(model.tonic, locale);

/** Nombre con octava científica (Do4 = MIDI 60), según la grafía escrita si existe. */
function noteLabel(note: ParsedNote, locale: 'es' | 'en'): string {
  const spelling = parseSpelling(note.spelling);
  if (!spelling) return `MIDI ${note.midi}`;
  const octave = Math.floor((note.midi - spelling.alter) / 12) - 1;
  return spellingName(spelling, locale) + octave;
}

/** Número de intervalo (3 = tercera, 12 = doceava) entre dos notas, por grafía o, si falta, por semitonos. */
function intervalNumber(lower: ParsedNote, upper: ParsedNote): number {
  const a = parseSpelling(lower.spelling), b = parseSpelling(upper.spelling);
  if (a && b) {
    const step = (note: ParsedNote, s: Spelling) => Math.floor((note.midi - s.alter) / 12) * 7 + letterIndex(s.letter);
    return step(upper, b) - step(lower, a) + 1;
  }
  const semis = upper.midi - lower.midi;
  return [1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7][((semis % 12) + 12) % 12] + 7 * Math.floor(semis / 12);
}

const ordinal = (n: number, locale: 'es' | 'en') => locale === 'es'
  ? `${n}a`
  : `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;

function fitDegree(model: KeyModel, pcs: number[]): Fit {
  let best: Fit | undefined;
  model.triads.forEach((triad, degree) => {
    const inside = pcs.filter(pc => triad.some(t => t.pc === pc)).length;
    const hasRoot = pcs.includes(triad[0].pc), hasThird = pcs.includes(triad[1].pc);
    // El fundamental y la tercera definen el acorde: Do–Mi sin Sol es I, no VI.
    const score = inside + (hasRoot ? 0.5 : 0) + (hasThird ? 0.3 : 0);
    if (!best || score > best.score) best = { degree, inside, hasRoot, hasThird, score };
  });
  return best!;
}

export function groupChords(data: VoiceData): Chord[] {
  const byTick = new Map<number, Chord>();
  for (const voice of SATB_VOICES) for (const note of data.voices[voice] ?? []) {
    let chord = byTick.get(note.tick);
    if (!chord) { chord = { position: 0, tick: note.tick, notes: {}, problems: [] }; byTick.set(note.tick, chord); }
    if (chord.notes[voice]) chord.problems.push(voice);
    else chord.notes[voice] = note;
  }
  return [...byTick.values()].sort((a, b) => a.tick - b.tick).map((chord, i) => ({ ...chord, position: i + 1 }));
}

/** Elige la tonalidad mayor que mejor explica los acordes; desempata por grafías y armadura. */
export function detectKey(chords: Chord[], data: VoiceData): KeyModel {
  const signatures = new Set(data.keyChanges.map(change => change.key));
  let best: { model: KeyModel; score: number[] } | undefined;
  for (const model of MAJOR_KEY_MODELS) {
    let fit = 0, spelled = 0;
    const degrees = new Set<number>();
    for (const chord of chords) {
      const notes = Object.values(chord.notes) as ParsedNote[];
      const f = fitDegree(model, notes.map(n => pcOf(n.midi)));
      fit += f.score; degrees.add(f.degree);
      for (const note of notes) {
        const s = parseSpelling(note.spelling);
        if (s && model.triads.flat().some(t => sameSpelling(t.spelling, s))) spelled++;
      }
    }
    // Prioridad: ajuste de alturas, luego grafías (Fa# vs Solb mayor), luego armadura.
    const score = [fit + degrees.size * 0.1, spelled, signatures.has(model.key) ? 1 : 0];
    const i = best ? score.findIndex((v, k) => Math.abs(v - best!.score[k]) > 1e-9) : 0;
    if (!best || (i >= 0 && score[i] > best.score[i])) best = { model, score };
  }
  return best!.model;
}

export function validateLesson6SatbChords(data: VoiceData): SatbFeedback[] {
  const out: SatbFeedback[] = [];
  const add = (severity: SatbFeedback['severity'], rule: string, position: number, es: string, en: string, detailEs = '', detailEn = '') => {
    out.push({ rule, severity, position, titleEs: es, titleEn: en, detailEs, detailEn });
  };
  const err = (rule: string, position: number, es: string, en: string, detailEs = '', detailEn = '') =>
    add('error', rule, position, es, en, detailEs, detailEn);

  const chords = groupChords(data);
  if (!chords.length) {
    err('SATB_NO_CHORDS', 0, 'El archivo no contiene acordes.', 'The file contains no chords.',
      'Escribe los 7 acordes en las cuatro voces del secuenciador (soprano, contralto, tenor y bajo).',
      'Write the 7 chords in the four voices of the sequencer (soprano, alto, tenor and bass).');
    return out;
  }
  if (chords.length > 64) {
    err('SATB_FILE_LIMIT', 0, 'El archivo tiene demasiados acordes.', 'The file has too many chords.',
      `Se encontraron ${chords.length}; la tarea pide 7.`, `Found ${chords.length}; the assignment asks for 7.`);
    return out;
  }

  const model = detectKey(chords, data);
  add('info', 'SATB_KEY', 0, `Tonalidad reconocida: ${keyName(model, 'es')} mayor.`, `Detected key: ${keyName(model, 'en')} major.`);

  const analysis = analyzeSatbChords(chords, model);
  out.push(...analysis.feedback);
  const degreeCount = analysis.degreeCount;

  // Los 7 grados, una vez cada uno.
  for (let d = 0; d < 7; d++) {
    const triad = model.triads[d];
    const name = (locale: 'es' | 'en') => `${ROMAN[d]} (${spellingName(triad[0].spelling, locale)} ${QUALITY_NAMES[QUALITY(d)][locale]})`;
    const at = degreeCount.get(d) ?? [];
    if (!at.length) err('SATB_MISSING_DEGREE', 0, `Falta el grado ${name('es')}.`, `Missing degree ${name('en')}.`,
      `Notas del acorde: ${triad.map(t => spellingName(t.spelling, 'es')).join('–')}.`, `Chord notes: ${triad.map(t => spellingName(t.spelling, 'en')).join('–')}.`);
    else if (at.length > 1) err('SATB_DUPLICATE_DEGREE', at[1], `El grado ${name('es')} aparece ${at.length} veces.`, `Degree ${name('en')} appears ${at.length} times.`,
      `Acordes ${at.join(', ')}. La tarea pide un acorde de cada grado.`, `Chords ${at.join(', ')}. The assignment asks for one chord per degree.`);
  }
  if (chords.length !== 7) err('SATB_CHORD_COUNT', 0, `Se encontraron ${chords.length} acordes; la tarea pide 7.`, `Found ${chords.length} chords; the assignment asks for 7.`,
    'Un acorde de cada grado de la escala mayor.', 'One chord on each degree of the major scale.');

  return out.sort((a, b) => a.position - b.position);
}

/** Shared construction checks; assignment counts belong to each lesson. */
export function analyzeSatbChords(chords: Chord[], model: KeyModel) {
  const out: SatbFeedback[] = [];
  const add = (severity: SatbFeedback['severity'], rule: string, position: number, es: string, en: string, detailEs = '', detailEn = '') => {
    out.push({ rule, severity, position, titleEs: es, titleEn: en, detailEs, detailEn });
  };
  const err = (rule: string, position: number, es: string, en: string, detailEs = '', detailEn = '') =>
    add('error', rule, position, es, en, detailEs, detailEn);

  const degreeCount = new Map<number, number[]>();
  for (const chord of chords) {
    const p = chord.position;
    const at = `Acorde ${p}`, atEn = `Chord ${p}`;

    // Una nota por voz, todas simultáneas.
    const missing = SATB_VOICES.filter(v => !chord.notes[v]);
    for (const voice of new Set(chord.problems)) {
      err('SATB_VOICE_NOTES', p, `${at}: la voz de ${VOICE_NAMES[voice].es} tiene más de una nota.`,
        `${atEn}: the ${VOICE_NAMES[voice].en} has more than one note.`,
        'Cada voz canta una sola nota por acorde.', 'Each voice sings a single note per chord.');
    }
    if (missing.length) {
      err('SATB_MISSING_VOICE', p, `${at}: falta ${missing.map(v => VOICE_NAMES[v].es).join(', ')}.`,
        `${atEn}: missing ${missing.map(v => VOICE_NAMES[v].en).join(', ')}.`,
        'Las cuatro voces deben atacar el acorde al mismo tiempo, cada una en su pentagrama.',
        'All four voices must start the chord together, each on its own staff.');
      continue;
    }
    const n = chord.notes as Record<SatbVoice, ParsedNote>;
    const pcs = SATB_VOICES.map(v => pcOf(n[v].midi));
    const fit = fitDegree(model, pcs);
    const triad = model.triads[fit.degree];
    const memberOf = (note: ParsedNote) => triad.find(t => t.pc === pcOf(note.midi));
    const chordNames = (locale: 'es' | 'en') => triad.map(t => spellingName(t.spelling, locale)).join('–');
    if ((!fit.hasRoot && !fit.hasThird) || fit.inside < 2) {
      err('SATB_UNRECOGNIZED', p, `${at}: no se reconoce el acorde.`, `${atEn}: the chord is not recognized.`,
        `Las notas no forman un acorde de ${keyName(model, 'es')} mayor. Cada acorde necesita fundamental y tercera de un grado de la escala.`,
        `The notes do not form a chord of ${keyName(model, 'en')} major. Each chord needs the root and third of a scale degree.`);
      continue;
    }
    const roman = ROMAN[fit.degree];
    const quality = QUALITY(fit.degree);
    const label = `${at} (${roman}, ${spellingName(triad[0].spelling, 'es')} ${QUALITY_NAMES[quality].es})`;
    const labelEn = `${atEn} (${roman}, ${spellingName(triad[0].spelling, 'en')} ${QUALITY_NAMES[quality].en})`;
    degreeCount.set(fit.degree, [...(degreeCount.get(fit.degree) ?? []), p]);

    // Notas ajenas y grafías.
    let missingSpelling = false;
    for (const voice of SATB_VOICES) {
      const note = n[voice];
      const tone = memberOf(note);
      const written = parseSpelling(note.spelling);
      if (!tone) {
        err('SATB_FOREIGN_NOTE', p, `${label}: nota ajena en ${VOICE_NAMES[voice].es}.`, `${labelEn}: foreign note in the ${VOICE_NAMES[voice].en}.`,
          `${noteLabel(note, 'es')} no pertenece al acorde (${chordNames('es')}).`,
          `${noteLabel(note, 'en')} does not belong to the chord (${chordNames('en')}).`);
      } else if (!written) missingSpelling = true;
      else if (!sameSpelling(written, tone.spelling)) {
        err('SATB_ENHARMONIC', p, `${label}: grafía incorrecta en ${VOICE_NAMES[voice].es}.`, `${labelEn}: wrong spelling in the ${VOICE_NAMES[voice].en}.`,
          `Escribiste ${spellingName(written, 'es')}; en ${keyName(model, 'es')} mayor corresponde ${spellingName(tone.spelling, 'es')}.`,
          `You wrote ${spellingName(written, 'en')}; in ${keyName(model, 'en')} major it is ${spellingName(tone.spelling, 'en')}.`);
      }
    }
    if (missingSpelling) {
      err('SATB_MISSING_SPELLING', p, `${label}: faltan las grafías.`, `${labelEn}: missing spellings.`,
        'Exporta desde Storm Sequencer para conservar las grafías de las notas.', 'Export from Storm Sequencer to preserve note spellings.');
    }

    // Duplicaciones, triplicaciones y supresiones.
    const count: Record<Member, number> = { root: 0, third: 0, fifth: 0 };
    for (const voice of SATB_VOICES) { const t = memberOf(n[voice]); if (t) count[t.member]++; }
    if (!count.root) err('SATB_MISSING_ROOT', p, `${label}: falta el fundamental.`, `${labelEn}: missing root.`,
      `Sin ${spellingName(triad[0].spelling, 'es')} no se reconoce el acorde. Nunca se suprime el fundamental.`,
      `Without ${spellingName(triad[0].spelling, 'en')} the chord is not recognized. The root is never omitted.`);
    if (!count.third) err('SATB_MISSING_THIRD', p, `${label}: falta la tercera.`, `${labelEn}: missing third.`,
      `Sin ${spellingName(triad[1].spelling, 'es')} no se sabe si el acorde es mayor o menor. Nunca se suprime la tercera.`,
      `Without ${spellingName(triad[1].spelling, 'en')} the chord's quality is unknown. The third is never omitted.`);
    if (!count.fifth && quality === 'diminished') err('SATB_INCOMPLETE_DIMINISHED', p, `${label}: falta la quinta.`, `${labelEn}: missing fifth.`,
      `Los acordes disminuidos y aumentados siempre se presentan completos; falta ${spellingName(triad[2].spelling, 'es')}.`,
      `Diminished and augmented chords are always complete; ${spellingName(triad[2].spelling, 'en')} is missing.`);
    const leading = SATB_VOICES.filter(v => pcOf(n[v].midi) === model.leadingPc);
    if (leading.length > 1) {
      const lt = triad.find(t => t.pc === model.leadingPc)!;
      err('SATB_LEADING_TONE_DOUBLED', p, `${label}: sensible duplicada.`, `${labelEn}: doubled leading tone.`,
        `${spellingName(lt.spelling, 'es')} es la sensible de ${keyName(model, 'es')} mayor (la ${MEMBER_NAMES[lt.member].es} de este acorde) y aparece en ${leading.map(v => VOICE_NAMES[v].es).join(' y ')}. La sensible no se duplica.`,
        `${spellingName(lt.spelling, 'en')} is the leading tone of ${keyName(model, 'en')} major (this chord's ${MEMBER_NAMES[lt.member].en}) and appears in the ${leading.map(v => VOICE_NAMES[v].en).join(' and ')}. The leading tone is never doubled.`);
    }

    // Tesituras, cruces y separaciones.
    for (const voice of SATB_VOICES) {
      const range = LESSON6_RANGES[voice];
      const midi = n[voice].midi;
      if (midi < range.min || midi > range.max) {
        err('SATB_RANGE', p, `${label}: ${VOICE_NAMES[voice].es} fuera de tesitura.`, `${labelEn}: ${VOICE_NAMES[voice].en} out of range.`,
          `${noteLabel(n[voice], 'es')} está ${midi < range.min ? 'por debajo' : 'por encima'} de la tesitura de ${VOICE_NAMES[voice].es} (${range.es}).`,
          `${noteLabel(n[voice], 'en')} is ${midi < range.min ? 'below' : 'above'} the ${VOICE_NAMES[voice].en} range (${range.en}).`);
      }
    }
    for (const { upper, lower, max, maxSemitones } of LESSON6_SPACING) {
      const hi = n[upper], lo = n[lower];
      const pair = `${VOICE_NAMES[upper].es} y ${VOICE_NAMES[lower].es}`, pairEn = `${VOICE_NAMES[upper].en} and ${VOICE_NAMES[lower].en}`;
      if (hi.midi < lo.midi) {
        err('SATB_VOICE_CROSSING', p, `${label}: cruce de voces entre ${pair}.`, `${labelEn}: voice crossing between ${pairEn}.`,
          `${VOICE_NAMES[lower].es[0].toUpperCase() + VOICE_NAMES[lower].es.slice(1)} (${noteLabel(lo, 'es')}) queda arriba de ${VOICE_NAMES[upper].es} (${noteLabel(hi, 'es')}).`,
          `The ${VOICE_NAMES[lower].en} (${noteLabel(lo, 'en')}) is above the ${VOICE_NAMES[upper].en} (${noteLabel(hi, 'en')}).`);
        continue;
      }
      const interval = intervalNumber(lo, hi);
      const tooWide = parseSpelling(lo.spelling) && parseSpelling(hi.spelling) ? interval > max : hi.midi - lo.midi > maxSemitones;
      if (tooWide) {
        err('SATB_SPACING', p, `${label}: demasiada separación entre ${pair}.`, `${labelEn}: too much space between ${pairEn}.`,
          `Hay una ${ordinal(interval, 'es')} (${noteLabel(lo, 'es')}–${noteLabel(hi, 'es')}); el máximo es una ${ordinal(max, 'es')}.`,
          `There is a ${ordinal(interval, 'en')} (${noteLabel(lo, 'en')}–${noteLabel(hi, 'en')}); the maximum is a ${ordinal(max, 'en')}.`);
      }
    }

    // Descripción del acorde (informativa).
    const bass = memberOf(n.BASS), top = memberOf(n.SOPRANO);
    const state = bass && { root: ['fundamental', 'root position'], third: ['primera inversión (6/3)', 'first inversion (6/3)'], fifth: ['segunda inversión (6/4)', 'second inversion (6/4)'] }[bass.member];
    const melodic = top && { root: ['de 8a', 'of the octave'], third: ['de 3a', 'of the third'], fifth: ['de 5a', 'of the fifth'] }[top.member];
    const upper = [n.TENOR, n.ALTO, n.SOPRANO].map(x => x.midi);
    const closed = upper.every((midi, i) => i === 0 || ![...Array(Math.max(0, midi - upper[i - 1] - 1))]
      .some((_, k) => triad.some(t => t.pc === pcOf(upper[i - 1] + k + 1))));
    const doubling = (locale: 'es' | 'en') => MEMBER.filter(m => count[m] !== 1).map(m => {
      const name = MEMBER_NAMES[m][locale];
      if (locale === 'es') return count[m] === 0 ? `sin ${name}` : count[m] === 2 ? `${name} duplicada` : count[m] === 3 ? `${name} triplicada` : `${name} ×${count[m]}`;
      return count[m] === 0 ? `no ${name}` : count[m] === 2 ? `doubled ${name}` : count[m] === 3 ? `tripled ${name}` : `${name} ×${count[m]}`;
    }).join(', ');
    add('info', 'SATB_CHORD_INFO', p, `${label}`, `${labelEn}`,
      `Estado: ${state ? state[0] : '—'}. Posición melódica: ${melodic ? melodic[0] : '—'}. Disposición: ${closed ? 'cerrada' : 'abierta'}. ${doubling('es') ? 'Notas: ' + doubling('es') + '.' : ''}`.trim(),
      `State: ${state ? state[1] : '—'}. Melodic position: ${melodic ? melodic[1] : '—'}. Spacing: ${closed ? 'close' : 'open'}. ${doubling('en') ? 'Notes: ' + doubling('en') + '.' : ''}`.trim());
  }

  return { feedback: out, degreeCount };
}

/** Degree is one-based; inversion is 0 (root), 1 (6/3), or 2 (6/4). */
export function identifySatbChord(chord: Chord, model: KeyModel) {
  if (SATB_VOICES.some(v => !chord.notes[v]) || chord.problems.length) return null;
  const notes = Object.values(chord.notes) as ParsedNote[];
  const fit = fitDegree(model, notes.map(n => pcOf(n.midi)));
  if (!fit.hasRoot || !fit.hasThird || fit.inside !== 4) return null;
  const triad = model.triads[fit.degree];
  const inversion = triad.findIndex(t => t.pc === pcOf(chord.notes.BASS!.midi));
  return { degree: fit.degree + 1, inversion, root: triad[0].spelling };
}
