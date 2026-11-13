import { describe, expect, it } from 'vitest';
import { harmonizeScale } from './music-theory-core';
import { lesson4TriadPattern, validateLesson4Triads, TRIAD_ROOTS, TRIAD_VARIANTS, type TriadVariant } from './triads-validator';
import type { VoiceData } from './midi-parser';

const shapes = {
  MAJOR: [0, 2, 4, 5, 7, 9, 11],
  HARMONIC_MAJOR: [0, 2, 4, 5, 7, 8, 11],
  NATURAL_MINOR: [0, 2, 3, 5, 7, 8, 10],
  HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11],
  MELODIC_MINOR: [0, 2, 3, 5, 7, 9, 11],
};
function submission(root = 'C', variant: TriadVariant = 'MAJOR', base = 48): VoiceData {
  const pattern = lesson4TriadPattern(root, variant, base);
  return { ticksPerBeat: 128, keyChanges: [], beats: [], voices: {
    TENOR: pattern.map((c, i) => ({ midi: c.notes[0].midi, pitch: c.notes[0].midi % 12, spelling: c.notes[0].name, tick: i * 128, key: root })),
    ALTO: pattern.map((c, i) => ({ midi: c.notes[1].midi, pitch: c.notes[1].midi % 12, spelling: c.notes[1].name, tick: i * 128, key: root })),
    SOPRANO: pattern.map((c, i) => ({ midi: c.notes[2].midi, pitch: c.notes[2].midi % 12, spelling: c.notes[2].name, tick: i * 128, key: root })),
  } };
}
describe('Lesson 4: root-position diatonic triads', () => {
  for (const [index, root] of TRIAD_ROOTS.entries()) {
    for (const [variant, offsets] of Object.entries(shapes)) it(`${root} ${variant}: exact thirds and fifths`, () => {
      const chords = harmonizeScale(root, variant);
      expect(chords).toHaveLength(7);
      chords.forEach((chord, degree) => {
        expect(chord.triad.inversion).toBe('ROOT');
        expect(chord.triad.notes.map(n => n.pitch)).toEqual([0, 2, 4].map(k => (index + offsets[(degree + k) % 7]) % 12));
      });
    });
    for (const variant of Object.keys(TRIAD_VARIANTS) as TriadVariant[]) it(`${root} ${variant}: complete series accepted`, () => {
      expect(validateLesson4Triads(submission(root, variant, 48 + index), root, variant)).toEqual([]);
    });
  }
  it('spells the harmonic major III as E G B, not E G# B', () => {
    expect(harmonizeScale('C', 'HARMONIC_MAJOR')[2].triad.notes.map(n => n.nameEn)).toEqual(['E', 'G', 'B']);
  });
  it('distinguishes melodic minor ascent and descent', () => {
    const asc = lesson4TriadPattern('C', 'MELODIC_MINOR', 48);
    const desc = lesson4TriadPattern('C', 'MELODIC_MINOR_DESC', 48);
    expect(asc[5].notes.map(n => n.name)).toEqual(['A', 'C', 'Eb']);
    expect(desc[2].notes.map(n => n.name)).toEqual(['Ab', 'C', 'Eb']);
    expect(desc.map(c => c.notes[0].midi)).toEqual([60, 58, 56, 55, 53, 51, 50, 48]);
  });
  it('rejects wrong pitch, wrong octave, inversion and doubling', () => {
    for (const mutate of [
      (d: VoiceData) => { d.voices.ALTO![2].midi++; },
      (d: VoiceData) => { d.voices.SOPRANO![2].midi += 12; },
      (d: VoiceData) => { d.voices.TENOR![2].midi += 12; },
    ]) {
      const d = submission(); mutate(d);
      expect(validateLesson4Triads(d, 'C', 'MAJOR').some(e => e.rule === 'TRIAD_WRONG_NOTE')).toBe(true);
    }
    const d = submission(); d.voices.BASS = [{ ...d.voices.TENOR![2] }];
    expect(validateLesson4Triads(d, 'C', 'MAJOR').some(e => e.rule === 'TRIAD_NOTE_COUNT')).toBe(true);
  });
  it('rejects wrong spelling, absent spelling, missing chords and staggered onsets', () => {
    const d = submission(); d.voices.SOPRANO![0].spelling = 'f##';
    expect(validateLesson4Triads(d, 'C', 'MAJOR').some(e => e.rule === 'TRIAD_ENHARMONIC')).toBe(true);
    delete d.voices.SOPRANO![0].spelling;
    expect(validateLesson4Triads(d, 'C', 'MAJOR').some(e => e.rule === 'TRIAD_MISSING_SPELLING')).toBe(true);
    d.voices.ALTO![0].tick++;
    expect(validateLesson4Triads(d, 'C', 'MAJOR').some(e => e.rule === 'TRIAD_COUNT')).toBe(true);
  });
  it('rejects a missing closing chord and the wrong selected tonic', () => {
    const d = submission();
    expect(validateLesson4Triads(d, 'D', 'MAJOR').some(e => e.rule === 'TRIAD_TONIC')).toBe(true);
    for (const notes of Object.values(d.voices)) notes?.pop();
    expect(validateLesson4Triads(d, 'C', 'MAJOR').some(e => e.rule === 'TRIAD_COUNT')).toBe(true);
  });
});
