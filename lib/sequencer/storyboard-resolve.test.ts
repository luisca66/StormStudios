import { describe, expect, it } from "vitest";
import { resolveProject, stillDimensions, validateStoryboard } from "./storyboard-resolve";
import type { Storyboard } from "./storyboard";
import { captureX } from "./capture-decoration";
import example from "../../content/storyboards/es/ejemplo-intervalos.json";

const board = (): Storyboard => ({ version: 1, lesson: "test", locale: "es", title: "Test", projects: { main: { setup: { mode: "single", measures: 2 }, text: "C4 negra; D4 negra" } }, stills: [{ id: "one", project: "main" }] });
describe("storyboard resolver", () => {
  it("constructs before parsing, preserves setup and annotations", () => {
    const score = resolveProject({ setup: { mode: "single", measures: 1, time: [3, 4], key: "G", tempo: 72, clef: "bass", title: "Test" }, text: "G2 blanca; A2 negra", annotations: [{ measure: 1, beat: 1, kind: "roman", text: "I" }] });
    expect(score.measures).toHaveLength(1);
    expect(score.measures[0]).toMatchObject({ time: [3, 4], key: "G" });
    expect(score.voices[0].clef).toBe("bass");
    expect(score.voices[0].events[1].start).toBe(1920);
    expect(score.annotations?.[0]).toMatchObject({ text: "I", id: expect.any(String) });
    expect(score.scenes[0].endMeasure).toBe(1);
    expect(score.tempo).toBe(72);
    expect(resolveProject({ score })).toEqual(score);
  });
  it("reports text line, project and still", () => {
    const b = board(); b.projects.main = { setup: { mode: "single", measures: 1 }, text: "voz melody\nX4 negra" };
    expect(() => validateStoryboard(b)).toThrow(/Still "one".*project "main".*línea 2/);
  });
  it("requires files to be embedded by CLI", () => expect(() => resolveProject({ file: "saved.json" })).toThrow(/incrustarse/));
  it("validates the working example", () => expect(validateStoryboard(example).stills).toHaveLength(8));
  it.each([
    ["duplicates", (b: Storyboard) => b.stills.push({ ...b.stills[0] }), /duplicado/],
    ["missing project", (b: Storyboard) => { b.stills[0].project = "absent"; }, /project inexistente/],
    ["range", (b: Storyboard) => { b.stills[0].measures = [1, 3]; }, /rango/],
    ["beat", (b: Storyboard) => { b.stills[0].cursor = { measure: 1, beat: 6 }; }, /pulso fuera/],
    ["voice", (b: Storyboard) => { b.stills[0].focusVoice = "bass"; }, /voz inexistente/],
    ["empty highlight", (b: Storyboard) => { b.stills[0].highlights = [{ measure: 1, beat: 3, endBeat: 2 }]; }, /posterior/],
    ["missing note", (b: Storyboard) => { b.stills[0].marks = [{ measure: 1, beat: 3 }]; }, /no hay nota/],
  ])("rejects %s with still context", (_, change, message) => {
    const b = board(); change(b);
    expect(() => validateStoryboard(b)).toThrow(message);
    expect(() => validateStoryboard(b)).toThrow(/Still "one"/);
  });
  it("rejects unknown/mistyped fields with still id", () => {
    const b = board(); Object.assign(b.stills[0], { duration: "5" });
    expect(() => validateStoryboard(b)).toThrow(/Still "one".*duration/);
    expect(() => validateStoryboard(null)).toThrow();
  });
  it("accepts title without project and end-of-bar reveal", () => {
    const b = board(); b.stills[0].reveal = { measure: 2, beat: 5 };
    b.stills.push({ id: "title", kind: "title", heading: "Hola" });
    expect(validateStoryboard(b).stills).toHaveLength(2);
  });
  it("computes exact output dimensions and scales width", () => {
    expect(stillDimensions()).toEqual({ width: 1920, height: 1080 });
    expect(stillDimensions({ aspect: "9:16" })).toEqual({ width: 1080, height: 1920 });
    expect(stillDimensions({ aspect: "1:1" })).toEqual({ width: 1080, height: 1080 });
    expect(stillDimensions({ width: 960 })).toEqual({ width: 960, height: 540 });
  });
  it("positions fractional beats using nonuniform engraved anchors", () => {
    const row = { voice: "melody" as const, top: 0, bottom: 40, left: 20, right: 600, anchors: [{ tick: 0, x: 100 }, { tick: 960, x: 200 }, { tick: 1920, x: 500 }] };
    expect(captureX(row, 960)).toBe(200);
    expect(captureX(row, 1440)).toBe(350);
  });
});
