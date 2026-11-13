import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMidiBuffer } from './midi-parser';
import type { VoiceData } from './midi-parser';
import { validateLesson7MelodicLine } from './melodic-lines-validator';
import type { SatbVoice } from './satb-chords-validator';

const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
function note(name: string) {
  const [, letter, acc, octave] = name.match(/^([A-Ga-g])(##|bb|#|b)?(-?\d)$/)!;
  const alter = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 }[acc ?? '']!;
  return { midi: 12 * (Number(octave) + 1) + PC[letter.toLowerCase()] + alter, spelling: letter.toLowerCase() + (acc ?? '') };
}
/** Melodía en cuartos (960 PPQ) en una voz. */
function melody(voice: SatbVoice, notes: string, key = 'C', extra: Partial<Record<SatbVoice, string>> = {}): VoiceData {
  const data: VoiceData = { ticksPerBeat: 960, keyChanges: [{ tick: 0, key }], beats: [], voices: {} };
  for (const [v, text] of Object.entries({ [voice]: notes, ...extra }) as [SatbVoice, string][]) {
    data.voices[v] = text.split(' ').map((name, i) => { const n = note(name); return { midi: n.midi, pitch: n.midi % 12, spelling: n.spelling, tick: i * 960, key }; });
  }
  return data;
}
const run = (d: VoiceData) => validateLesson7MelodicLine(d);
const errors = (d: VoiceData) => run(d).filter(f => f.severity === 'error').map(f => `${f.rule}@${f.position}`);

// Las cuatro melodías correctas (también se exportan como MIDI de prueba).
export const CORRECT = {
  SOPRANO: { key: 'C', notes: 'C5 B4 A4 G4 E4 F4 D4 C4' },
  ALTO: { key: 'G', notes: 'G4 D4 E4 C4 A3 B3 F#4 G4' },
  TENOR: { key: 'D', notes: 'D4 A3 B3 G3 C#3 E3 C#3 D3' },
  BASS: { key: 'Bb', notes: 'Bb2 D3 F3 Eb3 C3 F2 A2 Bb2' },
} as const;

describe('Lección 7 — melodías por voz', () => {
  for (const [voice, m] of Object.entries(CORRECT) as [SatbVoice, { key: string; notes: string }][]) {
    it(`acepta la melodía correcta de ${voice}`, () => {
      const fb = run(melody(voice, m.notes, m.key));
      expect(fb.filter(f => f.severity === 'error')).toEqual([]);
      expect(fb[0].rule).toBe('MELODY_KEY');
    });
  }

  it('reconoce voz y tonalidad', () => {
    const fb = run(melody('TENOR', CORRECT.TENOR.notes, 'D'));
    expect(fb[0].titleEs).toBe('Voz: tenor. Tonalidad reconocida: Re mayor.');
    expect(fb.find(f => f.rule === 'MELODY_SUMMARY')!.detailEs).toContain('5a disminuida ↓ (intervalo disminuido)');
  });

  it('reporta cada regla melódica con sus notas', () => {
    // Fa↑Si (4a aum), nota repetida, Si↑Fa 5a dis sin compensar al final.
    expect(errors(melody('SOPRANO', 'C5 F4 B4 B4 A4 G4 B4 C5'))).toEqual(['MELODIC_FORBIDDEN_INTERVAL@3', 'MELODIC_REPEATED_NOTE@4']);
    expect(errors(melody('SOPRANO', 'C5 A4 B4 F5 G5 E5 D5 C5'))).toEqual(['MELODIC_DIMINISHED_UNRESOLVED@4']);
    expect(errors(melody('SOPRANO', 'C4 G4 D5 B4 A4 F4 D4 C4'))).toEqual(['MELODIC_SUCCESSIVE_LEAPS@3']);
    expect(errors(melody('TENOR', 'C4 B3 B2 D3 E3 F3 D3 C3'))).toEqual(['MELODIC_LEADING_TONE_OCTAVE@3']);
  });

  it('tónica al inicio y al final', () => {
    expect(errors(melody('SOPRANO', 'C5 B4 A4 G4 E4 F4 D4 E4'))).toEqual(['MELODY_END_TONIC@8']);
    expect(errors(melody('SOPRANO', 'E4 D4 E4 F4 G4 A4 B4 C5'))).toEqual(['MELODY_START_TONIC@1']);
  });

  it('número de notas', () => {
    expect(errors(melody('SOPRANO', 'C5 B4 A4 G4 A4 B4 C5'))).toEqual(['MELODY_NOTE_COUNT@0']);
  });

  it('tesitura de la voz', () => {
    expect(errors(melody('BASS', 'C3 B2 A2 G2 E2 F2 D2 C2'))).toEqual(['MELODY_RANGE@5', 'MELODY_RANGE@7', 'MELODY_RANGE@8']);
    expect(errors(melody('SOPRANO', 'C5 D5 E5 F5 G5 A5 G5 C5'))).toEqual(['MELODY_RANGE@6']);
  });

  it('notas ajenas y grafías', () => {
    expect(errors(melody('SOPRANO', 'C5 B4 A4 G4 F#4 E4 D4 C4'))).toEqual(['MELODY_FOREIGN_NOTE@5']);
    expect(errors(melody('ALTO', 'G4 D4 E4 C4 A3 B3 Gb4 G4', 'G'))).toEqual(['MELODY_ENHARMONIC@7']);
  });

  it('con armadura de Sol y Fa natural, la tonalidad es Sol con nota ajena', () => {
    const fb = run(melody('ALTO', 'G4 D4 E4 C4 A3 B3 F4 G4', 'G'));
    expect(fb[0].titleEs).toContain('Sol mayor');
    expect(fb.filter(f => f.severity === 'error').map(f => f.rule)).toContain('MELODY_FOREIGN_NOTE');
  });

  it('una sola voz por archivo y una nota a la vez', () => {
    expect(errors(melody('SOPRANO', CORRECT.SOPRANO.notes, 'C', { BASS: 'C3 D3' }))).toEqual(['MELODY_SEVERAL_VOICES@0']);
    const d = melody('SOPRANO', CORRECT.SOPRANO.notes);
    d.voices.SOPRANO!.push({ ...d.voices.SOPRANO![1] , midi: 72 });
    expect(errors(d)).toEqual(['MELODY_SIMULTANEOUS_NOTES@3']);
    expect(errors({ ...d, voices: {} })).toEqual(['MELODY_NO_NOTES@0']);
  });
});

describe('Lección 7 — MIDI de ejemplo con el formato de Storm Sequencer', () => {
  const check = (file: string) => {
    const bytes = readFileSync(new URL(`./__fixtures__/${file}`, import.meta.url));
    return validateLesson7MelodicLine(parseMidiBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  };
  const errs = (file: string) => check(file).filter(f => f.severity === 'error').map(f => `${f.rule}@${f.position}`);

  it('acepta las cuatro melodías correctas', () => {
    for (const [file, title] of [
      ['Leccion_7_Soprano_Do_mayor_correcta.mid', 'Voz: soprano. Tonalidad reconocida: Do mayor.'],
      ['Leccion_7_Contralto_Sol_mayor_correcta.mid', 'Voz: contralto. Tonalidad reconocida: Sol mayor.'],
      ['Leccion_7_Tenor_Re_mayor_correcta.mid', 'Voz: tenor. Tonalidad reconocida: Re mayor.'],
      ['Leccion_7_Bajo_Sib_mayor_correcta.mid', 'Voz: bajo. Tonalidad reconocida: Si bemol mayor.'],
    ]) {
      expect(errs(file)).toEqual([]);
      expect(check(file)[0].titleEs).toBe(title);
    }
  });

  it('reporta los errores de los archivos incorrectos', () => {
    expect(errs('Leccion_7_Soprano_Do_mayor_errores.mid')).toEqual([
      'MELODIC_FORBIDDEN_INTERVAL@3', 'MELODIC_REPEATED_NOTE@4', 'MELODY_RANGE@7', 'MELODIC_SUCCESSIVE_LEAPS@7', 'MELODY_END_TONIC@8',
    ]);
    expect(errs('Leccion_7_Tenor_Re_mayor_errores.mid')).toEqual([
      'MELODIC_LEADING_TONE_OCTAVE@3', 'MELODY_ENHARMONIC@6', 'MELODIC_DIMINISHED_UNRESOLVED@6',
    ]);
  });
});
