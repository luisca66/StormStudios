/** Lesson 8: independent pairs of SATB chords, never movements between pairs. */
import type { VoiceData } from './midi-parser';
import { analyzeSatbChords, detectKey, groupChords, identifySatbChord, MAJOR_KEY_MODELS, SATB_VOICES, VOICE_NAMES, type Chord, type KeyModel, type SatbFeedback, type SatbVoice } from './satb-chords-validator';
import { parseSpelling, sameSpelling, spellingName, spellingToPc } from './spelling';
import { checkHarmonicMotion, checkMelodicLine, intervalName, type Pitch } from './voice-leading';
import { chordSymbol, type ProgressionChord } from './harmonic-material';

export const LESSON8_LINKS: { from: ProgressionChord; to: ProgressionChord }[] = [
  [1, 4, 0, 0], [4, 5, 0, 0], [5, 1, 0, 0], [2, 5, 0, 0],
  [5, 6, 0, 0], [6, 2, 0, 0], [1, 7, 0, 1], [4, 5, 1, 0],
].map(([a, b, ai, bi]) => ({ from: { degree: a, inversion: ai }, to: { degree: b, inversion: bi } }));
const linkName = (a: ProgressionChord, b: ProgressionChord) => `${chordSymbol(a)}–${chordSymbol(b)}`;
const pitches = (chord: Chord, model: KeyModel) => {
  const result: Partial<Record<SatbVoice, Pitch>> = {};
  for (const voice of SATB_VOICES) {
    const n = chord.notes[voice];
    if (!n || chord.problems.includes(voice)) continue;
    const spelling = model.triads.flat().find(t => t.pc === n.midi % 12)?.spelling ?? parseSpelling(n.spelling);
    if (spelling) result[voice] = { midi: n.midi, spelling };
  }
  return result;
};

type Reading = { model: KeyModel; target: number };
type PairReading = { pair: Chord[]; candidates: Reading[]; selected?: Reading; fallback?: KeyModel };
const modelName = (model: KeyModel, locale: 'es' | 'en') => `${spellingName(model.tonic, locale)} ${locale === 'es' ? 'mayor' : 'major'}`;

/** Armadura vigente al primer ataque, nunca la de un acorde posterior. */
function activeKey(data: VoiceData, tick: number): KeyModel | undefined {
  const change = data.keyChanges.filter(c => c.tick <= tick).sort((a, b) => a.tick - b.tick).at(-1);
  return MAJOR_KEY_MODELS.find(model => model.key === change?.key);
}

function readPair(pair: Chord[], data: VoiceData): PairReading {
  const signature = activeKey(data, pair[0].tick);
  const candidates: Reading[] = [];
  for (const model of MAJOR_KEY_MODELS) {
    const a = identifySatbChord(pair[0], model), b = identifySatbChord(pair[1], model);
    if (!a || !b) continue;
    const target = LESSON8_LINKS.findIndex(l => linkName(l.from, l.to) === linkName(a, b));
    if (target >= 0) candidates.push({ model, target });
  }
  const signed = candidates.find(c => c.model === signature);
  if (signed) return { pair, candidates: [signed], selected: signed };
  // Las grafías distinguen lecturas enarmónicas, pero no deciden Do–Fa entre Do y Fa.
  const score = (model: KeyModel) => pair.flatMap(c => Object.values(c.notes)).filter(n => {
    const written = parseSpelling(n.spelling);
    return written && model.triads.flat().some(t => t.pc === n.midi % 12 && sameSpelling(written, t.spelling));
  }).length;
  const best = Math.max(...candidates.map(c => score(c.model)));
  const preferred = candidates.filter(c => score(c.model) === best);
  if (preferred.length) return { pair, candidates: preferred, selected: preferred.length === 1 ? preferred[0] : undefined };
  // Un par no asignado todavía necesita diagnóstico, p. ej. II6/3–V en Re.
  // Conserva la armadura si explica sus alturas; no impongas una tonalidad ajena.
  const inSignature = signature && pair.flatMap(c => Object.values(c.notes))
    .every(n => signature.triads.flat().some(t => t.pc === n.midi % 12));
  const fallback = inSignature ? signature : detectKey(pair, { ...data, keyChanges: signature ? [{ tick: pair[0].tick, key: signature.key }] : [] });
  return { pair, candidates: [], fallback };
}

