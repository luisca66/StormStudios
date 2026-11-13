/** Lesson 9 — Medrano PDF p. 20. Independent cadences in 4/4. */
import type { VoiceData } from './midi-parser';
import { analyzeSatbChords, detectKey, groupChords, identifySatbChord, MAJOR_KEY_MODELS, SATB_VOICES, VOICE_NAMES, type Chord, type KeyModel, type SatbFeedback } from './satb-chords-validator';
import { activeKey, pitches } from './satb-links-validator';
import { chordSymbol, type ProgressionChord } from './harmonic-material';
import { parseSpelling, sameSpelling, spellingName, spellingToPc } from './spelling';
import { checkHarmonicMotion, checkMelodicLine, intervalName } from './voice-leading';

const TYPES = ['authentic', 'plagal', 'complete', 'extended'] as const;
type CadenceType = typeof TYPES[number];
const NAMES: Record<CadenceType, [string, string]> = {
  authentic: ['auténtica', 'authentic'], plagal: ['plagal', 'plagal'],
  complete: ['completa', 'complete'], extended: ['ampliada', 'extended'],
};
const keyName = (m: KeyModel, l: 'es' | 'en') => `${spellingName(m.tonic, l)} ${l === 'es' ? 'mayor' : 'major'}`;

/** Relax only inversions for diagnostics and recovering the next cadence boundary. */
function cadenceType(chords: (ProgressionChord | null)[], relaxed = false): CadenceType | undefined {
  if (chords.some(c => !c)) return;
  const cs = chords as ProgressionChord[];
  const degrees = cs.map(c => c.degree).join(',');
  let type: CadenceType | undefined;
  if (degrees === '5,1') type = 'authentic';
  if (degrees === '4,1') type = 'plagal';
  if (cs.length === 3 && [2, 4, 6].includes(cs[0].degree) && degrees.endsWith(',5,1')) type = 'complete';
  if (cs.length === 4 && [2, 4].includes(cs[0].degree) && degrees.endsWith(',1,5,1')) type = 'extended';
  if (!type || relaxed) return type;
  if (cs.slice(-2).some(c => c.inversion !== 0)) return;
  if (cs.length > 2 && !(cs[0].inversion === 0 || ([2, 4].includes(cs[0].degree) && cs[0].inversion === 1))) return;
  if (type === 'extended' && cs[1].inversion !== 2) return;
  return type;
}

function segment(chords: Chord[], data: VoiceData): Chord[][] {
  const groups: Chord[][] = [];
  let current: Chord[] = [];
  const bar = data.ticksPerBeat * 4;
  for (const chord of chords) {
    const previous = current.at(-1);
    if (previous) {
      const newKey = data.keyChanges.some(k => k.tick > previous.tick && k.tick <= chord.tick);
      const end = Math.max(...Object.values(previous.notes).map(n => n.tick + (n.durationTicks ?? 2 * data.ticksPerBeat)));
      const models = activeKey(data, current[0].tick);
      const closes = (models ? [models] : MAJOR_KEY_MODELS).some(m => {
        const reading = current.map(c => identifySatbChord(c, m));
        return reading.at(-1)?.inversion === 0 && cadenceType(reading, true);
      });
      if (newKey || (chord.tick % bar === 0 && (end < chord.tick || closes))) {
        groups.push(current); current = [];
      }
    }
    current.push(chord);
  }
  if (current.length) groups.push(current);
  return groups;
}

