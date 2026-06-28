import { describe, expect, it } from "vitest";
import { NoteSelector } from "./note-selector";
import type { NoteSample } from "./types";

const samples: NoteSample[] = [
  { instrument: "Piano", noteName: "A2", filePath: "Piano/A2.mp3" },
  { instrument: "Piano", noteName: "A#2", filePath: "Piano/A#2.mp3" },
  { instrument: "Piano", noteName: "B2", filePath: "Piano/B2.mp3" },
];

describe("NoteSelector", () => {
  it("returns null when there are no active notes", () => {
    const selector = new NoteSelector();

    expect(selector.getNextRandomNote([])).toBeNull();
  });

  it("returns the only active note", () => {
    const selector = new NoteSelector();

    expect(selector.getNextRandomNote([samples[0]])).toBe(samples[0]);
    expect(selector.getNextRandomNote([samples[0]])).toBe(samples[0]);
  });

  it("prevents a third same-note streak when alternatives exist", () => {
    const selector = new NoteSelector();
    const sameNoteSamples: NoteSample[] = [
      samples[0],
      { instrument: "Cello", noteName: "A2", filePath: "Cello/A2.mp3" },
      samples[1],
    ];

    expect(selector.getNextRandomNote(sameNoteSamples, () => 0)).toBe(samples[0]);
    expect(selector.getNextRandomNote(sameNoteSamples, () => 0)).toBe(samples[0]);

    expect(selector.getNextRandomNote(sameNoteSamples, () => 0)).toBe(samples[1]);
  });
});
