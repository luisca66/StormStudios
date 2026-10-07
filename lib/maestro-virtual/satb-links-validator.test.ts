import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMidiBuffer, type VoiceData } from './midi-parser';
import { MAJOR_KEY_MODELS, SATB_VOICES } from './satb-chords-validator';
import { validateLesson8SatbLinks } from './satb-links-validator';
import { checkHarmonicMotion } from './voice-leading';
import { parseSpelling, spellingName } from './spelling';

const load = (name = 'Leccion_8_Do_mayor_correcta.mid') => parseMidiBuffer(new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))).buffer);
const errors = (d: VoiceData) => validateLesson8SatbLinks(d).filter(f => f.severity === 'error');
const subset = (d: VoiceData, indices: number[]) => ({ ...d, voices: Object.fromEntries(SATB_VOICES.map(v => [v, indices.map((i, j) => ({ ...d.voices[v]![i], tick: j * 256 }))])) });

import { LESSON8_EXPECTED_ERRORS } from './__fixtures__/lesson8-expected-errors';

describe('Lesson 8 independent SATB links', () => {
  it('preserves the exact video notes and uses the signature at each pair onset', () => {
    const d = load('Leccion_8_tonalidades_variadas_correcta.mid');
    const expected = [
      [71, 67, 62, 55], [72, 67, 64, 48], [74, 71, 67, 43], [73, 69, 64, 45],
      [76, 67, 60, 48], [77, 69, 60, 41], [72, 67, 63, 48], [72, 69, 65, 41],
      [68, 64, 59, 52], [69, 61, 57, 54], [67, 63, 60, 48], [68, 65, 60, 41],
      [72, 67, 64, 48], [71, 65, 62, 50], [69, 64, 57, 49], [71, 63, 54, 47],
    ];
    for (const [i, chord] of expected.entries()) expect(SATB_VOICES.map(v => d.voices[v]![i].midi)).toEqual(chord);
    expect(d.keyChanges).toEqual(['G', 'D', 'F', 'Bb', 'A', 'Eb', 'C', 'E'].map((key, i) => ({ tick: i * 512, key })));
    const feedback = validateLesson8SatbLinks(d);
    expect(feedback.filter(f => f.rule === 'LINK_INFO').map(f => f.titleEs)).toEqual([
      'Enlace 1 (compás 1): Sol mayor, I–IV (Sol–Do).',
      'Enlace 2 (compás 2): Re mayor, IV–V (Sol–La).',
      'Enlace 3 (compás 3): Fa mayor, V–I (Do–Fa).',
      'Enlace 4 (compás 4): Si bemol mayor, II–V (Do–Fa).',
      'Enlace 5 (compás 5): La mayor, V–VI (Mi–Fa sostenido).',
      'Enlace 6 (compás 6): Mi bemol mayor, VI–II (Do–Fa).',
      'Enlace 7 (compás 7): Do mayor, I–VII6/3 (Do–Si).',
      'Enlace 8 (compás 8): Mi mayor, IV6/3–V (La–Si).',
    ]);
    expect(feedback.some(f => f.rule === 'LINK_REPEATED_KEY')).toBe(false);
  });
  it('warns about repeated keys as information without reducing the score', () => {
    const feedback = validateLesson8SatbLinks(load());
    expect(errors(load())).toEqual([]);
    expect(feedback.find(f => f.rule === 'LINK_REPEATED_KEY')).toMatchObject({ severity: 'info', position: 3 });
    expect(feedback.find(f => f.rule === 'LINK_KEYS')!.titleEs).toBe('Tonalidades usadas: Do mayor.');
  });
  it('resolves the initial-G-only fixture by the armature and remaining assignment', () => {
    const d = load('Leccion_8_sin_armaduras_ambiguo.mid');
    expect(d.keyChanges).toEqual([{ tick: 0, key: 'G' }]);
    expect(errors(d)).toEqual([]);
    const info = validateLesson8SatbLinks(d).filter(f => f.rule === 'LINK_INFO');
    expect(info[0].titleEs).toContain('Sol mayor, I–IV');
    expect(info[2].titleEs).toContain('Fa mayor, V–I');
  });
  it('does not guess when both assigned readings are missing, or invent construction errors', () => {
    const d = load('Leccion_8_sin_armaduras_ambiguo.mid'); d.keyChanges = [];
    const feedback = errors(d);
    expect(feedback.map(f => [f.rule, f.position])).toEqual([
      ['LINK_MISSING', 0], ['LINK_AMBIGUOUS_KEY', 2], ['LINK_AMBIGUOUS_KEY', 6],
    ]);
    expect(feedback[1].titleEs).toContain('I–IV en Sol mayor');
    expect(feedback[1].titleEs).toContain('V–I en Do mayor');
    expect(feedback[2].titleEs).toContain('I–IV en Do mayor o V–I en Fa mayor');
    expect(feedback[2].detailEs).toContain('no se cuenta como confirmado');
    expect(validateLesson8SatbLinks(d).filter(f => f.rule === 'LINK_INFO')).toHaveLength(6);
  });
  it('resolves remaining readings independently of pair order, even before the confirming link', () => {
    const d = subset(load('Leccion_8_sin_armaduras_ambiguo.mid'), [4, 5, 0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(errors(d)).toEqual([]);
    expect(validateLesson8SatbLinks(d).find(f => f.rule === 'LINK_INFO')!.titleEs).toContain('Fa mayor, V–I');
  });
  it('reports ambiguity when neither candidate fills a missing assignment', () => {
    const d = subset(load(), [0, 1, 4, 5, 0, 1]);
    d.keyChanges = [{ tick: 0, key: 'C' }, { tick: 1024, key: 'D' }];
    expect(errors(d)).toContainEqual(expect.objectContaining({ rule: 'LINK_AMBIGUOUS_KEY', position: 6 }));
    expect(errors(d).some(f => f.rule === 'LINK_DUPLICATE')).toBe(false);
  });
  it('does not use a signature that starts after the first chord of the pair', () => {
    const d = subset(load(), [0, 1]); d.keyChanges = [{ tick: 256, key: 'F' }];
    expect(errors(d)).toContainEqual(expect.objectContaining({ rule: 'LINK_AMBIGUOUS_KEY', position: 2 }));
    d.keyChanges = [{ tick: 0, key: 'F' }];
    expect(validateLesson8SatbLinks(d).find(f => f.rule === 'LINK_INFO')!.titleEs).toContain('Fa mayor, V–I');
  });
  it('recognizes all 15 major keys from spellings without a signature', () => {
    for (const model of MAJOR_KEY_MODELS) {
      const d = subset(load(), [12, 13]); d.keyChanges = [];
      const shift = model.triads[0][0].pc;
      const scale = [0, 2, 4, 5, 7, 9, 11].map(pc => {
        const degree = [0, 2, 4, 5, 7, 9, 11].indexOf(pc);
        return model.triads[degree][0].spelling;
      });
      for (const notes of Object.values(d.voices)) for (const n of notes!) {
        const sp = scale[[0, 2, 4, 5, 7, 9, 11].indexOf(n.midi % 12)];
        n.midi += shift; n.pitch = n.midi % 12;
        n.spelling = sp.letter + ({ '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' }[String(sp.alter)]);
      }
      const feedback = validateLesson8SatbLinks(d);
      expect(feedback.find(f => f.rule === 'LINK_INFO')!.titleEs).toContain(`${spellingName(model.tonic, 'es')} mayor, I–VII6/3`);
      expect(feedback.some(f => ['LINK_AMBIGUOUS_KEY', 'LINK_UNASSIGNED', 'SATB_ENHARMONIC'].includes(f.rule))).toBe(false);
    }
  });
  it('checks the local leading tone instead of the initial key leading tone', () => {
    const d = load('Leccion_8_tonalidades_variadas_correcta.mid');
    // The fifth pair is in A: G# is its leading tone, rather than G's F#.
    d.voices.ALTO![8] = { ...d.voices.ALTO![8], midi: 68, pitch: 8, spelling: 'g#' };
    expect(errors(d)).toContainEqual(expect.objectContaining({ rule: 'SATB_LEADING_TONE_DOUBLED', position: 9 }));
    const octave = load('Leccion_8_tonalidades_variadas_correcta.mid');
    octave.voices.SOPRANO![9] = { ...octave.voices.SOPRANO![9], midi: 80, pitch: 8, spelling: 'g#' };
    expect(errors(octave)).toContainEqual(expect.objectContaining({ rule: 'MELODIC_LEADING_TONE_OCTAVE', position: 10 }));
  });
  it.each(['Leccion_8_Do_mayor_correcta.mid', 'Leccion_8_tonalidades_variadas_correcta.mid'])('accepts %s and audits every voice pair', name => {
    const d = load(name), feedback = validateLesson8SatbLinks(d);
    expect(errors(d)).toEqual([]);
    expect(feedback.filter(f => f.rule === 'LINK_INFO')).toHaveLength(8);
    expect(feedback.filter(f => f.rule === 'LINK_INFO').every(f => f.detailEs.includes('Estado:') && f.detailEn.includes('Melodic position:'))).toBe(true);
    expect(d.ticksPerBeat).toBe(128);
    for (let i = 0; i < 16; i += 2) {
      const chord = (index: number) => Object.fromEntries(SATB_VOICES.map(v => {
        const n = d.voices[v]![index];
        return [v, { midi: n.midi, spelling: parseSpelling(n.spelling)! }];
      }));
      expect(checkHarmonicMotion(SATB_VOICES, chord(i), chord(i + 1))).toEqual([]);
      // Independent numeric audit of perfect fifths and octave classes.
      for (let u = 0; u < 4; u++) for (let l = u + 1; l < 4; l++) {
        const upper = d.voices[SATB_VOICES[u]]!, lower = d.voices[SATB_VOICES[l]]!;
        const du = Math.sign(upper[i + 1].midi - upper[i].midi), dl = Math.sign(lower[i + 1].midi - lower[i].midi);
        if (!du || !dl) continue;
        const before = (upper[i].midi - lower[i].midi) % 12, after = (upper[i + 1].midi - lower[i + 1].midi) % 12;
        expect(before === 0 && after === 0).toBe(false);
        if (du === dl || (u === 0 && l === 3)) expect(before === 7 && after === 7).toBe(false);
      }
    }
  });
  it('reports exactly the documented error positions', () => {
    const feedback = errors(load('Leccion_8_Re_mayor_errores.mid'));
    expect(feedback.map(f => [f.rule, f.position])).toEqual(LESSON8_EXPECTED_ERRORS);
    expect(feedback.find(f => f.rule === 'LINK_MISSING')!.titleEs).toContain('II–V, IV6/3–V');
  });
  it('counts only exact assigned inversions, reports duplicates and all missing links', () => {
    const d = load();
    const feedback = errors(subset(d, [0, 1, 0, 1]));
    expect(feedback).toContainEqual(expect.objectContaining({ rule: 'LINK_DUPLICATE', position: 4 }));
    expect(feedback.find(f => f.rule === 'LINK_MISSING')!.titleEs).not.toContain('I–IV,');
  });
  it('reviews complete pairs and construction of an odd final chord', () => {
    const d = subset(load(), [0, 1, 2]);
    d.voices.SOPRANO![2].midi = 84;
    expect(errors(d)).toContainEqual(expect.objectContaining({ rule: 'SATB_RANGE', position: 3 }));
    expect(errors(d).find(f => f.rule === 'LINK_CHORD_COUNT')!.detailEs).toContain('impar');
    expect(validateLesson8SatbLinks(d).filter(f => f.rule === 'LINK_INFO')).toHaveLength(1);
  });
  it('does not evaluate movements across pair boundaries or rhythm', () => {
    const d = load();
    for (const notes of Object.values(d.voices)) notes!.forEach((n, i) => n.tick = i * i * 101);
    expect(errors(d)).toEqual([]);
    const chord = (index: number) => Object.fromEntries(SATB_VOICES.map(v => [v, { midi: d.voices[v]![index].midi, spelling: parseSpelling(d.voices[v]![index].spelling)! }]));
    expect([1, 3, 5, 7, 9, 11, 13].some(i => checkHarmonicMotion(SATB_VOICES, chord(i), chord(i + 1)).length > 0)).toBe(true);
  });
  it('reports missing voices, extra notes, absent spellings, empty and oversized files', () => {
    const d = load(); d.voices.ALTO!.shift(); d.voices.TENOR!.push({ ...d.voices.TENOR![2] }); delete d.voices.SOPRANO![4].spelling;
    expect(errors(d).map(f => f.rule)).toEqual(expect.arrayContaining(['SATB_MISSING_VOICE', 'SATB_VOICE_NOTES', 'SATB_MISSING_SPELLING', 'LINK_UNRECOGNIZED']));
    expect(errors({ ...d, voices: {} }).map(f => f.rule)).toEqual(['SATB_NO_CHORDS', 'LINK_CHORD_COUNT', 'LINK_MISSING']);
    expect(errors(subset(load(), Array.from({ length: 65 }, (_, i) => i % 16))).map(f => f.rule)).toEqual(['SATB_FILE_LIMIT']);
  });
  it('explains why an isolated diminished interval cannot be compensated', () => {
    const d = load();
    d.voices.SOPRANO![0] = { ...d.voices.SOPRANO![0], midi: 65, pitch: 5, spelling: 'f' };
    d.voices.SOPRANO![1] = { ...d.voices.SOPRANO![1], midi: 71, pitch: 11, spelling: 'b' };
    const diminished = errors(d).find(f => f.rule === 'MELODIC_DIMINISHED_UNRESOLVED');
    // F up to B is augmented; B up to F is diminished.
    d.voices.SOPRANO![0].midi = 71; d.voices.SOPRANO![0].spelling = 'b';
    d.voices.SOPRANO![1].midi = 77; d.voices.SOPRANO![1].spelling = 'f';
    expect(diminished).toBeUndefined();
    expect(errors(d).find(f => f.rule === 'MELODIC_DIMINISHED_UNRESOLVED')!.detailEs).toContain('no hay nota siguiente');
  });
  it('exempts III–IV from the soprano leading-tone resolution rule', () => {
    const d = subset(load(), [0, 1]);
    const names = [['b', 'g', 'e', 'e'], ['a', 'f', 'c', 'f']];
    const midis = [[71, 67, 64, 52], [69, 65, 60, 53]];
    SATB_VOICES.forEach((v, j) => d.voices[v]!.forEach((n, i) => { n.midi = midis[i][j]; n.spelling = names[i][j]; n.pitch = n.midi % 12; }));
    expect(errors(d).some(f => f.rule === 'LINK_LEADING_TONE_SOPRANO')).toBe(false);
    expect(errors(d).some(f => f.rule === 'LINK_UNASSIGNED')).toBe(true);
  });
});
