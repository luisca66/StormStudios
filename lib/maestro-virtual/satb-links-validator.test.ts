import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMidiBuffer, type VoiceData } from './midi-parser';
import { SATB_VOICES } from './satb-chords-validator';
import { validateLesson8SatbLinks } from './satb-links-validator';
import { checkHarmonicMotion } from './voice-leading';
import { parseSpelling } from './spelling';

const load = (name = 'Leccion_8_Do_mayor_correcta.mid') => parseMidiBuffer(new Uint8Array(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url))).buffer);
const errors = (d: VoiceData) => validateLesson8SatbLinks(d).filter(f => f.severity === 'error');
const subset = (d: VoiceData, indices: number[]) => ({ ...d, voices: Object.fromEntries(SATB_VOICES.map(v => [v, indices.map((i, j) => ({ ...d.voices[v]![i], tick: j * 256 }))])) });

import { LESSON8_EXPECTED_ERRORS } from './__fixtures__/lesson8-expected-errors';

describe('Lesson 8 independent SATB links', () => {
  it.each(['Leccion_8_Do_mayor_correcta.mid', 'Leccion_8_Sol_mayor_desordenada_correcta.mid'])('accepts %s and audits every voice pair', name => {
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
