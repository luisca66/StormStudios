import { describe, expect, it } from "vitest";
import { createScore } from "./model";
import { moveSelection, movesAsGroup, shiftByStaffSteps, staffSteps } from "./group-move";
import type { NoteEvent, Score } from "./types";

const note = (id: string, start: number, pitches: string[], duration: NoteEvent["duration"] = "q"): NoteEvent =>
  ({ id, start, duration, dotted: false, triplet: false, pitches, tie: false });
function melody(events: NoteEvent[], key = "C"): Score {
  const score = createScore("single");
  score.measures.forEach(m => { m.key = key; });
  score.voices[0].events = events;
  return score;
}
const notes = (score: Score) => score.voices[0].events.map(e => `${e.start}:${e.pitches.join("+")}`);

describe("grados del pentagrama", () => {
  it("sube y baja siguiendo la armadura", () => {
    expect(shiftByStaffSteps("E4", 1, "G")).toBe("F#4");
    expect(shiftByStaffSteps("F#4", -1, "G")).toBe("E4");
    expect(shiftByStaffSteps("B3", 1, "F")).toBe("C4");
    expect(shiftByStaffSteps("A4", 1, "F")).toBe("Bb4");
    expect(shiftByStaffSteps("C4", 7, "C")).toBe("C5");
    expect(staffSteps("E4", "G4")).toBe(2);
    expect(staffSteps("C#5", "Cb4")).toBe(-7);
  });
});

describe("mover la selección", () => {
  it("en la partitura, todas suben los mismos grados con la armadura de su compás", () => {
    const score = melody([note("a", 0, ["C4"]), note("b", 960, ["E4"]), note("c", 1920, ["G4"]), note("d", 2880, ["C5"])], "G");
    const { score: moved, keys } = moveSelection(score, ["a", "b", "c"], { kind: "steps", steps: 1 });
    expect(notes(moved)).toEqual(["0:D4", "960:F#4", "1920:A4", "2880:C5"]);
    expect(keys).toEqual(["a", "b", "c"]);
  });
  it("usa la armadura del compás de cada nota", () => {
    const score = melody([note("a", 0, ["E4"]), note("b", 3840, ["E4"])]);
    score.measures[1].key = "G"; score.measures[1].keyChange = true;
    expect(notes(moveSelection(score, ["a", "b"], { kind: "steps", steps: 1 }).score)).toEqual(["0:F4", "3840:F#4"]);
  });
  it("en el editor de teclas, todas se corren el mismo intervalo y la misma distancia", () => {
    const score = melody([note("a", 0, ["C4"]), note("b", 960, ["E4"]), note("c", 1920, ["G4"])]);
    const { score: moved, keys } = moveSelection(score, ["a", "b"], { kind: "keys", semitones: 2, ticks: 960 });
    // C4 y E4 pasan a D4 y F#4 una negra después; F#4 cae sobre G4 y lo reemplaza, como al escribir.
    expect(notes(moved)).toEqual(["960:D4", "1920:F#4"]);
    expect(keys).toHaveLength(2);
    expect(moved.voices[0].events.filter(e => keys.includes(e.id)).map(e => e.pitches[0])).toEqual(["D4", "F#4"]);
  });
  it("las notas movidas no se pisan entre sí", () => {
    const score = melody([note("a", 0, ["C4"]), note("b", 960, ["D4"]), note("c", 1920, ["E4"])]);
    expect(notes(moveSelection(score, ["a", "b", "c"], { kind: "keys", semitones: 0, ticks: 960 }).score)).toEqual(["960:C4", "1920:D4", "2880:E4"]);
  });
  it("mueve varias voces a la vez", () => {
    const score = createScore("satb");
    score.voices.find(v => v.id === "soprano")!.events = [note("s", 0, ["E5"], "h")];
    score.voices.find(v => v.id === "bass")!.events = [note("b", 0, ["C3"], "h")];
    const moved = moveSelection(score, ["s", "b"], { kind: "steps", steps: -1 }).score;
    expect(moved.voices.find(v => v.id === "soprano")!.events[0].pitches).toEqual(["D5"]);
    expect(moved.voices.find(v => v.id === "bass")!.events[0].pitches).toEqual(["B2"]);
  });
  it("una nota sola de un acorde mueve solo esa altura", () => {
    const score = melody([note("a", 0, ["C4", "E4", "G4"]), note("b", 960, ["D4"])]);
    const moved = moveSelection(score, ["a@E4", "b"], { kind: "steps", steps: 1 }).score;
    expect(notes(moved)).toEqual(["0:C4+F4+G4", "960:E4"]);
  });
  it("no deja salir la selección de la partitura", () => {
    const score = melody([note("a", 0, ["C4"]), note("b", 960, ["D4"])]);
    expect(() => moveSelection(score, ["a", "b"], { kind: "keys", semitones: 0, ticks: -960 })).toThrow(/inicio/);
    expect(() => moveSelection(score, ["a", "b"], { kind: "keys", semitones: 0, ticks: 14400 })).toThrow(/final/);
  });
  it("sabe cuándo arrastrar una nota debe mover el grupo", () => {
    const score = melody([note("a", 0, ["C4"]), note("b", 960, ["D4"]), note("c", 1920, ["E4"])]);
    expect(movesAsGroup(score, ["a", "b"], "a")).toBe(true);
    expect(movesAsGroup(score, ["a", "b"], "c")).toBe(false);
    expect(movesAsGroup(score, ["a"], "a")).toBe(false);
  });
});
