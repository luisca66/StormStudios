import { expect, test } from "@playwright/test";
import type { Still, Storyboard } from "../lib/sequencer/storyboard";
import example from "../content/storyboards/es/ejemplo-intervalos.json";
import type { Score } from "../lib/sequencer/types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/es/sequencer/v4/stage");
  await page.waitForFunction(() => !!window.stormStage);
});

test("reveal preserves engraving, precise highlight/cursor positions and notehead marks", async ({ page }) => {
  const prepared = await page.evaluate(board => window.stormStage!.prepare(board), example);
  const score = prepared.scores.escala;
  const draw = async (still: Still) => page.evaluate(({ still, score }) => window.stormStage!.render(still, score), { still, score });
  const positions = () => page.locator("[data-note-id]").evaluateAll(nodes => nodes.map(node => {
    const box = (node as SVGGraphicsElement).getBBox();
    return { x: box.x, y: box.y, width: box.width, height: box.height, start: node.getAttribute("data-event-start") };
  }));
  await draw(prepared.storyboard.stills[1]);
  const first = await positions();
  expect(first).toHaveLength(8);
  expect(await page.locator('[data-note-id][style*="opacity: 0"]').count()).toBe(7);
  await draw(prepared.storyboard.stills[3]);
  expect(await positions()).toEqual(first);
  expect(await page.locator('[data-note-id][style*="opacity: 0"]').count()).toBe(5);
  await draw({ ...prepared.storyboard.stills[4], cursor: { measure: 1, beat: 3 } });
  const geometry = await page.locator('[data-measure="1"] svg').evaluate(svg => {
    const highlight = svg.querySelector("[data-highlight]")!;
    const cursor = svg.querySelector('[data-testid="still-cursor"]')!;
    const mi = (svg.querySelector('[data-event-start="1920"] .vf-notehead') as SVGGraphicsElement).getBBox();
    const re = (svg.querySelector('[data-event-start="960"] .vf-notehead') as SVGGraphicsElement).getBBox();
    return { left: Number(highlight.getAttribute("x")), right: Number(highlight.getAttribute("x")) + Number(highlight.getAttribute("width")), mi: mi.x, re: re.x, cursor: Number(cursor.getAttribute("x1")) };
  });
  expect(geometry.left).toBeGreaterThan(geometry.re + 12);
  expect(geometry.left).toBeLessThan(geometry.mi);
  expect(geometry.right).toBeGreaterThan(geometry.mi);
  expect(Math.abs(geometry.cursor - geometry.mi)).toBeLessThan(10);
  await draw(prepared.storyboard.stills[6]);
  expect(await page.locator('[data-event-start="1920"] .vf-notehead').getAttribute("fill")).toBe("#f0567a");
  expect(await page.locator('[data-event-start="5760"] .vf-notehead').getAttribute("fill")).toBe("#8b5cf6");
});

for (const [aspect, width, height] of [["16:9", 1920, 1080], ["9:16", 1080, 1920], ["1:1", 1080, 1080]] as const) {
  test(`exact ${aspect} PNG, paper theme, voice filtering and ciphers`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const prepared = await page.evaluate(board => window.stormStage!.prepare(board), example);
    const still: Still = { ...prepared.storyboard.stills[7], voices: ["bass"], showCiphers: false };
    await page.evaluate(({ still, score, aspect }) => window.stormStage!.render(still, score, { aspect, theme: "paper" }), { still, score: prepared.scores.cadencia, aspect });
    await expect(page.locator("html")).toHaveAttribute("data-stage-ready", "1");
    await expect(page.locator('[data-event-voice="soprano"]')).toHaveCount(0);
    await expect(page.locator('[data-event-voice="bass"]')).toHaveCount(2);
    const png = await page.getByTestId("still").screenshot();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width, height]);
    expect(await page.locator('[data-testid="score-view"] svg text').allTextContents()).not.toContain("I");
    await page.evaluate(({ still, score, aspect }) => window.stormStage!.render({ ...still, showCiphers: true }, score, { aspect, width: 540 }), { still, score: prepared.scores.cadencia, aspect });
    expect(await page.locator('[data-testid="score-view"] svg text').allTextContents()).toContain("I");
    const scaled = await page.getByTestId("still").screenshot();
    expect(scaled.readUInt32BE(16)).toBe(540);
    expect(scaled.readUInt32BE(20)).toBe(Math.round(540 * height / width));
  });
}

test("CLI embeds relative files, honors only/order, emits exact PNG and manifest", async ({ page }) => {
  test.setTimeout(90000);
  const score: Score = await page.evaluate(board => window.stormStage!.prepare(board).scores.escala, example);
  const folder = path.resolve("stills", "integration-test");
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "score.json"), JSON.stringify(score));
  const board: Storyboard = { version: 1, lesson: "file-test", locale: "es", title: "Archivo relativo", format: { width: 960 }, projects: { imported: { file: "score.json" } }, stills: [{ id: "skip", kind: "title" }, { id: "chosen", project: "imported", duration: 3, narration: "Prueba" }] };
  await writeFile(path.join(folder, "board.json"), JSON.stringify(board));
  const { stdout } = await promisify(execFile)(process.execPath, ["scripts/sequencer/stills.mjs", path.join(folder, "board.json"), "--out", folder, "--only", "chosen"], { timeout: 60000 });
  expect(stdout).toContain("02-chosen.png");
  const manifest = JSON.parse(await readFile(path.join(folder, "manifest.json"), "utf8"));
  expect(manifest.stills).toEqual([{ id: "chosen", file: "02-chosen.png", duration: 3, narration: "Prueba" }]);
  const png = await readFile(path.join(folder, "02-chosen.png"));
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([960, 540]);
});
