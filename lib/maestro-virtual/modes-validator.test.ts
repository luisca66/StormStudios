import { describe, it, expect } from 'vitest';
import { validateLesson2Modes } from './modes-validator';
import { buildScale } from './music-theory-core';
import type { VoiceData, ParsedNote } from './midi-parser';

const MODE_SEQUENCE = ['IONIAN', 'DORIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN'];

/** Grafía incrustada estilo secuenciador (ej. 'eb', 'f#', 'c##'). */
const tokenOf = (letter: string, alteration: string): string => letter.toLowerCase() + alteration;

/** VoiceData con los modos paralelos desde `tonic`, construidos por el core. */
function buildModesVoiceData(tonic: string, modes: string[] = MODE_SEQUENCE): VoiceData {
  const soprano: ParsedNote[] = [];
  let tick = 0;
  modes.forEach((mode) => {
    for (const n of buildScale(tonic, mode).notes) {
      soprano.push({
        midi: n.midiBase,
        pitch: n.midiBase % 12,
        tick,
        key: 'C',
        spelling: tokenOf(n.letter, n.alteration),
      });
      tick += 128;
    }
  });
  return { ticksPerBeat: 128, keyChanges: [], voices: { SOPRANO: soprano }, beats: [] };
}

describe('validateLesson2Modes — modos paralelos desde la misma tónica', () => {
  it('acepta los 7 modos correctos desde Re', () => {
    expect(validateLesson2Modes(buildModesVoiceData('D'))).toEqual([]);
  });

  it('acepta desde una tónica con bemoles (Mib)', () => {
    expect(validateLesson2Modes(buildModesVoiceData('Eb'))).toEqual([]);
  });

  it('acepta desde Do (todas blancas + alteraciones por modo)', () => {
    expect(validateLesson2Modes(buildModesVoiceData('C'))).toEqual([]);
  });

  it('detecta orden incorrecto (dórico en la posición del jónico)', () => {
    const vd = buildModesVoiceData('C', ['DORIAN', 'IONIAN', 'PHRYGIAN', 'LYDIAN', 'MIXOLYDIAN', 'AEOLIAN', 'LOCRIAN']);
    const errors = validateLesson2Modes(vd);
    expect(errors.some(e => e.rule === 'MODE_ORDER')).toBe(true);
  });

  it('rechaza grafía enarmónica equivocada (Re# en vez de Mib en Do dórico)', () => {
    const vd = buildModesVoiceData('C');
    const iiiNote = vd.voices.SOPRANO![1 * 8 + 2]; // dórico, grado III
    expect(iiiNote.midi % 12).toBe(3);             // Mib / Re# (misma altura)
    iiiNote.spelling = 'd#';
    const errors = validateLesson2Modes(vd);
    expect(errors.some(e => e.rule === 'MODE_ENHARMONIC')).toBe(true);
    expect(errors.some(e => e.rule === 'MODE_WRONG_NOTE')).toBe(false);
  });

  it('detecta una altura realmente incorrecta', () => {
    const vd = buildModesVoiceData('C');
    const note = vd.voices.SOPRANO![1 * 8 + 6]; // dórico, grado VII (Sib, midi 70)
    note.midi = 71;                             // Si natural (pitch 11): rompe la forma del modo
    note.pitch = 71 % 12;
    note.spelling = 'b';
    const errors = validateLesson2Modes(vd);
    expect(errors.some(e => e.rule === 'MODE_WRONG_NOTE')).toBe(true);
  });

  it('detecta conteo incorrecto (faltan notas)', () => {
    const vd = buildModesVoiceData('C');
    vd.voices.SOPRANO!.pop(); // 55 notas
    expect(validateLesson2Modes(vd).some(e => e.rule === 'MODE_COUNT')).toBe(true);
  });

  it('sin grafía incrustada no inventa errores de grafía', () => {
    const vd = buildModesVoiceData('D');
    for (const n of vd.voices.SOPRANO!) delete n.spelling;
    expect(validateLesson2Modes(vd)).toEqual([]);
  });
});
