/** Lesson 8: independent pairs of SATB chords, never movements between pairs. */
import type { VoiceData } from './midi-parser';
import { analyzeSatbChords, detectKey, groupChords, identifySatbChord, SATB_VOICES, VOICE_NAMES, type Chord, type KeyModel, type SatbFeedback, type SatbVoice } from './satb-chords-validator';
import { parseSpelling, spellingName, spellingToPc } from './spelling';
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
  if (chords.length) {
    const model = detectKey(chords, data);
    const analysis = analyzeSatbChords(chords, model);
    out.push(...analysis.feedback.filter(f => f.severity === 'error'));
    add('SATB_KEY', 0, `Tonalidad reconocida: ${spellingName(model.tonic, 'es')} mayor.`, `Detected key: ${spellingName(model.tonic, 'en')} major.`, '', '', 'info');
    for (let i = 0; i + 1 < chords.length; i += 2) {
      const first = chords[i], second = chords[i + 1], p = second.position;
      const a = identifySatbChord(first, model), b = identifySatbChord(second, model);
      const at = `Enlace ${i / 2 + 1} (acordes ${first.position}–${p})`;
      const atEn = `Link ${i / 2 + 1} (chords ${first.position}–${p})`;
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
        add('LINK_INFO', first.position, `Enlace ${i / 2 + 1}: ${name} (${spellingName(a.root, 'es')}–${spellingName(b.root, 'es')})`, `Link ${i / 2 + 1}: ${name} (${spellingName(a.root, 'en')}–${spellingName(b.root, 'en')})`, details('es'), details('en'), 'info');
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
  }
  const missing = LESSON8_LINKS.filter((_, i) => !seen.has(i)).map(l => linkName(l.from, l.to));
  if (missing.length) add('LINK_MISSING', 0, `Faltan enlaces: ${missing.join(', ')}.`, `Missing links: ${missing.join(', ')}.`, 'Escribe cada enlace asignado una vez, en cualquier orden.', 'Write each assigned link once, in any order.');
  return out.sort((a, b) => a.position - b.position);
}
