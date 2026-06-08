import { describe, it, expect } from 'vitest';
import {
  parseSpelling,
  spellingToPc,
  spellWithLetter,
  sameSpelling,
  spellingName,
  letterIndex,
  type Letter,
} from './spelling';

describe('parseSpelling', () => {
  it('parsea letras naturales', () => {
    expect(parseSpelling('c')).toEqual({ letter: 'c', alter: 0 });
    expect(parseSpelling('b')).toEqual({ letter: 'b', alter: 0 });
    expect(parseSpelling('gn')).toEqual({ letter: 'g', alter: 0 }); // natural explícito
  });

  it('parsea sostenidos y bemoles', () => {
    expect(parseSpelling('c#')).toEqual({ letter: 'c', alter: 1 });
    expect(parseSpelling('bb')).toEqual({ letter: 'b', alter: -1 });
    expect(parseSpelling('gb')).toEqual({ letter: 'g', alter: -1 });
  });

  it('parsea dobles alteraciones (## / x / bb)', () => {
    expect(parseSpelling('a##')).toEqual({ letter: 'a', alter: 2 });
    expect(parseSpelling('fx')).toEqual({ letter: 'f', alter: 2 });
    expect(parseSpelling('ebb')).toEqual({ letter: 'e', alter: -2 });
  });

  it('es tolerante a mayúsculas y espacios', () => {
    expect(parseSpelling('A##')).toEqual({ letter: 'a', alter: 2 });
    expect(parseSpelling('  B ')).toEqual({ letter: 'b', alter: 0 });
  });

  it('devuelve null para entradas inválidas', () => {
    expect(parseSpelling(undefined)).toBeNull();
    expect(parseSpelling('')).toBeNull();
    expect(parseSpelling('h')).toBeNull();
    expect(parseSpelling('c###')).toBeNull();
  });
});

describe('spellingToPc — enarmonías comparten clase de altura', () => {
  it('La## y Si y Dob son todas pc 11', () => {
    expect(spellingToPc({ letter: 'a', alter: 2 })).toBe(11); // La##
    expect(spellingToPc({ letter: 'b', alter: 0 })).toBe(11); // Si
    expect(spellingToPc({ letter: 'c', alter: -1 })).toBe(11); // Dob
  });

  it('Mi# y Fa son pc 5; Fab y Mi son pc 4', () => {
    expect(spellingToPc({ letter: 'e', alter: 1 })).toBe(5);
    expect(spellingToPc({ letter: 'f', alter: 0 })).toBe(5);
    expect(spellingToPc({ letter: 'f', alter: -1 })).toBe(4);
    expect(spellingToPc({ letter: 'e', alter: 0 })).toBe(4);
  });
});

describe('spellWithLetter — grafía correcta por letra y altura', () => {
  // Helper: deletrea la escala dada su tónica y las clases de altura.
  const spellScale = (tonicLetter: Letter, pcs: number[]) =>
    pcs.map((pc, i) => spellWithLetter(letterIndex(tonicLetter) + i, pc));

  it('Do mayor → Do Re Mi Fa Sol La Si Do (sin alteraciones)', () => {
    const got = spellScale('c', [0, 2, 4, 5, 7, 9, 11, 0]);
    expect(got).toEqual([
      { letter: 'c', alter: 0 }, { letter: 'd', alter: 0 }, { letter: 'e', alter: 0 },
      { letter: 'f', alter: 0 }, { letter: 'g', alter: 0 }, { letter: 'a', alter: 0 },
      { letter: 'b', alter: 0 }, { letter: 'c', alter: 0 },
    ]);
  });

  it('Solb mayor → usa bemoles y Dob (no Fa#/Si)', () => {
    const got = spellScale('g', [6, 8, 10, 11, 1, 3, 5, 6]);
    expect(got).toEqual([
      { letter: 'g', alter: -1 }, // Solb
      { letter: 'a', alter: -1 }, // Lab
      { letter: 'b', alter: -1 }, // Sib
      { letter: 'c', alter: -1 }, // Dob  ← no "Si"
      { letter: 'd', alter: -1 }, // Reb
      { letter: 'e', alter: -1 }, // Mib
      { letter: 'f', alter: 0 },  // Fa
      { letter: 'g', alter: -1 }, // Solb
    ]);
  });

  it('Sol# menor armónica → el VII es Fa doble sostenido', () => {
    // G# harmónica: G# A# B C# D# E F##(=G natural pitch) G#
    const tonicPc = 8; // G#
    const harmonic = [0, 2, 3, 5, 7, 8, 11, 0].map(i => (tonicPc + i) % 12);
    const got = spellScale('g', harmonic);
    expect(got[6]).toEqual({ letter: 'f', alter: 2 }); // Fa##
  });

  it('Do# menor armónica → el VII es Si sostenido', () => {
    const tonicPc = 1; // C#
    const harmonic = [0, 2, 3, 5, 7, 8, 11, 0].map(i => (tonicPc + i) % 12);
    const got = spellScale('c', harmonic);
    expect(got[6]).toEqual({ letter: 'b', alter: 1 }); // Si#
  });
});

describe('sameSpelling y spellingName', () => {
  it('distingue La## de Si aunque suenen igual', () => {
    const las2 = { letter: 'a' as Letter, alter: 2 }; // La##
    const si = { letter: 'b' as Letter, alter: 0 };   // Si
    expect(spellingToPc(las2)).toBe(spellingToPc(si)); // misma altura
    expect(sameSpelling(las2, si)).toBe(false);        // distinta grafía
  });

  it('nombres legibles en ES y EN', () => {
    expect(spellingName({ letter: 'a', alter: 2 }, 'es')).toBe('La doble sostenido');
    expect(spellingName({ letter: 'a', alter: 2 }, 'en')).toBe('A double sharp');
    expect(spellingName({ letter: 'b', alter: 0 }, 'es')).toBe('Si');
    expect(spellingName({ letter: 'e', alter: -1 }, 'es')).toBe('Mi bemol');
    expect(spellingName({ letter: 'f', alter: 1 }, 'en')).toBe('F sharp');
  });
});