export function validateLesson9Cadences(data: VoiceData): SatbFeedback[] {
  const out: SatbFeedback[] = [];
  const add = (rule: string, position: number, titleEs: string, titleEn: string, detailEs = '', detailEn = '', severity: SatbFeedback['severity'] = 'error') =>
    out.push({ rule, position, titleEs, titleEn, detailEs, detailEn, severity });
  const chords = groupChords(data), beat = data.ticksPerBeat;
  if (chords.length > 64) {
    add('CADENCE_FILE_LIMIT', 0, 'El archivo tiene demasiados acordes.', 'The file has too many chords.', `Se encontraron ${chords.length}; la tarea pide 11.`, `Found ${chords.length}; the assignment asks for 11.`);
    return out;
  }
  if (!chords.length) add('CADENCE_NO_CHORDS', 0, 'El archivo no contiene acordes.', 'The file contains no chords.');
  if (chords.length !== 11) add('CADENCE_CHORD_COUNT', 0, `Se encontraron ${chords.length} acordes; se esperan 11.`, `Found ${chords.length} chords; expected 11.`, 'Escribe 4 cadencias: 2 + 2 + 3 + 4 acordes.', 'Write 4 cadences: 2 + 2 + 3 + 4 chords.');
  const seen = new Set<CadenceType>();
  const keys = new Map<KeyModel, { number: number; position: number }[]>();
  for (const [index, group] of segment(chords, data).entries()) {
    const first = group[0], last = group.at(-1)!, p = first.position;
    let model = activeKey(data, first.tick);
    if (!model) {
      const candidates = MAJOR_KEY_MODELS.filter(m => cadenceType(group.map(c => identifySatbChord(c, m)), true));
      const score = (m: KeyModel) => group.flatMap(c => Object.values(c.notes)).filter(n => {
        const sp = parseSpelling(n.spelling);
        return sp && m.triads.flat().some(t => t.pc === n.midi % 12 && sameSpelling(sp, t.spelling));
      }).length;
      const best = Math.max(...candidates.map(score));
      const preferred = candidates.filter(m => score(m) === best);
      if (preferred.length > 1) {
        add('CADENCE_AMBIGUOUS_KEY', p, `Cadencia ${index + 1}: tonalidad ambigua.`, `Cadence ${index + 1}: ambiguous key.`,
          `Lecturas posibles: ${preferred.map(m => keyName(m, 'es')).join(', ')}. Pon la armadura al inicio; no se cuenta como confirmada.`,
          `Possible readings: ${preferred.map(m => keyName(m, 'en')).join(', ')}. Set the opening key signature; this cadence is not counted as confirmed.`);
        const analyses = preferred.map(m => analyzeSatbChords(group, m).feedback.filter(f => f.severity === 'error'));
        out.push(...analyses[0].filter(f => analyses.every(a => a.some(other =>
          other.rule === f.rule && other.position === f.position && other.detailEs === f.detailEs))));
        continue;
      }
      model = preferred[0] ?? detectKey(group, { ...data, keyChanges: [] });
    }
    keys.set(model, [...(keys.get(model) ?? []), { number: index + 1, position: p }]);
    const identified = group.map(c => identifySatbChord(c, model));
    const type = cadenceType(identified);
    const symbol = identified.map(c => c ? chordSymbol(c) : '?').join('–');
    const analysis = analyzeSatbChords(group, model);
    out.push(...analysis.feedback.filter(f => f.severity === 'error'));
    if (!type) add('CADENCE_UNRECOGNIZED', p, `Cadencia ${index + 1}: ${symbol} no corresponde a un tipo asignado.`, `Cadence ${index + 1}: ${symbol} does not match an assigned type.`,
      'Auténtica V–I; plagal IV–I; completa IV/IV6/3/II/II6/3/VI–V–I; ampliada IV/IV6/3/II/II6/3–I6/4–V–I. Los dos últimos acordes van en estado fundamental.',
      'Authentic V–I; plagal IV–I; complete IV/IV6/3/II/II6/3/VI–V–I; extended IV/IV6/3/II/II6/3–I6/4–V–I. The final two chords must be in root position.');
    else {
      if (seen.has(type)) add('CADENCE_DUPLICATE', p, `Cadencia ${NAMES[type][0]} repetida.`, `Repeated ${NAMES[type][1]} cadence.`);
      seen.add(type);
    }
    if (identified.slice(-2).some(c => c && c.inversion !== 0)) add('CADENCE_FINAL_INVERSION', last.position,
      'Los dos últimos acordes deben estar en estado fundamental.', 'The final two chords must be in root position.', `Cifrado escrito: ${symbol}.`, `Written figures: ${symbol}.`);
    identified.forEach((c, i) => {
      if (c?.degree !== 1 || c.inversion !== 2) return;
      if (group[i].tick % (2 * beat) !== 0) add('CADENCE_SIX_FOUR_WEAK_BEAT', group[i].position,
        'El I6/4 debe caer en tiempo 1 o 3.', 'I6/4 must fall on beat 1 or 3.');
      if (!(cadenceType(identified, true) === 'extended' && i === group.length - 3)) add('CADENCE_SIX_FOUR_POSITION', group[i].position,
        'El I6/4 solo corresponde antes de V–I en la ampliada.', 'I6/4 belongs immediately before V–I in the extended cadence.');
    });
    if (first.tick % (4 * beat) !== 0) add('CADENCE_START_MEASURE', p, 'Cada cadencia empieza en un compás nuevo.', 'Each cadence starts in a new measure.');
    group.forEach((c, i) => {
      const finalTonic = i === group.length - 1 && identified[i]?.degree === 1;
      if (Object.values(c.notes).some(n => n.durationTicks !== undefined && n.durationTicks !== 2 * beat && !(finalTonic && n.durationTicks === 4 * beat))) {
        add('CADENCE_DURATION', c.position, 'Usa blancas; el I final también puede ser redonda.', 'Use half notes; the final I may also be a whole note.');
      }
    });
    const details = (l: 'es' | 'en') => analysis.feedback.filter(f => f.rule === 'SATB_CHORD_INFO').map(f =>
      `${f.position}: ${l === 'es' ? f.detailEs : f.detailEn}`).join(' ') + (identified.some(c => c?.inversion === 2 && c.degree === 1)
        ? (l === 'es' ? ' En el I6/4 es habitual duplicar el bajo; las otras duplicaciones permitidas también son válidas.' : 'Doubling the bass is usual in I6/4; other permitted doublings are also valid.') : '');
    const measures = `${Math.floor(first.tick / (4 * beat)) + 1}–${Math.floor(last.tick / (4 * beat)) + 1}`;
    add('CADENCE_INFO', p, `Cadencia ${index + 1} (compases ${measures}): ${keyName(model, 'es')}, ${type ? NAMES[type][0] : 'no reconocida'} ${symbol}.`,
      `Cadence ${index + 1} (measures ${measures}): ${keyName(model, 'en')}, ${type ? NAMES[type][1] : 'unrecognized'} ${symbol}.`, details('es'), details('en'), 'info');
    const lines = group.map(c => pitches(c, model));
    for (const voice of SATB_VOICES) {
      // Missing or polyphonic attacks break the line, rather than creating invented intervals.
      for (let start = 0; start < lines.length;) {
        if (!lines[start][voice]) { start++; continue; }
        let end = start + 1;
        while (end < lines.length && lines[end][voice]) end++;
        for (const issue of checkMelodicLine(lines.slice(start, end).map(l => l[voice]!), { leadingPc: model.leadingPc, allowRepeat: true })) {
          add(issue.rule, group[start + issue.index + 1].position,
            `${VOICE_NAMES[voice].es}: revisa ${intervalName(issue.interval, 'es')}.`, `${VOICE_NAMES[voice].en}: check ${intervalName(issue.interval, 'en')}.`,
            'Revisa el movimiento melódico completo de esta cadencia, incluida la compensación de intervalos disminuidos y los saltos sucesivos.',
            'Check the complete melodic line of this cadence, including compensation of diminished intervals and successive leaps.');
        }
        start = end;
      }
    }
    for (let i = 0; i + 1 < lines.length; i++) {
      for (const issue of checkHarmonicMotion(SATB_VOICES, lines[i], lines[i + 1])) add(issue.rule, group[i + 1].position,
        `Revisa el movimiento entre ${VOICE_NAMES[issue.upper].es} y ${VOICE_NAMES[issue.lower].es}.`,
        `Check the motion between ${VOICE_NAMES[issue.upper].en} and ${VOICE_NAMES[issue.lower].en}.`,
        `${intervalName(issue.before, 'es')} → ${intervalName(issue.after, 'es')}: evita paralelas, contrarias prohibidas y saltos simultáneos en la misma dirección (salvo dos cuartas justas).`,
        `${intervalName(issue.before, 'en')} → ${intervalName(issue.after, 'en')}: avoid parallel and forbidden contrary motion, and simultaneous leaps in the same direction (except two perfect fourths).`);
      const s0 = lines[i].SOPRANO, s1 = lines[i + 1].SOPRANO;
      const tonic = spellingToPc(model.tonic);
      if (s0 && s1 && s0.midi % 12 === model.leadingPc && Object.values(group[i + 1].notes).some(n => n.midi % 12 === tonic)
        && !(identified[i]?.degree === 3 && identified[i + 1]?.degree === 4) && s1.midi !== s0.midi + 1) {
        add('CADENCE_LEADING_TONE_SOPRANO', group[i + 1].position, 'La sensible del soprano debe subir a la tónica.', 'The soprano leading tone must rise to the tonic.',
          'Si el siguiente acorde contiene la tónica, sube un semitono (excepto III–IV).', 'If the next chord contains the tonic, rise one semitone (except III–IV).');
      }
    }
  }
  if (keys.size) add('CADENCE_KEYS', 0, `Tonalidades usadas: ${[...keys.keys()].map(m => keyName(m, 'es')).join(', ')}.`, `Keys used: ${[...keys.keys()].map(m => keyName(m, 'en')).join(', ')}.`, '', '', 'info');
  for (const [model, uses] of keys) if (uses.length > 1) add('CADENCE_REPEATED_KEY', uses[1].position,
    `Tonalidad repetida: ${keyName(model, 'es')}.`, `Repeated key: ${keyName(model, 'en')}.`,
    `Cadencias ${uses.map(u => u.number).join(', ')}. Prueba tonalidades distintas; repetir no se penaliza.`,
    `Cadences ${uses.map(u => u.number).join(', ')}. Try different keys; repetition is not penalized.`, 'info');
  const missing = TYPES.filter(t => !seen.has(t));
  if (missing.length) add('CADENCE_MISSING', 0, `Faltan cadencias: ${missing.map(t => NAMES[t][0]).join(', ')}.`, `Missing cadences: ${missing.map(t => NAMES[t][1]).join(', ')}.`, 'Escribe una de cada tipo en cualquier orden.', 'Write one of each type in any order.');
  return out.sort((a, b) => a.position - b.position);
}
