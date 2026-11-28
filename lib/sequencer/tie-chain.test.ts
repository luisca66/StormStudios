import { describe, expect, it } from "vitest";
import { createScore } from "./model";
import { tieChain, tieLinks, withTieChains } from "./tie-chain";
import type { NoteEvent, Score } from "./types";

const note = (id: string, start: number, pitches: string[], duration: NoteEvent["duration"], tie = false): NoteEvent =>
  ({ id, start, duration, dotted: false, triplet: false, pitches, tie });
function melody(events: NoteEvent[]): Score {
  const score = createScore("single");
  score.voices[0].events = events;
  return score;
}

describe("notas ligadas", () => {
  // Mitad ligada sobre la barra (C5), luego otra C5 sin ligar, y un acorde ligado.
  const score = melody([
    note("a", 1920 + 960, ["C5"], "q", true), note("b", 3840, ["C5"], "q", true), note("c", 4800, ["C5"], "h"),
    note("d", 5760 + 960, ["C5"], "q"),
    note("e", 7680, ["C4", "E4"], "h", true), note("f", 9600, ["C4", "E4"], "h"),
  ]);
  it("encuentra la cadena completa desde cualquier pedazo", () => {
    expect(tieChain(score, "a")).toEqual(["a", "b", "c"]);
    expect(tieChain(score, "c")).toEqual(["a", "b", "c"]);
    expect(tieChain(score, "d")).toEqual(["d"]);
    expect(tieChain(score, "f")).toEqual(["e", "f"]);
  });
  it("no liga si hay hueco o cambia la altura", () => {
    const gap = melody([note("a", 0, ["C5"], "q", true), note("b", 1920, ["C5"], "q")]);
    const other = melody([note("a", 0, ["C5"], "q", true), note("b", 960, ["D5"], "q")]);
    expect(tieChain(gap, "a")).toEqual(["a"]);
    expect(tieChain(other, "b")).toEqual(["b"]);
  });
  it("marca qué pedazos se unen al dibujar", () => {
    const links = tieLinks(score.voices[0].events);
    expect(links.get("a")).toEqual({ fromPrevious: false, toNext: true });
    expect(links.get("b")).toEqual({ fromPrevious: true, toNext: true });
    expect(links.get("c")).toEqual({ fromPrevious: true, toNext: false });
    expect(links.get("d")).toEqual({ fromPrevious: false, toNext: false });
  });
  it("seleccionar un pedazo selecciona la nota completa", () => {
    expect(withTieChains(score, ["b"]).sort()).toEqual(["a", "b", "c"]);
    expect(withTieChains(score, ["f@E4"]).sort()).toEqual(["e@E4", "f@E4"]);
  });
});
