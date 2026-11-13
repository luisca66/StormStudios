import { describe, expect, it } from "vitest";
import { resolveProject } from "./storyboard-resolve";
import { stillMusic } from "./still-audio";
import { PPQ } from "./types";

describe("visible still audio", () => {
  it("clips at reveal, keeps the project tempo and generates musical cursors across barlines", () => {
    const score = resolveProject({ setup: { mode: "single", measures: 3, time: [3, 4], tempo: 72 }, text: "compas 2\nC4 Mitad puntillo" });
    const music = stillMusic(score, { id: "partial", measures: [2, 3], reveal: { measure: 3, beat: 2.5 } });
    expect(music.from).toBe(3 * PPQ);
    expect(music.to).toBe(7.5 * PPQ);
    expect(music.tempo).toBe(72);
    expect(music.beats.map(b => b.cursor)).toEqual([{ measure: 2, beat: 1 }, { measure: 2, beat: 2 }, { measure: 2, beat: 3 }, { measure: 3, beat: 1 }, { measure: 3, beat: 2 }]);
    expect(music.beats[3].time).toBe(2.5);
  });
  it("plays only visible voices on Piano, independent of editor mute and solo settings", () => {
    const score = resolveProject({ setup: { mode: "satb", measures: 1 }, text: "voz soprano\nC5 Cuarto\nvoz bass\nC3 Cuarto" });
    score.voices[0].solo = true;
    const music = stillMusic(score, { id: "bass", voices: ["bass"] });
    expect(music.score.voices.every(v => v.instrument === "Piano" && !v.solo)).toBe(true);
    expect(music.score.voices.filter(v => !v.mute).map(v => v.id)).toEqual(["bass"]);
    expect(score.voices[0].solo).toBe(true);
    expect(() => stillMusic(score, { id: "empty", reveal: { measure: 1 } })).toThrow("no hay música visible");
  });
});
