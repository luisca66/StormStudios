import { describe, it, expect } from 'vitest';
import { parseMidiBuffer } from './midi-parser';

/** Construye un buffer MIDI tipo 1 de una pista a partir de bytes de eventos. */
function midiBuffer(trackEvents: number[]): ArrayBuffer {
  const len = trackEvents.length;
  const bytes = [
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 1, 0, 0x80, // MThd, fmt 1, 1 track, 128 tpq
    0x4d, 0x54, 0x72, 0x6b,
    (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff,
    ...trackEvents,
  ];
  return new Uint8Array(bytes).buffer;
}

const s = (str: string) => [...str].map(c => c.charCodeAt(0));

describe('parseMidiBuffer — meta-texto de grafía (SP:)', () => {
  it('lee la grafía de cada nota y la resetea entre notas', () => {
    const track = [
      0x00, 0xff, 0x59, 0x02, 0x00, 0x00,            // key signature: C
      0x00, 0xff, 0x01, 0x06, ...s('SP:a##'),        // grafía La## (enarmónico de Si)
      0x00, 0x90, 0x47, 0x64,                         // note on 71 (canal 0 = soprano)
      0x81, 0x00, 0x80, 0x47, 0x00,                   // note off, delta 128
      0x00, 0xff, 0x01, 0x04, ...s('SP:b'),           // grafía Si
      0x00, 0x90, 0x47, 0x64,                         // note on 71
      0x81, 0x00, 0x80, 0x47, 0x00,                   // note off
      0x00, 0x90, 0x45, 0x64,                         // note on 69, SIN grafía
      0x81, 0x00, 0x80, 0x45, 0x00,                   // note off
      0x00, 0xff, 0x2f, 0x00,                          // end of track
    ];

    const vd = parseMidiBuffer(midiBuffer(track));

    expect(vd.keyChanges[0].key).toBe('C');
    const sop = vd.voices.SOPRANO!;
    expect(sop).toHaveLength(3);

    expect(sop[0].midi).toBe(71);
    expect(sop[0].spelling).toBe('a##');  // La##
    expect(sop[0].key).toBe('C');

    expect(sop[1].midi).toBe(71);
    expect(sop[1].spelling).toBe('b');    // Si — no se arrastra la grafía anterior

    expect(sop[2].midi).toBe(69);
    expect(sop[2].spelling).toBeUndefined(); // sin meta-texto
  });
});
