import { describe, expect, it } from 'vitest';
import { validateLesson9Cadences } from './cadences-validator';
import { MAJOR_KEY_MODELS, SATB_VOICES } from './satb-chords-validator';
import type { VoiceData } from './midi-parser';
import { getLessonConfig } from '@/data/course/lessons/lesson-configs';
import { lesson } from '@/data/course/lessons/10-leccion-9';

const authentic = [[71, 67, 62, 43], [72, 67, 64, 48]];
const plagal = [[72, 69, 60, 53], [72, 67, 64, 48]];
const complete = [[69, 65, 62, 53], [67, 62, 59, 55], [67, 64, 60, 48]];
const extended = [[69, 65, 60, 53], [67, 64, 60, 55], [67, 62, 59, 55], [67, 64, 60, 48]];
const patterns = [authentic, plagal, complete, extended];
function fixture(order = [0, 1, 2, 3], keys = ['C', 'D', 'Eb', 'E']): VoiceData {
  const d: VoiceData = { ticksPerBeat: 960, voices: {}, keyChanges: [], beats: [] };
  let tick = 0;
  order.forEach(which => {
    const model = MAJOR_KEY_MODELS.find(m => m.key === keys[which % keys.length])!;
    const shift = model.triads[0][0].pc;
    if (d.keyChanges.at(-1)?.key !== model.key) d.keyChanges.push({ tick, key: model.key });
    patterns[which].forEach(chord => {
      SATB_VOICES.forEach((v, vi) => {
        const midi = chord[vi] + shift;
        const sp = model.triads.flat().find(t => t.pc === midi % 12)!.spelling;
        (d.voices[v] ??= []).push({ midi, pitch: midi % 12, key: model.key, tick, durationTicks: 1920,
          spelling: sp.letter + (sp.alter < 0 ? 'b'.repeat(-sp.alter) : '#'.repeat(sp.alter)) });
      });
      tick += 1920;
    });
    tick = Math.ceil(tick / 3840) * 3840;
  });
  return d;
}
const errors = (d: VoiceData) => validateLesson9Cadences(d).filter(f => f.severity === 'error');
const rules = (d: VoiceData) => errors(d).map(f => f.rule);

