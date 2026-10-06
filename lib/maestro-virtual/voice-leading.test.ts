import { describe, expect, it } from 'vitest';
import { parseSpelling } from './spelling';
import { checkHarmonicMotion, checkMelodicLine, classifyMelodic, intervalBetween, intervalName, type Pitch } from './voice-leading';

const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** 'F#4' → Pitch (Do4 = 60). */
export function pitch(name: string): Pitch {
  const [, letter, acc, octave] = name.match(/^([A-Ga-g])(##|bb|#|b)?(-?\d)$/)!;
  const alter = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 }[acc ?? '']!;
  return { midi: 12 * (Number(octave) + 1) + PC[letter.toLowerCase()] + alter, spelling: parseSpelling(letter.toLowerCase() + (acc ?? ''))! };
}
const iv = (a: string, b: string) => intervalBetween(pitch(a), pitch(b));
const line = (s: string) => s.split(' ').map(pitch);
const rules = (s: string, leadingPc = 11, allowRepeat = false) =>
  checkMelodicLine(line(s), { leadingPc, allowRepeat }).map(i => `${i.rule}@${i.index}`);

describe('intervalos por grafía', () => {
  it('nombra intervalos simples y compuestos', () => {
    expect(intervalName(iv('C4', 'E4'), 'es')).toBe('3a mayor');
    expect(intervalName(iv('E4', 'C4'), 'es')).toBe('3a mayor');
    expect(iv('E4', 'C4').direction).toBe(-1);
    expect(intervalName(iv('F4', 'B4'), 'es')).toBe('4a aumentada');
    expect(intervalName(iv('B4', 'F4'), 'es')).toBe('4a aumentada'); // Si↓Fa
    expect(intervalName(iv('B3', 'F4'), 'es')).toBe('5a disminuida');
    expect(intervalName(iv('C4', 'C5'), 'en')).toBe('perfect octave');
    expect(intervalName(iv('C3', 'E4'), 'es')).toBe('10a mayor');
    expect(intervalName(iv('C4', 'C#4'), 'es')).toBe('unísono aumentada');
    expect(intervalName(iv('F#4', 'Gb4'), 'en')).toBe('diminished 2nd');
  });

  it('clasifica según Medrano', () => {
    expect(classifyMelodic(iv('C4', 'D4'))).toBe('step');
    expect(classifyMelodic(iv('C4', 'Eb4'))).toBe('short-path');
    expect(classifyMelodic(iv('C4', 'F4'))).toBe('short-leap');
    expect(classifyMelodic(iv('C4', 'G4'))).toBe('long-leap');
    expect(classifyMelodic(iv('C4', 'Ab4'))).toBe('long-leap');
    expect(classifyMelodic(iv('C4', 'C5'))).toBe('long-leap');
    expect(classifyMelodic(iv('B3', 'F4'))).toBe('diminished');
    expect(classifyMelodic(iv('C#4', 'F4'))).toBe('diminished'); // 4a disminuida
    expect(classifyMelodic(iv('C#4', 'Bb4'))).toBe('diminished'); // 7a disminuida
    expect(classifyMelodic(iv('F4', 'B4'))).toBe('forbidden'); // 4a aumentada
    expect(classifyMelodic(iv('C4', 'B4'))).toBe('forbidden'); // 7a mayor
    expect(classifyMelodic(iv('C4', 'D5'))).toBe('forbidden'); // 9a
    expect(classifyMelodic(iv('Eb4', 'F#4'))).toBe('forbidden'); // 2a aumentada
    expect(classifyMelodic(iv('C4', 'C4'))).toBe('repeat');
  });
});

describe('movimientos melódicos', () => {
  it('acepta una melodía correcta', () => {
    expect(rules('C5 B4 A4 G4 E4 F4 D4 C4')).toEqual([]);
  });
  it('rechaza intervalos no permitidos', () => {
    expect(rules('C4 F4 B4 C5')).toEqual(['MELODIC_FORBIDDEN_INTERVAL@1']);
    expect(rules('C4 B4 C5')).toEqual(['MELODIC_FORBIDDEN_INTERVAL@0']);
  });
  it('nota repetida según la opción', () => {
    expect(rules('C4 C4 D4')).toEqual(['MELODIC_REPEATED_NOTE@0']);
    expect(rules('C4 C4 D4', 11, true)).toEqual([]);
  });
  it('no salta 8a con la sensible', () => {
    expect(rules('C4 B3 B4 C5')).toEqual(['MELODIC_LEADING_TONE_OCTAVE@1']);
    expect(rules('C4 G3 G4 F4')).toEqual([]);
  });
  it('disminuidos con cambio de dirección', () => {
    expect(rules('C5 B4 F4 G4')).toEqual(['MELODIC_FORBIDDEN_INTERVAL@1']); // Si↓Fa no es 5a disminuida: es 4a aumentada
    expect(rules('C5 B4 F5 E5')).toEqual([]); // 5a dis ↑ y luego baja
    expect(rules('C5 B4 F5 G5')).toEqual(['MELODIC_DIMINISHED_UNRESOLVED@1']);
    expect(rules('C5 B4 F5')).toEqual(['MELODIC_DIMINISHED_UNRESOLVED@1']);
    expect(rules('C5 F5 B4 C5')).toEqual([]); // Fa↓Si 5a dis, sube
    expect(rules('C5 F5 B4 A4')).toEqual(['MELODIC_DIMINISHED_UNRESOLVED@1']);
  });
  it('saltos sucesivos en la misma dirección', () => {
    expect(rules('C4 F4 C5')).toEqual([]); // 4a + 5a
    expect(rules('C4 G4 C5')).toEqual([]); // 5a + 4a
    expect(rules('C5 G4 D4')).toEqual(['MELODIC_SUCCESSIVE_LEAPS@1']); // 4a + 4a
    expect(rules('C4 F4 D5')).toEqual(['MELODIC_SUCCESSIVE_LEAPS@1']); // 4a + 6a
    expect(rules('C4 G4 E4 C5')).toEqual([]); // dirección contraria
    expect(rules('C4 E4 A4')).toEqual([]); // 3a no es salto
  });
});

const V = ['S', 'A', 'T', 'B'] as const;
type Voice = typeof V[number];
const chord = (s: string): Partial<Record<Voice, Pitch>> => {
  const out: Partial<Record<Voice, Pitch>> = {};
  s.split(' ').forEach((n, i) => { if (n !== '-') out[V[i]] = pitch(n); });
  return out;
};
const harm = (a: string, b: string) => checkHarmonicMotion(V, chord(a), chord(b)).map(i => `${i.rule}:${i.upper}${i.lower}`);

describe('movimientos armónicos', () => {
  it('enlace correcto I–IV sin problemas', () => {
    expect(harm('C5 E4 G3 C3', 'C5 F4 A3 F3')).toEqual([]);
  });
  it('8as y 5as paralelas', () => {
    expect(harm('C5 G4 E4 C3', 'D5 A4 F4 D3')).toEqual(expect.arrayContaining(['HARMONIC_PARALLEL_OCTAVES:SB', 'HARMONIC_PARALLEL_FIFTHS:AB']));
    expect(harm('- - G3 C3', '- - A3 D3')).toEqual(['HARMONIC_PARALLEL_FIFTHS:TB']);
    expect(harm('- - C4 C4', '- - D4 D4')).toEqual(['HARMONIC_PARALLEL_OCTAVES:TB']); // unísonos
  });
  it('5as paralelas permitidas si una no es justa', () => {
    expect(harm('- - G3 C3', '- - F3 B2')).toEqual([]); // 5a J → 5a dis
    expect(harm('- - F3 B2', '- - G3 C3')).toEqual([]); // 5a dis → 5a J
  });
  it('8as contrarias siempre; 5as contrarias solo en voces extremas', () => {
    expect(harm('- - C4 C3', '- - G4 G2')).toEqual(['HARMONIC_CONTRARY_OCTAVES:TB']);
    expect(harm('G4 - - C3', 'C5 - - F2')).toEqual(['HARMONIC_CONTRARY_FIFTHS:SB']);
    expect(harm('- - G3 C3', '- - C4 F2')).toEqual([]); // tenor–bajo no son extremas
  });
  it('una voz quieta no forma paralelas', () => {
    expect(harm('- - G3 C3', '- - G3 G2')).toEqual([]);
  });
  it('saltos simultáneos en la misma dirección', () => {
    expect(harm('- E4 - C3', '- A4 - F3')).toEqual([]); // dos 4as justas
    expect(harm('- E4 - C3', '- B4 - G3')).toEqual(['HARMONIC_SIMULTANEOUS_LEAPS:AB']); // dos 5as
    expect(harm('- E4 - C3', '- A4 - G3')).toEqual(['HARMONIC_SIMULTANEOUS_LEAPS:AB']); // 4a + 5a
  });
});
