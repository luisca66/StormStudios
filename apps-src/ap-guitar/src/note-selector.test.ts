import { describe, expect, it } from "vitest";
import { GuitarNoteSelector } from "./note-selector";
import type { GuitarNoteSample } from "./types";

const samples: GuitarNoteSample[] = [
  { stringName: "Cuerda A", noteName: "A2", filePath: "A String/A2.mp3" },
  { stringName: "Cuerda A", noteName: "A#2", filePath: "A String/A#2.mp3" },
  { stringName: "Cuerda A", noteName: "B2", filePath: "A String/B2.mp3" },
];

describe("GuitarNoteSelector", () => {
  it("returns null when there are no active notes", () => {
    const selector = new GuitarNoteSelector();

    expect(selector.getNextRandomNote([])).toBeNull();
  });

  it("returns the only active note", () => {
    const selector = new GuitarNoteSelector();

    expect(selector.getNextRandomNote([samples[0]])).toBe(samples[0]);
    expect(selector.getNextRandomNote([samples[0]])).toBe(samples[0]);
  });

  it("prevents a third same-note streak when alternatives exist", () => {
    const selector = new GuitarNoteSelector();
    const sameNoteSamples: GuitarNoteSample[] = [
      samples[0],
      { stringName: "Cuerda E (grave)", noteName: "A2", filePath: "E String low/A2.mp3" },
      samples[1],
    ];

    expect(selector.getNextRandomNote(sameNoteSamples, () => 0)).toBe(samples[0]);
    expect(selector.getNextRandomNote(sameNoteSamples, () => 0)).toBe(samples[0]);

    expect(selector.getNextRandomNote(sameNoteSamples, () => 0)).toBe(samples[1]);
  });
});
