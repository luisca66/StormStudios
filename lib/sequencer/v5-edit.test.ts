import { describe, expect, it } from "vitest";
import { createScore, pitchToMidi } from "./model";
import { duplicateMeasure, insertMeasureAfter, removeMeasure } from "./measure-edit";
import { ChordCollector, parseMidiMessage, spellMidi } from "./midi-input";
import type { NoteEvent, Score } from "./types";

const note = (id: string, start: number, pitch: string, extra: Partial<NoteEvent> = {}): NoteEvent =>
  ({ id, start, duration: "w", dotted: false, triplet: false, pitches: [pitch], tie: false, ...extra });
function sample(): Score {
  const score = createScore("single");
  score.voices[0].events = [note("a", 0, "C4"), note("b", 3840, "D4"), note("c", 7680, "E4"), note("d", 11520, "F4")];
  score.annotations = [{ id: "x", measure: 2, beat: 1, text: "V", kind: "roman" }, { id: "y", measure: 4, beat: 3, text: "I", kind: "roman" }];
  score.scenes[0] = { ...score.scenes[0], startMeasure: 2, endMeasure: 4 };
  return score;
}
const pitches = (score: Score) => score.voices[0].events.map(e => `${e.start}:${e.pitches[0]}`);

describe("compases", () => {
  it("inserta un compás vacío y recorre música, cifrado y escenas", () => {
    const next = insertMeasureAfter(sample(), 1);
    expect(next.measures).toHaveLength(5);
    expect(pitches(next)).toEqual(["0:C4", "7680:D4", "11520:E4", "15360:F4"]);
    expect(next.annotations!.map(a => a.measure)).toEqual([3, 5]);
    expect([next.scenes[0].startMeasure, next.scenes[0].endMeasure]).toEqual([3, 5]);
    expect(pitches(insertMeasureAfter(sample(), 0))[0]).toBe("3840:C4");
    expect(pitches(insertMeasureAfter(sample(), 4))).toEqual(pitches(sample()));
  });
  it("quita un compás intermedio con todo lo que contiene", () => {
    const next = removeMeasure(sample(), 2);
    expect(next.measures).toHaveLength(3);
    expect(pitches(next)).toEqual(["0:C4", "3840:E4", "7680:F4"]);
    expect(next.annotations).toEqual([expect.objectContaining({ id: "y", measure: 3 })]);
    expect([next.scenes[0].startMeasure, next.scenes[0].endMeasure]).toEqual([2, 3]);
  });
  it("al quitar un compás conserva el cambio de armadura y suelta la ligadura que entraba", () => {
    const score = sample();
    score.measures[1].key = "G"; score.measures[1].keyChange = true; score.measures[2].key = "G"; score.measures[3].key = "G";
    score.voices[0].events[0].tie = true;
    const next = removeMeasure(score, 2);
    expect(next.measures.map(m => m.key)).toEqual(["C", "G", "G"]);
    expect(next.measures[1].keyChange).toBe(true);
    expect(next.voices[0].events[0].tie).toBe(false);
  });
  it("no deja la partitura sin compases ni acepta compases inexistentes", () => {
    let score = sample();
    for (let i = 0; i < 3; i++) score = removeMeasure(score, 1);
    expect(() => removeMeasure(score, 1)).toThrow(/al menos un compás/);
    expect(() => removeMeasure(sample(), 9)).toThrow(RangeError);
    expect(score.scenes[0]).toMatchObject({ startMeasure: 1, endMeasure: 1 });
  });
  it("duplica un compás sobre otro, reemplazando su contenido", () => {
    const next = duplicateMeasure(sample(), 1, 3);
    expect(pitches(next)).toEqual(["0:C4", "3840:D4", "7680:C4", "11520:F4"]);
    const withChord = duplicateMeasure(sample(), 2, 1);
    expect(withChord.annotations!.filter(a => a.measure === 1).map(a => a.text)).toEqual(["V"]);
    const uneven = sample(); uneven.measures[3].time = [3, 4]; uneven.voices[0].events.pop(); uneven.annotations!.pop();
    expect(() => duplicateMeasure(uneven, 1, 4)).toThrow(/durar lo mismo/);
  });
});

describe("teclado MIDI", () => {
  it("escribe las notas de la escala con la grafía de la armadura", () => {
    expect(spellMidi(60, "C")).toBe("C4");
    expect(spellMidi(66, "G")).toBe("F#4");
    expect(spellMidi(70, "F")).toBe("Bb4");
    expect(spellMidi(61, "Db")).toBe("Db4");
    expect(spellMidi(65, "C#")).toBe("E#4"); // Mi# es nota de Do# mayor
    expect(spellMidi(59, "Cb")).toBe("Cb4"); // Dob4 suena Si3
    expect(spellMidi(60, "C#")).toBe("B#3"); // Si#3 suena Do4
  });
  it("escribe las cromáticas con sostenidos o bemoles según la armadura", () => {
    expect(spellMidi(61, "C")).toBe("C#4");
    expect(spellMidi(61, "G")).toBe("C#4");
    expect(spellMidi(61, "F")).toBe("Db4");
    expect(spellMidi(68, "Eb")).toBe("Ab4"); // de la escala
    expect(spellMidi(66, "Eb")).toBe("Gb4");
  });
  it("toda tecla tiene grafía con la altura correcta en las 15 armaduras", () => {
    for (const key of ["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"])
      for (let midi = 36; midi <= 96; midi++) expect(pitchToMidi(spellMidi(midi, key)), `${key} ${midi}`).toBe(midi);
  });
  it("lee note-on y note-off, e ignora lo demás", () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ type: "on", note: 60, velocity: 100 });
    expect(parseMidiMessage([0x93, 60, 0])).toEqual({ type: "off", note: 60, velocity: 0 });
    expect(parseMidiMessage([0x80, 60, 64])).toEqual({ type: "off", note: 60, velocity: 0 });
    expect(parseMidiMessage([0xb0, 64, 127])).toBeNull();
    expect(parseMidiMessage([0xf8])).toBeNull();
  });
  it("junta teclas simultáneas en un acorde", () => {
    const chords: number[][] = []; let pending: (() => void) | null = null;
    const collector = new ChordCollector(notes => chords.push(notes), 45, run => { pending = run; return 1 as unknown as ReturnType<typeof setTimeout>; }, () => { pending = null; });
    collector.press(64); collector.press(60); collector.press(67);
    expect(chords).toEqual([]);
    pending!();
    collector.press(62); collector.flush();
    expect(chords).toEqual([[60, 64, 67], [62]]);
  });
});