/** Resuelve primero armaduras/lecturas únicas para que el orden de los enlaces no adivine la tarea. */
function resolvePairs(chords: Chord[], data: VoiceData): PairReading[] {
  const readings: PairReading[] = [];
  for (let i = 0; i + 1 < chords.length; i += 2) readings.push(readPair(chords.slice(i, i + 2), data));
  const confirmed = new Set(readings.flatMap(r => r.selected ? [r.selected.target] : []));
  let changed = true;
  while (changed) {
    changed = false;
    // Una ronda usa el mismo conjunto de confirmados para todos los pares.
    const resolved = readings.filter(r => !r.selected && r.candidates.length > 1).flatMap(r => {
      const missing = r.candidates.filter(c => !confirmed.has(c.target));
      return missing.length === 1 ? [{ reading: r, selected: missing[0] }] : [];
    });
    for (const { reading, selected } of resolved) {
      reading.selected = selected; confirmed.add(selected.target); changed = true;
    }
  }
  return readings;
}

export function validateLesson8SatbLinks(data: VoiceData): SatbFeedback[] {
  const out: SatbFeedback[] = [];
  const add = (rule: string, position: number, titleEs: string, titleEn: string, detailEs = '', detailEn = '', severity: SatbFeedback['severity'] = 'error') =>
    out.push({ rule, position, titleEs, titleEn, detailEs, detailEn, severity });
  const chords = groupChords(data);
  if (chords.length > 64) {
    add('SATB_FILE_LIMIT', 0, 'El archivo tiene demasiados acordes.', 'The file has too many chords.', `Se encontraron ${chords.length}; la tarea pide 16.`, `Found ${chords.length}; the assignment asks for 16.`);
    return out;
  }
  if (!chords.length) add('SATB_NO_CHORDS', 0, 'El archivo no contiene acordes.', 'The file contains no chords.', 'Escribe 8 enlaces de dos acordes en las cuatro voces.', 'Write 8 two-chord links in the four voices.');
  if (chords.length !== 16) add('LINK_CHORD_COUNT', 0, `Se encontraron ${chords.length} acordes; la tarea pide 16.`, `Found ${chords.length} chords; the assignment asks for 16.`,
    chords.length % 2 ? 'El número es impar: el último acorde queda sin pareja. Se revisan los enlaces completos.' : 'La tarea pide 8 enlaces de dos acordes. Se revisan los enlaces completos.',
    chords.length % 2 ? 'The count is odd: the last chord has no partner. Complete pairs are reviewed.' : 'The assignment asks for 8 two-chord links. Complete pairs are reviewed.');
  const seen = new Set<number>();
  const usedKeys = new Map<KeyModel, number[]>();
  const readings = resolvePairs(chords, data);
  for (const [index, reading] of readings.entries()) {
    const [first, second] = reading.pair, p = second.position;
    if (!reading.selected && reading.candidates.length > 1) {
      const alternatives = (locale: 'es' | 'en') => reading.candidates.map(c => {
        const link = LESSON8_LINKS[c.target];
        return `${linkName(link.from, link.to)} ${locale === 'es' ? 'en' : 'in'} ${modelName(c.model, locale)}`;
      }).join(locale === 'es' ? ' o ' : ' or ');
      const roots = (locale: 'es' | 'en') => reading.pair.map(c => {
        const identified = identifySatbChord(c, reading.candidates[0].model)!;
        return spellingName(identified.root, locale);
      }).join('–');
      add('LINK_AMBIGUOUS_KEY', p, `Enlace ${index + 1}: ${roots('es')} puede ser ${alternatives('es')}.`, `Link ${index + 1}: ${roots('en')} could be ${alternatives('en')}.`,
        'Pon la armadura de la tonalidad al inicio del compás. Este enlace no se cuenta como confirmado.',
        'Set the key signature at the beginning of the measure. This link is not counted as confirmed.');
      // Reporta solo defectos de construcción compartidos por todas las lecturas.
      const analyses = reading.candidates.map(c => analyzeSatbChords(reading.pair, c.model).feedback.filter(f => f.severity === 'error'));
      const common = analyses[0].filter(f => analyses.every(a => a.some(other => other.rule === f.rule && other.position === f.position && other.detailEs === f.detailEs)));
      out.push(...common.map(f => ({ ...f, titleEs: `Acorde ${f.position}: revisa la construcción.`, titleEn: `Chord ${f.position}: check its construction.` })));
      continue;
    }
    const model = reading.selected?.model ?? reading.fallback!;
    const analysis = analyzeSatbChords(reading.pair, model);
    out.push(...analysis.feedback.filter(f => f.severity === 'error'));
    usedKeys.set(model, [...(usedKeys.get(model) ?? []), index + 1]);
    const a = identifySatbChord(first, model), b = identifySatbChord(second, model);
    const at = `Enlace ${index + 1} (acordes ${first.position}–${p})`;
    const atEn = `Link ${index + 1} (chords ${first.position}–${p})`;
    if (a && b) {
      const name = linkName(a, b);
      const target = LESSON8_LINKS.findIndex(l => linkName(l.from, l.to) === name);
      if (target < 0) {
        const related = LESSON8_LINKS.find(l => l.from.degree === a.degree && l.to.degree === b.degree);
        add('LINK_UNASSIGNED', p, `${at}: escribiste ${name}.`, `${atEn}: you wrote ${name}.`,
          related ? `La tarea pide ${linkName(related.from, related.to)}; respeta los estados indicados (sin cifra: estado fundamental).` : 'Este enlace no es uno de los 8 asignados.',
          related ? `The assignment asks for ${linkName(related.from, related.to)}; use the specified inversions (no figure: root position).` : 'This link is not one of the 8 assigned links.');
      } else {
        if (seen.has(target)) add('LINK_DUPLICATE', p, `${at}: ${name} repetido.`, `${atEn}: repeated ${name}.`, 'Cada enlace asignado debe aparecer una vez.', 'Each assigned link must appear once.');
        seen.add(target);
      }
      const details = (locale: 'es' | 'en') => [first, second].map(c => {
        const info = analysis.feedback.find(f => f.rule === 'SATB_CHORD_INFO' && f.position === c.position);
        return info ? `${c.position}: ${locale === 'es' ? info.detailEs : info.detailEn}` : '';
      }).join(' ');
      add('LINK_INFO', first.position, `Enlace ${index + 1} (compás ${index + 1}): ${modelName(model, 'es')}, ${name} (${spellingName(a.root, 'es')}–${spellingName(b.root, 'es')}).`, `Link ${index + 1} (measure ${index + 1}): ${modelName(model, 'en')}, ${name} (${spellingName(a.root, 'en')}–${spellingName(b.root, 'en')}).`, details('es'), details('en'), 'info');
    } else add('LINK_UNRECOGNIZED', p, `${at}: no se puede identificar el enlace.`, `${atEn}: the link cannot be identified.`, 'Corrige la construcción de ambos acordes para reconocer sus grados y estados.', 'Correct both chords so their degrees and inversions can be recognized.');
    const before = pitches(first, model), after = pitches(second, model);
    for (const voice of SATB_VOICES) {
      if (!before[voice] || !after[voice]) continue;
      for (const issue of checkMelodicLine([before[voice]!, after[voice]!], { leadingPc: model.leadingPc, allowRepeat: true })) {
        add(issue.rule, p, `${at}: ${intervalName(issue.interval, 'es')} en ${VOICE_NAMES[voice].es}.`, `${atEn}: ${intervalName(issue.interval, 'en')} in the ${VOICE_NAMES[voice].en}.`,
          issue.rule === 'MELODIC_DIMINISHED_UNRESOLVED' ? 'En un enlace suelto no hay nota siguiente que compense el intervalo disminuido con un cambio de dirección.' : 'Usa 2as, 3as, 4a justa, 5a justa, 6as u 8a justa; no saltes una octava con la sensible.',
          issue.rule === 'MELODIC_DIMINISHED_UNRESOLVED' ? 'An isolated link has no following note to compensate the diminished interval by reversing direction.' : 'Use 2nds, 3rds, perfect 4ths and 5ths, 6ths or perfect octaves; do not leap an octave on the leading tone.');
      }
    }
    for (const issue of checkHarmonicMotion(SATB_VOICES, before, after)) {
      const descriptions: Record<string, [string, string]> = {
        HARMONIC_PARALLEL_OCTAVES: ['8as paralelas', 'parallel octaves'], HARMONIC_CONTRARY_OCTAVES: ['8as contrarias', 'contrary octaves'],
        HARMONIC_PARALLEL_FIFTHS: ['5as paralelas', 'parallel fifths'], HARMONIC_CONTRARY_FIFTHS: ['5as contrarias entre voces extremas', 'contrary fifths in the outer voices'],
        HARMONIC_SIMULTANEOUS_LEAPS: ['saltos simultáneos en la misma dirección', 'simultaneous leaps in the same direction'],
      };
      add(issue.rule, p, `${at}: ${descriptions[issue.rule][0]}.`, `${atEn}: ${descriptions[issue.rule][1]}.`,
        `${VOICE_NAMES[issue.upper].es} y ${VOICE_NAMES[issue.lower].es}: ${intervalName(issue.before, 'es')} → ${intervalName(issue.after, 'es')}.`,
        `${VOICE_NAMES[issue.upper].en} and ${VOICE_NAMES[issue.lower].en}: ${intervalName(issue.before, 'en')} → ${intervalName(issue.after, 'en')}.`);
    }
    const s0 = before.SOPRANO, s1 = after.SOPRANO;
    const tonicPc = spellingToPc(model.tonic);
    const containsTonic = Object.values(second.notes).some(n => n.midi % 12 === tonicPc);
    if (s0 && s1 && s0.midi % 12 === model.leadingPc && containsTonic && !(a?.degree === 3 && b?.degree === 4) && !(s1.midi === s0.midi + 1 && s1.midi % 12 === tonicPc)) {
      add('LINK_LEADING_TONE_SOPRANO', p, `${at}: la sensible en soprano debe subir a la tónica.`, `${atEn}: the soprano leading tone must rise to the tonic.`, 'Si el segundo acorde contiene la tónica, la sensible del soprano sube un semitono (excepto III–IV).', 'When the second chord contains the tonic, the soprano leading tone rises one semitone (except III–IV).');
    }
  }
  // Un acorde final sin pareja conserva su diagnóstico de construcción.
  if (chords.length % 2) {
    const final = chords.at(-1)!;
    const model = activeKey(data, final.tick) ?? detectKey([final], data);
    out.push(...analyzeSatbChords([final], model).feedback.filter(f => f.severity === 'error'));
  }
  if (usedKeys.size) add('LINK_KEYS', 0, `Tonalidades usadas: ${[...usedKeys.keys()].map(m => modelName(m, 'es')).join(', ')}.`, `Keys used: ${[...usedKeys.keys()].map(m => modelName(m, 'en')).join(', ')}.`, '', '', 'info');
  for (const [model, indices] of usedKeys) if (indices.length > 1) {
    add('LINK_REPEATED_KEY', (indices[1] - 1) * 2 + 1, `Tonalidad repetida: ${modelName(model, 'es')}.`, `Repeated key: ${modelName(model, 'en')}.`,
      `Enlaces ${indices.join(', ')}. Prueba tonalidades distintas para ampliar la práctica; repetir una tonalidad no se penaliza.`,
      `Links ${indices.join(', ')}. Try different keys to broaden your practice; repeating a key is not penalized.`, 'info');
  }
  const missing = LESSON8_LINKS.filter((_, i) => !seen.has(i)).map(l => linkName(l.from, l.to));
  if (missing.length) add('LINK_MISSING', 0, `Faltan enlaces: ${missing.join(', ')}.`, `Missing links: ${missing.join(', ')}.`, 'Escribe cada enlace asignado una vez, en cualquier orden.', 'Write each assigned link once, in any order.');
  return out.sort((a, b) => a.position - b.position);
}
