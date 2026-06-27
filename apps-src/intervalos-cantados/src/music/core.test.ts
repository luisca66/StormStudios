import { describe, expect, it } from "vitest";
import {
  INTERVAL_BY_ID,
  createQuestion,
  frequencyToPreciseMidi,
  gradePitch,
  normalizeName,
  noteToMidi,
  spellTarget,
  stripOctave,
} from "./core";

describe("note conversion", () => {
  it("anchors C4 and A4", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("A4")).toBe(69);
  });

  it("handles enharmonic spellings", () => {
    expect(noteToMidi("C#4")).toBe(61);
    expect(noteToMidi("Db4")).toBe(61);
    expect(noteToMidi("B#3")).toBe(60);
    expect(noteToMidi("Cb4")).toBe(59);
  });
});

describe("interval spelling", () => {
  it("spells ascending perfect fifths diatonically", () => {
    expect(spellTarget("C3", INTERVAL_BY_ID.FIFTH, "asc")).toBe("G3");
    expect(spellTarget("Bb2", INTERVAL_BY_ID.FIFTH, "asc")).toBe("F3");
    expect(spellTarget("B2", INTERVAL_BY_ID.FIFTH, "asc")).toBe("F#3");
  });

  it("spells descending perfect fifths diatonically", () => {
    expect(spellTarget("G3", INTERVAL_BY_ID.FIFTH, "desc")).toBe("C3");
    expect(spellTarget("Db4", INTERVAL_BY_ID.FIFTH, "desc")).toBe("Gb3");
  });

  it("spells augmented fourths with the requested letter distance", () => {
    expect(spellTarget("C3", INTERVAL_BY_ID.FOURTH_AUGMENTED, "asc")).toBe("F#3");
    expect(spellTarget("F3", INTERVAL_BY_ID.FOURTH_AUGMENTED, "asc")).toBe("B3");
  });

  it("creates a stable stats key", () => {
    expect(createQuestion(INTERVAL_BY_ID.THIRD_MINOR, "desc", "C4").statKey).toBe("THIRD_MINOR:desc");
  });
});

describe("name normalization", () => {
  it("normalizes unicode flats and strips octave", () => {
    expect(normalizeName("B♭3")).toBe("BB");
    expect(normalizeName("Bb")).toBe("BB");
    expect(stripOctave("Bb3")).toBe("B♭");
  });
});

describe("pitch grading", () => {
  it("accepts correct pitch class in any octave", () => {
    expect(gradePitch([440, 440, 440], "A4", 0.25).pitchCorrect).toBe(true);
    expect(gradePitch([220, 220, 220], "A4", 0.25).pitchCorrect).toBe(true);
  });

  it("rejects wrong pitch class", () => {
    const grade = gradePitch([440, 440, 440], "C4", 0.25);
    expect(grade.pitchCorrect).toBe(false);
    expect(grade.noteClassCorrect).toBe(false);
  });

  it("rejects notes outside tuning tolerance", () => {
    const quarterSharp = 440 * Math.pow(2, 0.25 / 12);
    expect(gradePitch([quarterSharp, quarterSharp], "A4", 0.25).pitchCorrect).toBe(false);
  });

  it("uses the majority detected pitch", () => {
    expect(gradePitch([440, 440, 440, 523.25], "A4", 0.25).pitchCorrect).toBe(true);
  });
});

describe("frequencyToPreciseMidi", () => {
  it("maps A4 to MIDI 69", () => {
    expect(frequencyToPreciseMidi(440)).toBeCloseTo(69, 5);
  });
});
