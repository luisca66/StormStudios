/**
 * melodic-lines-validator.ts — Lección 7: movimientos melódicos.
 *
 * Tarea: cuatro ejercicios que se suben por separado, uno por voz. Cada uno es
 * una melodía de 8 notas (cuartos, dos compases de 4/4) escrita en Storm
 * Sequencer en modo SATB, solo en el pentagrama de esa voz, en cualquier
 * tonalidad mayor. Empieza y termina en el I grado.
 *
 * El canal MIDI identifica la voz (0 = soprano … 3 = bajo). Se revisan:
 * - 8 notas, una a la vez, todas de la escala mayor y con su grafía correcta.
 * - Tónica al inicio y al final.
 * - Tesitura de la voz (las de la Lección 6).
 * - Reglas de movimiento melódico de `voice-leading.ts`, sin nota repetida.
 * Las reglas armónicas no aplican: hay una sola voz.
 */
import type { ParsedNote, VoiceData } from './midi-parser';
import { buildScale } from './music-theory-core';
import { LESSON6_RANGES, MAJOR_KEYS, SATB_VOICES, VOICE_NAMES, type SatbFeedback, type SatbVoice } from './satb-chords-validator';
import { parseSpelling, sameSpelling, spellingName, spellingSymbol, spellingToPc, type Spelling } from './spelling';
import {
  MELODIC_CLASS_NAMES, checkMelodicLine, classifyMelodic, intervalBetween, intervalName,
  type Interval, type MelodicIssue, type Pitch,
} from './voice-leading';

export const LESSON7_NOTE_COUNT = 8;

type KeyModel = { key: string; scale: Spelling[]; tonic: Spelling; leadingPc: number };

const KEY_MODELS: KeyModel[] = MAJOR_KEYS.map(key => {
  const scale = buildScale(key, 'MAJOR').notes.slice(0, 7).map(n => parseSpelling(n.nameEn)!);
  return { key, scale, tonic: scale[0], leadingPc: spellingToPc(scale[6]) };
});

const SHARP_SPELLINGS = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'].map(s => parseSpelling(s)!);
const pcOf = (midi: number) => ((midi % 12) + 12) % 12;
const keyName = (m: KeyModel, locale: 'es' | 'en') => spellingName(m.tonic, locale);
const arrow = (iv: Interval) => iv.direction > 0 ? '↑' : iv.direction < 0 ? '↓' : '=';

function noteLabel(p: Pitch, locale: 'es' | 'en'): string {
  return spellingSymbol(p.spelling, locale) + (Math.floor((p.midi - p.spelling.alter) / 12) - 1);
}

/** Elige la tonalidad mayor que mejor explica la melodía: notas de la escala, tónica al inicio y al final, armadura y grafías. */
function detectKey(notes: ParsedNote[], data: VoiceData): KeyModel {
  const signatures = new Set(data.keyChanges.map(c => c.key));
  const first = pcOf(notes[0].midi), last = pcOf(notes[notes.length - 1].midi);
  let best: { model: KeyModel; score: number[] } | undefined;
  for (const model of KEY_MODELS) {
    const pcs = model.scale.map(spellingToPc);
    const inScale = notes.filter(n => pcs.includes(pcOf(n.midi))).length;
    const tonicPc = spellingToPc(model.tonic);
    const fit = inScale + (first === tonicPc ? 1.5 : 0) + (last === tonicPc ? 1.5 : 0) + (signatures.has(model.key) ? 1 : 0);
    const spelled = notes.filter(n => { const s = parseSpelling(n.spelling); return s && model.scale.some(x => sameSpelling(x, s)); }).length;
    const score = [fit, spelled, signatures.has(model.key) ? 1 : 0];
    const i = best ? score.findIndex((v, k) => Math.abs(v - best!.score[k]) > 1e-9) : 0;
    if (!best || (i >= 0 && score[i] > best.score[i])) best = { model, score };
  }
  return best!.model;
}

