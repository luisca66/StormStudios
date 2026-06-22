import { describe, it, expect } from 'vitest';
import { validateLesson1Scales } from './scale-validator';
import type { VoiceData, ParsedNote } from './midi-parser';
import {
  parseSpelling,
  spellingToPc,
  spellWithLetter,
  letterIndex,
  type Spelling,
} from './spelling';

// Las 15 escalas mayores en el orden que espera la lección.
const LESSON1_ORDER = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#',
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
];

const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12]; // semitonos I..I'

const tokenOf = (s: Spelling): string =>
  s.letter + (s.alter === 2 ? '##' : s.alter === 1 ? '#' : s.alter === -1 ? 'b' : s.alter === -2 ? 'bb' : '');

/** Construye las 8 notas correctas (midi + grafía) de una escala mayor. */
function buildMajorScale(keyRoot: string): { midi: number; sp: string }[] {
  const tonic = parseSpelling(keyRoot.toLowerCase())!;
  const tonicPc = spellingToPc(tonic);
  const tonicLetterIdx = letterIndex(tonic.letter);
  const baseMidi = 60 + tonicPc;
  return MAJOR_STEPS.map((st, i) => {
    const pc = (tonicPc + st) % 12;
    const sp = spellWithLetter(tonicLetterIdx + i, pc);
    return { midi: baseMidi + st, sp: tokenOf(sp) };
  });
}

const SCALE_SPAN = 1024; // ticks por escala
const NOTE_GAP = 128;    // ticks entre notas

/** VoiceData con las 15 escalas mayores correctas (como lo exportaría el secuenciador). */
function buildCorrectVoiceData(): VoiceData {
  const soprano: ParsedNote[] = [];
  const keyChanges = LESSON1_ORDER.map((key, s) => ({ tick: s * SCALE_SPAN, key }));

  LESSON1_ORDER.forEach((key, s) => {
    const scale = buildMajorScale(key);
    scale.forEach((n, i) => {
      soprano.push({
        midi: n.midi,
        pitch: n.midi % 12,
        tick: s * SCALE_SPAN + i * NOTE_GAP,
        key,
        spelling: n.sp,
      });
    });
  });

  return { ticksPerBeat: 128, keyChanges, voices: { SOPRANO: soprano }, beats: [] };
}

describe('validateLesson1Scales — grafía enarmónica', () => {
  it('acepta las 15 escalas correctas sin errores', () => {
    const errors = validateLesson1Scales(buildCorrectVoiceData());
    expect(errors).toEqual([]);
  });

  it('RECHAZA La## en lugar de Si en Do mayor (el bug reportado)', () => {
    const vd = buildCorrectVoiceData();
    // Grado VII de Do mayor (índice 6 de la primera escala) = Si (midi 71).
    const viiNote = vd.voices.SOPRANO![6];
    expect(viiNote.midi).toBe(71);     // misma altura...
    viiNote.spelling = 'a##';          // ...pero grafía equivocada (La##)

    const errors = validateLesson1Scales(vd);

    const enh = errors.filter(e => e.rule === 'SCALE_ENHARMONIC');
    expect(enh).toHaveLength(1);
    expect(enh[0].position).toBe(1);   // primera escala (Do mayor)
    expect(enh[0].degree).toBe('VII');
    expect(enh[0].detailEs).toContain('La doble sostenido');
    expect(enh[0].detailEs).toContain('Si');

    // No debe duplicarse como "nota incorrecta" (la altura sí coincide).
    expect(errors.some(e => e.rule === 'SCALE_WRONG_NOTE')).toBe(false);
  });

  it('una altura realmente incorrecta sigue dando SCALE_WRONG_NOTE (no enarmónico)', () => {
    const vd = buildCorrectVoiceData();
    const viiNote = vd.voices.SOPRANO![6];
    viiNote.midi = 70;                 // Sib (pc 10) en vez de Si (pc 11)
    viiNote.pitch = 70 % 12;
    viiNote.spelling = 'bb';

    const errors = validateLesson1Scales(vd);
    expect(errors.some(e => e.rule === 'SCALE_WRONG_NOTE')).toBe(true);
    expect(errors.some(e => e.rule === 'SCALE_ENHARMONIC')).toBe(false);
  });

  it('sin grafía incrustada (MIDI antiguo) no inventa errores de grafía', () => {
    const vd = buildCorrectVoiceData();
    for (const n of vd.voices.SOPRANO!) delete n.spelling;
    const errors = validateLesson1Scales(vd);
    expect(errors).toEqual([]);
  });
});

describe('validateLesson1Scales — orden libre y completitud', () => {
  function buildForKeys(keys: string[]): VoiceData {
    const soprano: ParsedNote[] = [];
    const keyChanges = keys.map((key, s) => ({ tick: s * SCALE_SPAN, key }));
    keys.forEach((key, s) => {
      buildMajorScale(key).forEach((n, i) => {
        soprano.push({
          midi: n.midi,
          pitch: n.midi % 12,
          tick: s * SCALE_SPAN + i * NOTE_GAP,
          key,
          spelling: n.sp,
        });
      });
    });
    return { ticksPerBeat: 128, keyChanges, voices: { SOPRANO: soprano }, beats: [] };
  }

  it('acepta las 15 escalas en orden inverso (el orden ya no importa)', () => {
    const errors = validateLesson1Scales(buildForKeys([...LESSON1_ORDER].reverse()));
    expect(errors).toEqual([]);
  });

  it('reporta la escala faltante (Mib) si solo hay 14', () => {
    const errors = validateLesson1Scales(buildForKeys(LESSON1_ORDER.filter(k => k !== 'Eb')));
    expect(errors.some(e => e.rule === 'SCALE_MISSING_KEY' && e.titleEs.includes('Mib'))).toBe(true);
  });

  it('reporta duplicado si una escala aparece dos veces', () => {
    const keys = LESSON1_ORDER.filter(k => k !== 'Cb').concat('C'); // C duplicada, falta Dob
    const errors = validateLesson1Scales(buildForKeys(keys));
    expect(errors.some(e => e.rule === 'SCALE_DUPLICATE_KEY')).toBe(true);
    expect(errors.some(e => e.rule === 'SCALE_COUNT')).toBe(false); // siguen siendo 15
  });
});
