import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseMidiBuffer, type VoiceData } from './midi-parser';
import { SATB_VOICES, validateLesson6SatbChords } from './satb-chords-validator';

const PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
/** 'F#4' → { midi: 66, spelling: 'f#' } (Do4 = 60). */
function note(name: string) {
  const [, letter, acc, octave] = name.match(/^([A-Ga-g])(##|bb|#|b)?(-?\d)$/)!;
  const alter = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 }[acc ?? '']!;
  return { midi: 12 * (Number(octave) + 1) + PC[letter.toLowerCase()] + alter, spelling: letter.toLowerCase() + (acc ?? '') };
}
/** Cada acorde: [S, A, T, B]. */
function submission(chords: string[][], key = 'C', shift = 0): VoiceData {
  const data: VoiceData = { ticksPerBeat: 960, keyChanges: [{ tick: 0, key }], beats: [], voices: { SOPRANO: [], ALTO: [], TENOR: [], BASS: [] } };
  chords.forEach((chord, i) => chord.forEach((name, v) => {
    if (!name) return;
    const n = note(name);
    data.voices[SATB_VOICES[v]]!.push({ midi: n.midi + shift, pitch: (n.midi + shift) % 12, spelling: n.spelling, tick: i * 3840, key });
  }));
  return data;
}

// Do mayor: I, II6, III, IV64, V, VI sin 5a, VII6 completo.
const C_MAJOR = [
  ['C5', 'E4', 'G3', 'C3'],
  ['D5', 'A4', 'D4', 'F3'],
  ['E4', 'B3', 'G3', 'E3'],
  ['F4', 'A3', 'F3', 'C3'],
  ['B4', 'G4', 'D4', 'G2'],
  ['C5', 'A4', 'C4', 'A2'],
  ['D4', 'B3', 'F3', 'D3'],
];
const errors = (data: VoiceData) => validateLesson6SatbChords(data).filter(f => f.severity === 'error');

describe('Lección 6 — acordes en el cuarteto vocal', () => {
  it('acepta los 7 grados bien construidos y describe cada acorde', () => {
    const feedback = validateLesson6SatbChords(submission(C_MAJOR));
    expect(feedback.filter(f => f.severity === 'error')).toEqual([]);
    expect(feedback[0].titleEs).toBe('Tonalidad reconocida: Do mayor.');
    const info = feedback.filter(f => f.rule === 'SATB_CHORD_INFO');
    expect(info.map(f => f.titleEs)).toEqual([
      'Acorde 1 (I, Do mayor)', 'Acorde 2 (II, Re menor)', 'Acorde 3 (III, Mi menor)', 'Acorde 4 (IV, Fa mayor)',
      'Acorde 5 (V, Sol mayor)', 'Acorde 6 (VI, La menor)', 'Acorde 7 (VII, Si disminuido)',
    ]);
    expect(info[0].detailEs).toBe('Estado: fundamental. Posición melódica: de 8a. Disposición: abierta. Notas: fundamental duplicada.');
    expect(info[1].detailEs).toContain('primera inversión (6/3)');
    expect(info[2].detailEs).toContain('Disposición: cerrada');
    expect(info[3].detailEs).toContain('segunda inversión (6/4)');
    expect(info[5].detailEs).toContain('fundamental duplicada, tercera duplicada, sin quinta');
  });

  it('acepta cualquier orden y reconoce la tonalidad por las alturas', () => {
    expect(errors(submission([...C_MAJOR].reverse()))).toEqual([]);
    const d = submission(C_MAJOR, 'C', 2).voices; // misma tarea un tono arriba, sin grafías
    for (const notes of Object.values(d)) for (const n of notes!) n.spelling = undefined;
    const feedback = validateLesson6SatbChords({ ticksPerBeat: 960, keyChanges: [], beats: [], voices: d });
    expect(feedback[0].titleEs).toBe('Tonalidad reconocida: Re mayor.');
    expect(feedback.filter(f => f.severity === 'error').map(f => f.rule)).toEqual(Array(7).fill('SATB_MISSING_SPELLING'));
  });

  it('distingue Fa# mayor de Solb mayor por las grafías', () => {
    const sharp = C_MAJOR.map(chord => chord.map(n => n.replace(/^([A-G])/, (_, l) => ({ C: 'F#', D: 'G#', E: 'A#', F: 'B', G: 'C#', A: 'D#', B: 'E#' } as Record<string, string>)[l])));
    // Ajusta octavas: cada letra sube una 4a aumentada (6 semitonos) respecto de Do mayor.
    const data = submission(C_MAJOR, 'F#', 6);
    sharp.forEach((chord, i) => chord.forEach((name, v) => { data.voices[SATB_VOICES[v]]![i].spelling = name.replace(/-?\d$/, '').toLowerCase(); }));
    const feedback = validateLesson6SatbChords(data);
    expect(feedback[0].titleEs).toBe('Tonalidad reconocida: Fa sostenido mayor.');
    expect(feedback.some(f => f.rule === 'SATB_ENHARMONIC')).toBe(false);
  });

  it('reporta sensible duplicada, supresiones prohibidas y grados faltantes', () => {
    const chords = C_MAJOR.map(c => [...c]);
    chords[4] = ['B4', 'G4', 'D4', 'B2'];   // V con Si en bajo y soprano
    chords[1] = ['D5', 'D4', 'D4', 'F3'];   // II sin... tiene Re y Fa: falta solo la 5a (permitido)
    chords[0] = ['G4', 'C4', 'G3', 'C3'];   // I sin tercera
    chords[6] = ['D4', 'B3', 'B3', 'D3'];   // VII sin quinta y con sensible duplicada
    chords.splice(2, 1);                    // falta III
    const rules = errors(submission(chords)).map(f => f.rule);
    expect(rules).toContain('SATB_LEADING_TONE_DOUBLED');
    expect(rules).toContain('SATB_MISSING_THIRD');
    expect(rules).toContain('SATB_INCOMPLETE_DIMINISHED');
    expect(rules).toContain('SATB_MISSING_DEGREE');
    expect(rules).toContain('SATB_CHORD_COUNT');
    expect(rules.filter(r => r === 'SATB_LEADING_TONE_DOUBLED')).toHaveLength(2);
    const missing = errors(submission(chords)).find(f => f.rule === 'SATB_MISSING_DEGREE')!;
    expect(missing.titleEs).toBe('Falta el grado III (Mi menor).');
  });

  it('reporta tesituras, separaciones, cruces, notas ajenas y grafías', () => {
    const chords = C_MAJOR.map(c => [...c]);
    chords[0] = ['C6', 'E4', 'G3', 'C3'];   // soprano fuera de tesitura y a una 13a de la contralto
    chords[1] = ['D5', 'F3', 'A3', 'D3'];   // contralto debajo del tenor
    chords[2] = ['E4', 'B3', 'G3', 'F#3'];  // Fa# ajeno a Mi menor
    chords[3] = ['F4', 'A3', 'F3', 'B#2'];  // Si# en lugar de Do
    const found = errors(submission(chords));
    const rules = found.map(f => f.rule);
    expect(rules).toEqual(expect.arrayContaining(['SATB_RANGE', 'SATB_SPACING', 'SATB_VOICE_CROSSING', 'SATB_FOREIGN_NOTE', 'SATB_ENHARMONIC']));
    expect(found.find(f => f.rule === 'SATB_SPACING')!.detailEs).toBe('Hay una 13a (Mi4–Do6); el máximo es una 12a.');
    expect(found.find(f => f.rule === 'SATB_RANGE')!.detailEs).toBe('Do6 está por encima de la tesitura de soprano (Do4–Sol5).');
  });

  it('reporta voces faltantes o con dos notas', () => {
    const data = submission(C_MAJOR);
    data.voices.ALTO!.splice(0, 1);
    data.voices.TENOR!.push({ midi: 52, pitch: 4, spelling: 'e', tick: 3840, key: 'C' });
    const rules = errors(data).map(f => f.rule);
    expect(rules).toContain('SATB_MISSING_VOICE');
    expect(rules).toContain('SATB_VOICE_NOTES');
  });

  it('revisa los MIDI de ejemplo con el formato de Storm Sequencer', () => {
    const check = (file: string) => {
      const bytes = readFileSync(new URL(`./__fixtures__/${file}`, import.meta.url));
      return validateLesson6SatbChords(parseMidiBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
    };
    expect(check('Leccion_6_Do_mayor_correcta.mid').filter(f => f.severity === 'error')).toEqual([]);
    const d = check('Leccion_6_Re_mayor_desordenada_correcta.mid');
    expect(d.filter(f => f.severity === 'error')).toEqual([]);
    expect(d[0].titleEs).toBe('Tonalidad reconocida: Re mayor.');
    expect(check('Leccion_6_Do_mayor_errores.mid').filter(f => f.severity === 'error').map(f => f.rule).sort()).toEqual([
      'SATB_CHORD_COUNT', 'SATB_INCOMPLETE_DIMINISHED', 'SATB_LEADING_TONE_DOUBLED', 'SATB_LEADING_TONE_DOUBLED',
      'SATB_MISSING_DEGREE', 'SATB_MISSING_THIRD', 'SATB_RANGE', 'SATB_SPACING',
    ]);
  });

  it('reporta un archivo sin acordes', () => {
    expect(errors({ ticksPerBeat: 960, keyChanges: [], beats: [], voices: {} }).map(f => f.rule)).toEqual(['SATB_NO_CHORDS']);
  });
});
