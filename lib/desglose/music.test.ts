import { describe, it, expect } from "vitest";
import {
  noteToMidi,
  midiToNote,
  generateChromaticNotes,
  filterChromaticRange,
  generateRandomChord,
  frequencyToPreciseMidi,
  gradeAttempt,
  noteToFrequency,
} from "./music";
import {
  CHORD_SIZES,
  INSTRUMENT_OPTIONS,
} from "../../apps-src/desglose/src/config";
import { foldCentsToPitchClass } from "../../apps-src/desglose/src/audio/pitch";

describe("noteToMidi / midiToNote", () => {
  it("ancla C4 = 60 y A4 = 69", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("A4")).toBe(69);
  });

  it("maneja sostenidos y bemoles", () => {
    expect(noteToMidi("C#4")).toBe(61);
    expect(noteToMidi("Db4")).toBe(61);
    expect(noteToMidi("F#3")).toBe(54);
  });

  it("cubre los extremos del rango de samples (C2..C7)", () => {
    expect(noteToMidi("C2")).toBe(36);
    expect(noteToMidi("C7")).toBe(96);
  });

  it("midiToNote usa nombres con sostenidos", () => {
    expect(midiToNote(60)).toBe("C4");
    expect(midiToNote(61)).toBe("C#4");
    expect(midiToNote(96)).toBe("C7");
  });

  it("es ida y vuelta para todo el rango", () => {
    for (let m = 36; m <= 96; m++) {
      expect(noteToMidi(midiToNote(m))).toBe(m);
    }
  });
});

describe("generateChromaticNotes", () => {
  it("produce 61 notas de C2 a C7 inclusive", () => {
    const notes = generateChromaticNotes("C2", "C7");
    expect(notes).toHaveLength(61);
    expect(notes[0]).toBe("C2");
    expect(notes.at(-1)).toBe("C7");
  });
});

describe("filterChromaticRange", () => {
  const all = generateChromaticNotes("C2", "C7");

  it("recorta un sub-rango inclusivo", () => {
    expect(filterChromaticRange(all, "C4", "E4")).toEqual(["C4", "C#4", "D4", "D#4", "E4"]);
  });

  it("invierte si el inicio está por encima del fin", () => {
    expect(filterChromaticRange(all, "E4", "C4")).toEqual(["E4", "D#4", "D4", "C#4", "C4"]);
  });
});

describe("generateRandomChord", () => {
  const available = generateChromaticNotes("C4", "B4");

  it("devuelve N notas distintas ordenadas de grave a agudo", () => {
    const chord = generateRandomChord(available, 4, mulberry32(123));
    expect(chord).toHaveLength(4);
    expect(new Set(chord).size).toBe(4);
    const midis = chord.map(noteToMidi);
    expect([...midis]).toEqual([...midis].sort((a, b) => a - b));
  });

  it("devuelve vacío si no hay suficientes notas", () => {
    expect(generateRandomChord(["C4", "D4"], 5)).toEqual([]);
  });
});

describe("frequencyToPreciseMidi", () => {
  it("440 Hz = 69, 880 Hz = 81", () => {
    expect(frequencyToPreciseMidi(440)).toBeCloseTo(69, 5);
    expect(frequencyToPreciseMidi(880)).toBeCloseTo(81, 5);
  });

  it("0 o negativo devuelve 0", () => {
    expect(frequencyToPreciseMidi(0)).toBe(0);
    expect(frequencyToPreciseMidi(-100)).toBe(0);
  });
});

describe("noteToFrequency", () => {
  it("convierte A4 a 440 Hz y conserva la relación de octava", () => {
    expect(noteToFrequency("A4")).toBeCloseTo(440, 5);
    expect(noteToFrequency("A3")).toBeCloseTo(220, 5);
  });
});

describe("configuración visible de Desglose", () => {
  it("incluye los cinco timbres y la opción aleatoria", () => {
    expect(INSTRUMENT_OPTIONS).toEqual([
      "Piano",
      "Cello",
      "Corno",
      "Fagot",
      "Coro",
      "random",
    ]);
  });

  it("permite acordes de dos a seis notas", () => {
    expect(CHORD_SIZES).toEqual([2, 3, 4, 5, 6]);
  });
});

describe("afinador v2 octava-agnóstico", () => {
  it("pliega octavas completas a la misma clase de altura", () => {
    expect(foldCentsToPitchClass(1200)).toBe(0);
    expect(foldCentsToPitchClass(-1200)).toBe(0);
    expect(foldCentsToPitchClass(1230)).toBe(30);
    expect(foldCentsToPitchClass(-1175)).toBe(25);
  });
});

describe("gradeAttempt", () => {
  it("acepta cuando se canta la nota correcta afinada", () => {
    // A4 = 440 Hz; expected A4 → clase coincide, desviación ~0
    const grade = gradeAttempt([440, 440, 440], "A4");
    expect(grade.correct).toBe(true);
    expect(grade.reason).toBe("ok");
  });

  it("es octava-agnóstico (acepta A3 cantado para A4)", () => {
    const grade = gradeAttempt([220, 220, 220], "A4");
    expect(grade.correct).toBe(true);
  });

  it("rechaza una clase de altura distinta", () => {
    const grade = gradeAttempt([440, 440, 440], "C4");
    expect(grade.correct).toBe(false);
    expect(grade.reason).toBe("wrong-pitch");
  });

  it("rechaza afinación fuera de tolerancia (cuarto de tono)", () => {
    // ~25 cents arriba de A4: MIDI ~69.25, desviación 0.25 → no < 0.25
    const quarterSharp = 440 * Math.pow(2, 0.25 / 12);
    const grade = gradeAttempt([quarterSharp, quarterSharp], "A4");
    expect(grade.correct).toBe(false);
  });

  it("reporta silencio sin frecuencias", () => {
    expect(gradeAttempt([], "A4").reason).toBe("silence");
  });

  it("la nota mayoritaria gana sobre ruido esporádico", () => {
    // Mayoría en A4 (440), un outlier en C5 (~523.25)
    const grade = gradeAttempt([440, 440, 440, 440, 523.25], "A4");
    expect(grade.correct).toBe(true);
  });
});

/** PRNG determinista (mulberry32) para tests reproducibles. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