describe('Lesson 9 cadences', () => {
  it.each([[0, 1, 2, 3], [3, 2, 0, 1]])('accepts all four types in order %j without cross-cadence motion', (...order) => {
    const d = fixture(order);
    expect(errors(d)).toEqual([]);
    const info = validateLesson9Cadences(d).filter(f => f.rule === 'CADENCE_INFO');
    expect(info).toHaveLength(4);
    expect(info.every(f => f.detailEs.includes('Estado:') && f.detailEn.includes('Melodic position:'))).toBe(true);
  });
  it('segments four cadences sharing a single unchanged signature', () => {
    const d = fixture(undefined, ['C']);
    expect(d.keyChanges).toHaveLength(1);
    expect(errors(d)).toEqual([]);
    expect(validateLesson9Cadences(d).filter(f => f.rule === 'CADENCE_INFO')).toHaveLength(4);
    expect(validateLesson9Cadences(d)).toContainEqual(expect.objectContaining({ rule: 'CADENCE_REPEATED_KEY', severity: 'info' }));
  });
  it('rejects V6/3 in the authentic cadence and explains the final inversions', () => {
    const d = fixture();
    d.voices.BASS![0] = { ...d.voices.BASS![0], midi: 47, pitch: 11, spelling: 'b' };
    expect(rules(d)).toEqual(expect.arrayContaining(['CADENCE_FINAL_INVERSION', 'CADENCE_UNRECOGNIZED', 'CADENCE_MISSING']));
    expect(errors(d).find(f => f.rule === 'CADENCE_FINAL_INVERSION')!.detailEs).toContain('V6/3–I');
  });
  it('rejects a weak I6/4 and quarter-note durations', () => {
    const d = fixture([3], ['C']);
    SATB_VOICES.forEach(v => { d.voices[v]![0].durationTicks = 960; d.voices[v]![1].tick = 960; });
    expect(rules(d)).toEqual(expect.arrayContaining(['CADENCE_SIX_FOUR_WEAK_BEAT', 'CADENCE_DURATION']));
  });
  it('checks perfect parallels and soprano leading-tone resolution', () => {
    const d = fixture();
    d.voices.SOPRANO![0] = { ...d.voices.SOPRANO![0], midi: 74, pitch: 2, spelling: 'd' };
    d.voices.SOPRANO![1] = { ...d.voices.SOPRANO![1], midi: 79, pitch: 7, spelling: 'g' };
    expect(rules(d)).toContain('HARMONIC_PARALLEL_FIFTHS');
    const leading = fixture();
    leading.voices.SOPRANO![1] = { ...leading.voices.SOPRANO![1], midi: 67, pitch: 7, spelling: 'g' };
    expect(rules(leading)).toContain('CADENCE_LEADING_TONE_SOPRANO');
  });
  it('reports duplicated and missing types, never counts an invalid inversion', () => {
    const d = fixture([0, 0, 2, 3]);
    expect(rules(d)).toEqual(expect.arrayContaining(['CADENCE_DUPLICATE', 'CADENCE_MISSING']));
    expect(errors(d).find(f => f.rule === 'CADENCE_MISSING')!.titleEs).toContain('plagal');
  });
  it('does not guess an enharmonic key without a deciding signature or spelling', () => {
    const d = fixture([0], ['F#']);
    d.keyChanges = [];
    Object.values(d.voices).flat().forEach(n => { delete n!.spelling; });
    expect(rules(d)).toContain('CADENCE_AMBIGUOUS_KEY');
    expect(validateLesson9Cadences(d).filter(f => f.rule === 'CADENCE_INFO')).toHaveLength(0);
  });
  it('honors the opening signature instead of silently choosing another key', () => {
    const d = fixture([0], ['C']); d.keyChanges = [{ tick: 0, key: 'D' }];
    expect(rules(d)).toContain('CADENCE_UNRECOGNIZED');
    expect(validateLesson9Cadences(d).find(f => f.rule === 'CADENCE_INFO')!.titleEs).toContain('Re mayor');
  });
  it('allows a whole-note closing tonic and other permitted I6/4 doublings', () => {
    const d = fixture();
    SATB_VOICES.forEach(v => d.voices[v]!.at(-1)!.durationTicks = 3840);
    expect(errors(d)).toEqual([]);
    const doubledRoot = fixture([3], ['C']);
    doubledRoot.voices.SOPRANO![1] = { ...doubledRoot.voices.SOPRANO![1], midi: 72, pitch: 0, spelling: 'c' };
    expect(rules(doubledRoot).filter(r => r.startsWith('SATB_'))).toEqual([]);
  });
  it('handles missing voices, empty files and the safety limit', () => {
    const d = fixture(); d.voices.ALTO!.shift();
    expect(rules(d)).toContain('SATB_MISSING_VOICE');
    expect(rules({ ...d, voices: {} })).toEqual(expect.arrayContaining(['CADENCE_NO_CHORDS', 'CADENCE_CHORD_COUNT', 'CADENCE_MISSING']));
    const large = fixture(Array(33).fill(0), ['C']);
    expect(rules(large)).toEqual(['CADENCE_FILE_LIMIT']);
  });
  it.each([
    [2, [69, 65, 62, 50]], // II
    [2, [69, 65, 60, 53]], // IV
    [2, [69, 65, 60, 45]], // IV6/3
    [2, [69, 64, 60, 45]], // VI
    [3, [69, 65, 62, 50]], // II
    [3, [69, 65, 62, 53]], // II6/3
    [3, [69, 65, 60, 45]], // IV6/3
  ])('recognizes the permitted opening of pattern %i: %j', (pattern, notes) => {
    const d = fixture([pattern], ['C']);
    SATB_VOICES.forEach((v, i) => {
      const midi = notes[i];
      const spelling = MAJOR_KEY_MODELS[0].triads.flat().find(t => t.pc === midi % 12)!.spelling.letter;
      d.voices[v]![0] = { ...d.voices[v]![0], midi, pitch: midi % 12, spelling };
    });
    expect(rules(d)).not.toContain('CADENCE_UNRECOGNIZED');
  });
  it('keeps a diminished interval with its compensating third note inside the cadence', () => {
    const d = fixture([2], ['C']);
    [71, 77, 76].forEach((midi, i) => {
      d.voices.SOPRANO![i] = { ...d.voices.SOPRANO![i], midi, pitch: midi % 12, spelling: ['b', 'f', 'e'][i] };
    });
    expect(rules(d)).not.toContain('MELODIC_DIMINISHED_UNRESOLVED');
    d.voices.SOPRANO![2] = { ...d.voices.SOPRANO![2], midi: 79, pitch: 7, spelling: 'g' };
    expect(rules(d)).toContain('MELODIC_DIMINISHED_UNRESOLVED');
  });
  it('recovers a cadence after silence even when the preceding sequence is unrecognized', () => {
    const d = fixture([0, 1], ['C']);
    SATB_VOICES.forEach(v => { d.voices[v]![1].durationTicks = 960; });
    d.voices.BASS![0] = { ...d.voices.BASS![0], midi: 48, pitch: 0, spelling: 'c' };
    expect(validateLesson9Cadences(d).filter(f => f.rule === 'CADENCE_INFO')).toHaveLength(2);
    expect(validateLesson9Cadences(d).filter(f => f.rule === 'CADENCE_INFO')[1].titleEs).toContain('plagal IV–I');
  });
  it('registers the lesson, exercise and all emitted rules', () => {
    const config = getLessonConfig(lesson.id)!;
    expect(config).toMatchObject({ validator: 'cadences', voiceCount: 4 });
    expect(lesson.status).toBe('published');
    expect(lesson.exercise).toMatchObject({ type: 'four-voice-chorale', voiceCount: 4, minChords: 11, maxChords: 11 });
    for (const f of validateLesson9Cadences(fixture())) expect(config.activeRules).toContain(f.rule);
  });
});
