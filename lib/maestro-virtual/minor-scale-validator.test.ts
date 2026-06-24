import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMidiBuffer } from './midi-parser';
import type { VoiceData } from './midi-parser';
import { validateMinorScales } from './minor-scale-validator';

/** Lee un MIDI de fixtures y lo entrega como ArrayBuffer (lo que espera el parser). */
function loadMidi(name: string): ArrayBuffer {
  const buf = readFileSync(join(__dirname, '__fixtures__', name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** VoiceData de la tarea correcta, parseada del secuenciador real. */
function correctVoiceData(): VoiceData {
  return parseMidiBuffer(loadMidi('leccion3-correcta.mid'));
}

// Cada tonalidad ocupa 31 notas consecutivas en la soprano.
// Sub-segmentos dentro del bloque: natural[0..8) armónica[8..16) melódica↑[16..24) melódica↓[24..31).
const KEY_BLOCK = 31;
const noteAt = (vd: VoiceData, key: number, indexInBlock: number) =>
  vd.voices.SOPRANO![key * KEY_BLOCK + indexInBlock];

describe('validateMinorScales — las 15 tonalidades menores', () => {
  it('acepta la tarea correcta exportada del secuenciador Storm Studios', () => {
    const errors = validateMinorScales(correctVoiceData());
    // Si falla, serializar los errores ayuda a depurar parser/validador.
    expect(errors, JSON.stringify(errors, null, 2)).toEqual([]);
  });

  it('parsea exactamente 15 tonalidades × 31 notas (465 notas en la soprano)', () => {
    const vd = correctVoiceData();
    expect(vd.voices.SOPRANO).toHaveLength(15 * KEY_BLOCK);
    expect(vd.keyChanges).toHaveLength(15);
  });

  it('detecta una altura realmente incorrecta (La menor natural, grado III)', () => {
    const vd = structuredClone(correctVoiceData());
    const note = noteAt(vd, 0, 2); // Am natural, grado III = Do (pitch 0)
    note.midi += 1;                // Do# — rompe la forma menor natural
    note.pitch = note.midi % 12;
    note.spelling = 'c#';
    const errors = validateMinorScales(vd);
    expect(errors.some(e => e.rule === 'MINOR_WRONG_NOTE')).toBe(true);
  });

  it('rechaza grafía enarmónica equivocada (Lab en vez de Sol# en La menor armónica)', () => {
    const vd = structuredClone(correctVoiceData());
    const note = noteAt(vd, 0, 8 + 6); // Am armónica, grado VII = Sol# (pitch 8)
    expect(note.midi % 12).toBe(8);    // misma altura que Lab
    note.spelling = 'ab';              // grafía incorrecta (suena igual)
    const errors = validateMinorScales(vd);
    expect(errors.some(e => e.rule === 'MINOR_ENHARMONIC')).toBe(true);
    expect(errors.some(e => e.rule === 'MINOR_WRONG_NOTE')).toBe(false);
  });

  it('detecta orden incorrecto (tonalidad equivocada en la posición 2)', () => {
    const vd = structuredClone(correctVoiceData());
    vd.keyChanges[1].key = 'D'; // posición 2 debería ser Mi menor (rel. Sol), no Si menor (rel. Re)
    const errors = validateMinorScales(vd);
    expect(errors.some(e => e.rule === 'MINOR_ORDER')).toBe(true);
  });

  it('detecta conteo de notas incorrecto en una tonalidad (faltó una nota)', () => {
    const vd = structuredClone(correctVoiceData());
    vd.voices.SOPRANO!.splice(5, 1); // quita una nota del bloque de La menor → 30 notas
    const errors = validateMinorScales(vd);
    expect(errors.some(e => e.rule === 'MINOR_NOTE_COUNT')).toBe(true);
  });

  it('detecta que faltan tonalidades (menos de 15)', () => {
    const vd = structuredClone(correctVoiceData());
    vd.voices.SOPRANO!.length = 14 * KEY_BLOCK; // recorta la última tonalidad
    vd.keyChanges.length = 14;
    const errors = validateMinorScales(vd);
    expect(errors.some(e => e.rule === 'MINOR_COUNT')).toBe(true);
  });

  it('exige información de tonalidad (sin key signatures, error claro)', () => {
    const vd = structuredClone(correctVoiceData());
    vd.keyChanges = [];
    const errors = validateMinorScales(vd);
    expect(errors.some(e => e.rule === 'MINOR_MISSING_KEYSIG')).toBe(true);
  });
});
