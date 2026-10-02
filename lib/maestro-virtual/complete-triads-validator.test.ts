import { expect, it } from 'vitest';
import type { VoiceData } from './midi-parser';
import { lesson4TriadPattern, TRIAD_ROOTS, TRIAD_VARIANTS, type TriadVariant } from './triads-validator';
import { validateCompleteLesson4Triads } from './complete-triads-validator';

const all = TRIAD_ROOTS.flatMap((root, index) => (Object.keys(TRIAD_VARIANTS) as TriadVariant[]).map(variant => ({ root, variant, base: 48 + index })));
function submission(series = all): VoiceData {
  const data: VoiceData = { ticksPerBeat: 128, keyChanges: [], beats: [], voices: { TENOR: [], ALTO: [], SOPRANO: [] } };
  let tick = 0;
  for (const item of series) for (const chord of lesson4TriadPattern(item.root, item.variant, item.base)) {
    chord.notes.forEach((note, j) => {
      const voice = (['TENOR', 'ALTO', 'SOPRANO'] as const)[j];
      data.voices[voice]!.push({ midi: note.midi, pitch: note.midi % 12, spelling: note.name, tick, key: item.root });
    });
    tick += 128;
  }
  return data;
}
it('recognizes all 72 series even in reversed order', () => {
  expect(validateCompleteLesson4Triads(submission([...all].reverse()))).toEqual([]);
}, 30000);
it('names the exact missing scale and reports duplicates', () => {
  const errors = validateCompleteLesson4Triads(submission([...all.slice(1), all[1]]));
  expect(errors.filter(e => e.rule === 'TRIAD_MISSING_SCALE').map(e => e.titleEs)).toEqual(['Falta C · Mayor natural.']);
  expect(errors.filter(e => e.rule === 'TRIAD_DUPLICATE_SCALE').map(e => e.titleEs)).toEqual(['C · Mayor armónica aparece 2 veces.']);
}, 30000);
it('explains wrong pitches and spellings while recognizing the series', () => {
  const data = submission();
  data.voices.ALTO![10].midi += 1; data.voices.ALTO![10].spelling = 'g#';
  data.voices.SOPRANO![0].spelling = 'f##';
  const errors = validateCompleteLesson4Triads(data);
  expect(errors.some(e => e.rule === 'TRIAD_MISSING_SCALE')).toBe(false);
  expect(errors.some(e => e.rule === 'TRIAD_WRONG_NOTE' && e.titleEs.includes('Mayor armónica') && e.detailEs.includes('Sol'))).toBe(true);
  expect(errors.some(e => e.rule === 'TRIAD_ENHARMONIC')).toBe(true);
}, 30000);
it('a missing chord does not shift recognition of the following series', () => {
  const data = submission();
  for (const notes of Object.values(data.voices)) notes!.splice(10, 1);
  const errors = validateCompleteLesson4Triads(data);
  expect(errors.some(e => e.rule === 'TRIAD_MISSING_CHORD')).toBe(true);
  expect(errors.some(e => e.rule === 'TRIAD_MISSING_SCALE')).toBe(false);
}, 30000);
it('an empty file reports all 72 missing series', () => {
  expect(validateCompleteLesson4Triads(submission([])).filter(e => e.rule === 'TRIAD_MISSING_SCALE')).toHaveLength(72);
});
it('accepts seven-chord melodic descents without repeating the initial tonic', () => {
  const data = submission();
  const omitted = new Set(all.flatMap((item, i) => item.variant === 'MELODIC_MINOR_DESC' ? [i * 8] : []));
  for (const voice of ['TENOR', 'ALTO', 'SOPRANO'] as const) data.voices[voice] = data.voices[voice]!.filter((_, i) => !omitted.has(i));
  expect(validateCompleteLesson4Triads(data)).toEqual([]);
}, 30000);
it('does not invent a variant when the distinguishing chord is missing', () => {
  // Natural and harmonic major differ at II, IV and VI.
  // With II/IV/VI damaged identically, the series is ambiguous.
  const data = submission([all[0]]);
  data.voices.SOPRANO![1].midi = 58; // II: quinta fuera de ambas formas
  data.voices.ALTO![3].midi = 58; // IV: tercera fuera de ambas formas
  data.voices.TENOR![5].midi = 58; // VI: fundamental fuera de ambas formas
  const errors = validateCompleteLesson4Triads(data);
  expect(errors.some(e => e.rule === 'TRIAD_AMBIGUOUS_SCALE' || e.rule === 'TRIAD_UNRECOGNIZED')).toBe(true);
});
it('recognizes the intended tonic despite one wrong first root', () => {
  const data = submission();
  data.voices.TENOR![0].midi++;
  const errors = validateCompleteLesson4Triads(data);
  expect(errors.some(e => e.rule === 'TRIAD_MISSING_SCALE')).toBe(false);
  expect(errors.some(e => e.rule === 'TRIAD_WRONG_NOTE' && e.position === 1)).toBe(true);
}, 30000);
it('reports a missing note rather than discarding a recognizable series', () => {
  const data = submission();
  data.voices.ALTO!.splice(2, 1);
  const errors = validateCompleteLesson4Triads(data);
  expect(errors.some(e => e.rule === 'TRIAD_NOTE_COUNT')).toBe(true);
  expect(errors.some(e => e.rule === 'TRIAD_MISSING_SCALE')).toBe(false);
}, 30000);
