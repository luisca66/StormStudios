import { expect, test } from "@playwright/test";
import type { Still, Storyboard } from "../lib/sequencer/storyboard";
import example from "../content/storyboards/es/ejemplo-intervalos.json";
import lessonSix from "../content/storyboards/es/07-leccion-6.json";
import type { Score } from "../lib/sequencer/types";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("/es/sequencer/v4/stage");
  await page.waitForFunction(() => !!window.stormStage);
});

for (const locale of ["es", "en"] as const) {
  test(`short SATB systems retain complete ${locale} names, aligned notes and clear marks`, async ({ page }) => {
    await page.goto(`/${locale}/sequencer/v4/stage`);
    await page.waitForFunction(() => !!window.stormStage);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const prepared = await page.evaluate(board => window.stormStage!.prepare(board), { ...lessonSix, locale });
    for (const id of ["do-duplica", "solb-duplica", "tesituras", "estados"]) {
      const still = prepared.storyboard.stills.find(s => s.id === id)!;
      await page.evaluate(({ still, score }) => window.stormStage!.render(still, score), { still, score: prepared.scores[still.project!] });
      const result = await page.getByTestId("score-view").evaluate(surface => {
        const bounds = (e: Element) => { const b = e.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; };
        const texts = [...surface.querySelectorAll("svg text")];
        const notes = [...surface.querySelectorAll(".vf-notehead")].map(bounds);
        return {
          names: texts.map(e => e.textContent),
          labels: [...surface.querySelectorAll("[data-mark-label]")].map(bounds), notes,
          system: bounds(surface.querySelector("svg")!), paper: bounds(surface.closest("[data-testid=still]")!),
        };
      });
      for (const name of ["Soprano", locale === "es" ? "Contralto" : "Alto", "Tenor", locale === "es" ? "Bajo" : "Bass"]) expect(result.names).toContain(name);
      expect(result.system.left).toBeGreaterThan(result.paper.left + 80);
      expect(result.system.right).toBeLessThan(result.paper.right - 80);
      const overlaps = (a: typeof result.system, b: typeof result.system) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      for (const [i, label] of result.labels.entries()) {
        expect(result.notes.some(note => overlaps(label, note))).toBe(false);
        expect(result.labels.slice(i + 1).some(other => overlaps(label, other))).toBe(false);
      }
      if (id.endsWith("duplica")) expect(Math.max(...result.notes.map(n => n.left)) - Math.min(...result.notes.map(n => n.left))).toBeLessThan(3);
    }
  });
}

test("stage exports audible Piano WAV through the local proxy, stopping at reveal", async ({ page }) => {
  const sample = Buffer.alloc(44 + 4410 * 2);
  sample.write("RIFF"); sample.writeUInt32LE(sample.length - 8, 4); sample.write("WAVEfmt ", 8);
  sample.writeUInt32LE(16, 16); sample.writeUInt16LE(1, 20); sample.writeUInt16LE(1, 22);
  sample.writeUInt32LE(44100, 24); sample.writeUInt32LE(88200, 28); sample.writeUInt16LE(2, 32); sample.writeUInt16LE(16, 34);
  sample.write("data", 36); sample.writeUInt32LE(sample.length - 44, 40);
  for (let i = 0; i < 4410; i++) sample.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 261.63 / 44100) * 5000), 44 + i * 2);
  const requested: string[] = [];
  await page.route("**/api/audio/**", route => { requested.push(route.request().url()); return route.fulfill({ body: sample, contentType: "audio/wav" }); });
  const result = await page.evaluate(async () => {
    const prepared = window.stormStage!.prepare({ version: 1, lesson: "audio-test", locale: "es", title: "Test", projects: { main: { setup: { mode: "single", measures: 1, tempo: 72 }, text: "C4 Mitad; G4 Mitad" } }, stills: [{ id: "partial", project: "main", reveal: { measure: 1, beat: 3 }, audio: true }] });
    return window.stormStage!.wav(prepared.storyboard.stills[0], prepared.scores.main);
  });
  const wav = Buffer.from(result.base64, "base64");
  expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  expect(wav.readUInt32LE(24)).toBe(44100);
  expect((wav.length - 44) / 4 / 44100).toBeCloseTo(2 * 60 / 72 + .2, 4);
  expect(requested).toHaveLength(1);
  expect(requested[0]).toContain("/api/audio/Piano/C4.mp3");
  expect(result.music.beats.map(b => b.cursor.beat)).toEqual([1, 2]);
  expect(wav.subarray(44).some(value => value !== 0)).toBe(true);
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

for (const aspect of ["16:9", "9:16", "1:1"] as const) {
  test(`image SVG fits ${aspect}, waits for decode and shows credit only during music`, async ({ page }) => {
    const still: Still = { id: "image", kind: "image", image: "/images/curso/leccion-5/circulo-quintas-es.svg", heading: "El círculo de quintas", caption: "Quince tonalidades", musicFile: "local.mp3", musicCredit: "Obra — Compositor · Intérpretes" };
    const render = async (music = false) => page.evaluate(({ still, aspect, music }) => window.stormStage!.render(still, null, { aspect }, undefined, { music }), { still, aspect, music });
    const width = aspect === "16:9" ? 1920 : 1080, height = aspect === "9:16" ? 1920 : 1080;
    await page.setViewportSize({ width, height });
    await render();
    await expect(page.getByTestId("still-image")).toHaveAttribute("src", still.image!);
    await expect(page.getByTestId("music-credit")).toHaveCount(0);
    const bounds = await page.getByTestId("still-image").evaluate(img => {
      const image = img as HTMLImageElement, box = image.getBoundingClientRect();
      return { complete: image.complete && image.naturalWidth > 0, left: box.left, top: box.top, right: box.right, bottom: box.bottom, fit: getComputedStyle(image).objectFit };
    });
    expect(bounds.complete).toBe(true); expect(bounds.fit).toBe("contain");
    expect(bounds.left).toBeGreaterThan(0); expect(bounds.top).toBeGreaterThan(0);
    expect(bounds.right).toBeLessThan(width); expect(bounds.bottom).toBeLessThan(height);
    await expect(page.getByTestId("score-view")).toHaveCount(0);
    const png = await page.getByTestId("still").screenshot();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([width, height]);
    await render(true); await expect(page.getByTestId("music-credit")).toHaveText(still.musicCredit!);
    await render(); await expect(page.getByTestId("music-credit")).toHaveCount(0);
    await expect(page.evaluate(still => window.stormStage!.render({ ...still, image: "/images/missing.svg" }, null), still)).rejects.toThrow(/Still "image".*No se pudo cargar image/);
  });
}
