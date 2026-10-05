import { describe, expect, it } from "vitest";
import { captureLayout } from "./capture-layout";
import { resolveProject } from "./storyboard-resolve";
import type { Still } from "./storyboard";

describe("SATB capture layout", () => {
  it.each([1, 2, 3])("keeps %i whole-note measures compact, with room for four readable voices", measures => {
    const score = resolveProject({ setup: { mode: "satb", measures }, text: "voz soprano\nC5 entera\nvoz alto\nE4 entera\nvoz tenor\nG3 entera\nvoz bass\nC3 entera" });
    const still: Still = { id: "vocal", project: "main" };
    const layout = captureLayout(score, still, 1632, 606);
    const width = Object.values(layout.widths).reduce((a, b) => a + b) * layout.scale;
    expect(width).toBeLessThan(1632);
    expect(layout.scale * 40).toBeGreaterThan(50);
    expect(layout.widths[1]).toBeGreaterThan(400);
    expect(captureLayout(score, { ...still, reveal: { measure: 1 }, marks: [{ measure: 1, beat: 1, voice: "bass", label: "fundamental" }] }, 1632, 606)).toEqual(layout);
  });
  it("preserves full-width single-voice engraving", () => {
    const score = resolveProject({ setup: { mode: "single", measures: 1 }, text: "C4 entera" });
    const layout = captureLayout(score, { id: "single", project: "main" }, 1632, 606);
    expect(layout.widths[1] * layout.scale).toBeCloseTo(1632);
  });
});
