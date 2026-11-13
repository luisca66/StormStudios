import { describe, expect, it } from "vitest";
import { TRACKS, shuffled } from "./music";

describe("música de Mutación", () => {
  it("cada vuelta toca las 20 pistas sin repetir", () => {
    for (let i = 0; i < 50; i++) {
      const bag = shuffled(null);
      expect(bag).toHaveLength(20);
      expect(new Set(bag).size).toBe(20);
      expect([...bag].sort()).toEqual([...TRACKS].sort());
    }
  });
  it("una vuelta nueva nunca empieza con la última pista que sonó", () => {
    for (const last of TRACKS) for (let i = 0; i < 20; i++) expect(shuffled(last)[0]).not.toBe(last);
  });
});