export function validateLesson7MelodicLine(data: VoiceData): SatbFeedback[] {
  const out: SatbFeedback[] = [];
  const add = (severity: SatbFeedback['severity'], rule: string, position: number, es: string, en: string, detailEs = '', detailEn = '') =>
    out.push({ rule, severity, position, titleEs: es, titleEn: en, detailEs, detailEn });
  const err = (rule: string, position: number, es: string, en: string, detailEs = '', detailEn = '') =>
    add('error', rule, position, es, en, detailEs, detailEn);

  // Una sola voz por archivo.
  const used = SATB_VOICES.filter(v => (data.voices[v]?.length ?? 0) > 0);
  if (!used.length) {
    err('MELODY_NO_NOTES', 0, 'El archivo no contiene notas.', 'The file contains no notes.',
      'Escribe la melodía en el pentagrama de la voz que estás practicando.',
      'Write the melody on the staff of the voice you are practicing.');
    return out;
  }
  if (used.length > 1) {
    err('MELODY_SEVERAL_VOICES', 0, 'El archivo tiene notas en más de una voz.', 'The file has notes in more than one voice.',
      `Encontré notas en ${used.map(v => VOICE_NAMES[v].es).join(', ')}. Cada ejercicio es una sola melodía: escríbela solo en el pentagrama de su voz y sube cada voz en un archivo aparte.`,
      `Found notes in the ${used.map(v => VOICE_NAMES[v].en).join(', ')}. Each exercise is a single melody: write it only on its voice's staff and upload each voice as a separate file.`);
    return out;
  }
  const voice: SatbVoice = used[0];
  const vEs = VOICE_NAMES[voice].es, vEn = VOICE_NAMES[voice].en;
  const notes = [...data.voices[voice]!].sort((a, b) => a.tick - b.tick || a.midi - b.midi);
  if (notes.length > 64) {
    err('MELODY_FILE_LIMIT', 0, 'El archivo tiene demasiadas notas.', 'The file has too many notes.',
      `Se encontraron ${notes.length}; la tarea pide ${LESSON7_NOTE_COUNT}.`, `Found ${notes.length}; the assignment asks for ${LESSON7_NOTE_COUNT}.`);
    return out;
  }

  // Una nota a la vez.
  const ticks = new Set<number>();
  for (const [i, n] of notes.entries()) {
    if (ticks.has(n.tick)) {
      err('MELODY_SIMULTANEOUS_NOTES', i + 1, `Nota ${i + 1}: hay dos notas al mismo tiempo.`, `Note ${i + 1}: two notes sound at the same time.`,
        'Una melodía tiene una sola nota a la vez. Borra la nota sobrante.', 'A melody has one note at a time. Delete the extra note.');
      return out;
    }
    ticks.add(n.tick);
  }

  const model = detectKey(notes, data);
  const scalePcs = model.scale.map(spellingToPc);
  add('info', 'MELODY_KEY', 0, `Voz: ${vEs}. Tonalidad reconocida: ${keyName(model, 'es')} mayor.`,
    `Voice: ${vEn}. Detected key: ${keyName(model, 'en')} major.`);

  if (notes.length !== LESSON7_NOTE_COUNT) {
    err('MELODY_NOTE_COUNT', 0, `La melodía tiene ${notes.length} notas; la tarea pide ${LESSON7_NOTE_COUNT}.`,
      `The melody has ${notes.length} notes; the assignment asks for ${LESSON7_NOTE_COUNT}.`,
      'Ocho cuartos: dos compases de 4/4, empezando y terminando en la tónica.',
      'Eight quarter notes: two 4/4 measures, starting and ending on the tonic.');
  }

  // Grafías: la del secuenciador; si falta, la de la escala.
  let missingSpelling = false;
  const line: Pitch[] = notes.map((n, i) => {
    const written = parseSpelling(n.spelling);
    const degree = scalePcs.indexOf(pcOf(n.midi));
    const expected = degree >= 0 ? model.scale[degree] : undefined;
    const at = `Nota ${i + 1}`, atEn = `Note ${i + 1}`;
    if (!written) missingSpelling = true;
    // Los intervalos se miden con la grafía de la escala (una grafía equivocada ya se reporta aparte);
    // fuera de la escala, con la escrita o, sin ella, con la de sostenido más simple.
    const fallback = SHARP_SPELLINGS[pcOf(n.midi)];
    const p: Pitch = { midi: n.midi, spelling: expected ?? (written && spellingToPc(written) === pcOf(n.midi) ? written : fallback) };
    if (!expected) {
      err('MELODY_FOREIGN_NOTE', i + 1, `${at}: ${noteLabel(p, 'es')} no pertenece a ${keyName(model, 'es')} mayor.`,
        `${atEn}: ${noteLabel(p, 'en')} is not in ${keyName(model, 'en')} major.`,
        `Usa solo las notas de la escala: ${model.scale.map(s => spellingName(s, 'es')).join(', ')}.`,
        `Use only the notes of the scale: ${model.scale.map(s => spellingName(s, 'en')).join(', ')}.`);
    } else if (written && !sameSpelling(written, expected)) {
      err('MELODY_ENHARMONIC', i + 1, `${at}: grafía incorrecta.`, `${atEn}: wrong spelling.`,
        `Escribiste ${spellingName(written, 'es')}; en ${keyName(model, 'es')} mayor corresponde ${spellingName(expected, 'es')}.`,
        `You wrote ${spellingName(written, 'en')}; in ${keyName(model, 'en')} major it is ${spellingName(expected, 'en')}.`);
    }
    return p;
  });
  if (missingSpelling) {
    err('MELODY_MISSING_SPELLING', 0, 'Faltan las grafías de las notas.', 'Note spellings are missing.',
      'Exporta desde Storm Sequencer para conservar las grafías.', 'Export from Storm Sequencer to preserve note spellings.');
  }

  // Tónica al inicio y al final.
  const tonicPc = spellingToPc(model.tonic);
  const tonicEs = spellingName(model.tonic, 'es'), tonicEn = spellingName(model.tonic, 'en');
  if (pcOf(line[0].midi) !== tonicPc) {
    err('MELODY_START_TONIC', 1, `La melodía no empieza en la tónica.`, `The melody does not start on the tonic.`,
      `Empieza en ${noteLabel(line[0], 'es')}; debe empezar en ${tonicEs}, el I grado de ${keyName(model, 'es')} mayor.`,
      `It starts on ${noteLabel(line[0], 'en')}; it must start on ${tonicEn}, degree I of ${keyName(model, 'en')} major.`);
  }
  const lastIndex = line.length - 1;
  if (lastIndex > 0 && pcOf(line[lastIndex].midi) !== tonicPc) {
    err('MELODY_END_TONIC', lastIndex + 1, `La melodía no termina en la tónica.`, `The melody does not end on the tonic.`,
      `Termina en ${noteLabel(line[lastIndex], 'es')}; debe terminar en ${tonicEs}, el I grado de ${keyName(model, 'es')} mayor.`,
      `It ends on ${noteLabel(line[lastIndex], 'en')}; it must end on ${tonicEn}, degree I of ${keyName(model, 'en')} major.`);
  }

  // Tesitura.
  const range = LESSON6_RANGES[voice];
  line.forEach((p, i) => {
    if (p.midi < range.min || p.midi > range.max) {
      err('MELODY_RANGE', i + 1, `Nota ${i + 1}: fuera de la tesitura de ${vEs}.`, `Note ${i + 1}: outside the ${vEn} range.`,
        `${noteLabel(p, 'es')} está ${p.midi < range.min ? 'por debajo' : 'por encima'} de la tesitura de ${vEs} (${range.es}).`,
        `${noteLabel(p, 'en')} is ${p.midi < range.min ? 'below' : 'above'} the ${vEn} range (${range.en}).`);
    }
  });

  // Movimientos melódicos.
  for (const issue of checkMelodicLine(line, { leadingPc: model.leadingPc, allowRepeat: false })) {
    const a = issue.index, from = line[a], to = line[a + 1];
    const pos = a + 2;
    const span = `Notas ${a + 1}–${a + 2}`, spanEn = `Notes ${a + 1}–${a + 2}`;
    const move = `${noteLabel(from, 'es')} → ${noteLabel(to, 'es')}`, moveEn = `${noteLabel(from, 'en')} → ${noteLabel(to, 'en')}`;
    const ivEs = intervalName(issue.interval, 'es'), ivEn = intervalName(issue.interval, 'en');
    const before = a > 0 ? line[a - 1] : undefined;
    const move3 = before ? `${noteLabel(before, 'es')} → ${move}` : move, move3En = before ? `${noteLabel(before, 'en')} → ${moveEn}` : moveEn;
    const texts = melodicTexts(issue, { move, moveEn, move3, move3En, ivEs, ivEn, lead: model.scale[6] });
    err(issue.rule, pos, `${span}: ${texts.es}`, `${spanEn}: ${texts.en}`, texts.detailEs, texts.detailEn);
  }

  // Resumen informativo de los intervalos.
  if (line.length > 1) {
    const ivs = line.slice(1).map((p, i) => intervalBetween(line[i], p));
    add('info', 'MELODY_SUMMARY', line.length + 1, 'Intervalos de la melodía', 'Melody intervals',
      ivs.map(iv => `${intervalName(iv, 'es')} ${arrow(iv)} (${MELODIC_CLASS_NAMES[classifyMelodic(iv)].es})`).join(' · '),
      ivs.map(iv => `${intervalName(iv, 'en')} ${arrow(iv)} (${MELODIC_CLASS_NAMES[classifyMelodic(iv)].en})`).join(' · '));
  }

  return out.sort((x, y) => x.position - y.position);
}

