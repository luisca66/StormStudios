import { afterEach, describe, expect, it, vi } from "vitest";
import { installAgentApi } from "./agent-api";
import { createScore } from "./model";

afterEach(() => vi.unstubAllGlobals());
describe("editor agent API", () => {
  it("reads live state, loads valid input, rejects invalid input atomically and cleans up", () => {
    vi.stubGlobal("window", {});
    let score = createScore();
    const dispose = installAgentApi({ getScore: () => score, loadScore: next => { score = next; } });
    const api = window.stormSequencer!;
    expect(api.version).toBe(1);
    api.getScore().title = "Mutation";
    expect(score.title).not.toBe("Mutation");
    expect(api.loadText("C4 negra; D4 negra").issues).toEqual([]);
    expect(score.voices[0].events).toHaveLength(2);
    expect(api.describe()).toContain("Compás 1 (4/4, C): 2 eventos; 1: C4 q; 2: D4 q");
    const before = structuredClone(score);
    expect(api.loadText("no es música").score).toBeNull();
    expect(score).toEqual(before);
    expect(() => api.loadScore({ version: 99 })).toThrow();
    expect(score).toEqual(before);
    const next = createScore("satb"); next.title = "Cuarteto";
    api.loadScore(JSON.stringify(next));
    expect(api.describe()).toContain("Voz bass");
    expect(api.getScore().title).toBe("Cuarteto");
    dispose(); expect(window.stormSequencer).toBeUndefined();
  });
  it("old cleanup never removes a newer installation", () => {
    vi.stubGlobal("window", {});
    const handlers = { getScore: createScore, loadScore: vi.fn() };
    const first = installAgentApi(handlers);
    const second = installAgentApi(handlers);
    first(); expect(window.stormSequencer).toBeDefined();
    second(); expect(window.stormSequencer).toBeUndefined();
  });
});
