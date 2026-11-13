import { describe, expect, it } from "vitest";
import { alignStreams, buildAudioMap } from "./mapa-audio.mjs";

const board = (...narrations: string[]) => ({ lesson: "t", stills: narrations.map((narration, i) => ({ id: "s" + (i + 1), narration })) });

describe("mapa-audio: still -> voice clip map", () => {
  it("maps whole paragraphs and splits a paragraph shared by several stills", () => {
    const stills = buildAudioMap(board("Hola a todos.", "Empiezo sobre Do.", "Una tercera arriba tenemos Mi.", "Fin."),
      ["Hola a todos.", "Empiezo sobre Do. Una tercera arriba tenemos Mi.", "Fin."]);
    expect(stills.map((s: { start: { clip: number; at: number }; end: { clip: number; at: number } }) => [s.start, s.end])).toEqual([
      [{ clip: 1, at: 0 }, { clip: 1, at: 1 }],
      [{ clip: 2, at: 0 }, { clip: 2, at: 0.359 }],
      [{ clip: 2, at: 0.359 }, { clip: 2, at: 1 }],
      [{ clip: 3, at: 0 }, { clip: 3, at: 1 }],
    ]);
  });

  it("tolerates a small typo recorded in the audio (\"al su grado\")", () => {
    const stills = buildAudioMap(board("Cada acorde es el acorde respectivo a su grado.", "Sigue la escala mayor natural."),
      ["Cada acorde es el acorde respectivo al su grado.", "Sigue la escala mayor natural."]);
    expect(stills[1].start).toEqual({ clip: 2, at: 0 });
  });

  it("stops with the still id when narration and script really diverge", () => {
    expect(() => buildAudioMap(board("Hola a todos.", "Un texto que el guion no tiene en ninguna parte del todo."), ["Hola a todos.", "Fin de la lección y despedida cordial."]))
      .toThrow(/s2/);
  });

  it("aligns identical streams one to one", () => {
    const { map } = alignStreams("abcdef", "abcdef");
    expect(Array.from(map!)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