function melodicTexts(issue: MelodicIssue, t: { move: string; moveEn: string; move3: string; move3En: string; ivEs: string; ivEn: string; lead: Spelling }) {
  switch (issue.rule) {
    case 'MELODIC_FORBIDDEN_INTERVAL':
      return {
        es: `intervalo no permitido (${t.ivEs}).`, en: `interval not allowed (${t.ivEn}).`,
        detailEs: `${t.move}. Los intervalos permitidos son 2a m, 2a M, 3a m, 3a M, 4a J, 5a J, 6a m, 6a M y 8a J; sin aumentados, sin 7as ni intervalos mayores que la 8a.`,
        detailEn: `${t.moveEn}. The allowed intervals are m2, M2, m3, M3, P4, P5, m6, M6 and P8: no augmented intervals, no 7ths and nothing larger than an octave.`,
      };
    case 'MELODIC_REPEATED_NOTE':
      return {
        es: 'nota repetida.', en: 'repeated note.',
        detailEs: `${t.move}. En este ejercicio cada nota debe moverse a otra distinta.`,
        detailEn: `${t.moveEn}. In this exercise every note must move to a different one.`,
      };
    case 'MELODIC_LEADING_TONE_OCTAVE':
      return {
        es: 'salto de 8a con la sensible.', en: 'octave leap on the leading tone.',
        detailEs: `${t.move}. ${spellingName(t.lead, 'es')} es la sensible; no se practica el salto de 8a con ella.`,
        detailEn: `${t.moveEn}. ${spellingName(t.lead, 'en')} is the leading tone; it does not leap an octave.`,
      };
    case 'MELODIC_DIMINISHED_UNRESOLVED':
      return {
        es: `${t.ivEs} sin compensar.`, en: `${t.ivEn} not compensated.`,
        detailEs: `${t.move}. Después de una ${t.ivEs} la voz debe cambiar de dirección${issue.interval.direction > 0 ? ' y bajar' : ' y subir'} en la nota siguiente.`,
        detailEn: `${t.moveEn}. After a ${t.ivEn} the voice must change direction${issue.interval.direction > 0 ? ' and move down' : ' and move up'} on the next note.`,
      };
    case 'MELODIC_SUCCESSIVE_LEAPS': {
      const prevEs = intervalName(issue.previous!, 'es'), prevEn = intervalName(issue.previous!, 'en');
      const dirEs = issue.interval.direction > 0 ? 'hacia arriba' : 'hacia abajo', dirEn = issue.interval.direction > 0 ? 'upward' : 'downward';
      return {
        es: `dos saltos seguidos ${dirEs}.`, en: `two successive leaps ${dirEn}.`,
        detailEs: `Una ${prevEs} y luego una ${t.ivEs} (${t.move3}) en la misma dirección. Solo se permiten dos saltos seguidos en la misma dirección si son una 4a y una 5a (o una 5a y una 4a).`,
        detailEn: `A ${prevEn} followed by a ${t.ivEn} (${t.move3En}) in the same direction. Two successive leaps in the same direction are allowed only as a 4th and a 5th (or a 5th and a 4th).`,
      };
    }
  }
}
