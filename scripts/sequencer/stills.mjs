#!/usr/bin/env node
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === "--help") {
    console.log("Uso: npm run stills -- <storyboard.json> [--out <dir>] [--base http://localhost:3100] [--only id1,id2]");
    return;
  }
  const input = path.resolve(args.shift());
  const options = {};
  while (args.length) {
    const flag = args.shift(), value = args.shift();
    if (!["--out", "--base", "--only"].includes(flag) || !value || value.startsWith("--")) throw new Error(`Opción inválida: ${flag}`);
    options[flag] = value;
  }
  const board = JSON.parse(await readFile(input, "utf8"));
  if (!["es", "en"].includes(board.locale)) throw new Error("locale debe ser es o en");
  for (const [name, source] of Object.entries(board.projects ?? {})) {
    if (source && typeof source === "object" && Object.hasOwn(source, "file")) {
      if (Object.keys(source).length !== 1 || typeof source.file !== "string") throw new Error(`Project "${name}": {file} debe contener solo una ruta`);
      try { board.projects[name] = { score: JSON.parse(await readFile(path.resolve(path.dirname(input), source.file), "utf8")) }; }
      catch (error) { throw new Error(`Project "${name}" (${source.file}), stills ${(board.stills ?? []).filter(s => s.project === name).map(s => s.id).join(", ")}: ${error.message}`); }
    }
  }
  const base = options["--base"] ?? "http://localhost:3100";
  const url = new URL(`${base.replace(/\/$/, "")}/${board.locale}/sequencer/v4/stage`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("--base debe ser una URL HTTP(S)");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    page.setDefaultTimeout(45000);
    const response = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 90000 }).catch(error => {
      throw new Error(`No se pudo abrir ${url.href}. Verifica el servidor y --base. ${error.message}`);
    });
    if (!response?.ok()) throw new Error(`Stage devolvió HTTP ${response?.status()}`);
    // Hide the dev portal even if the page implementation changes or Next mounts it later.
    await page.addStyleTag({ content: "nextjs-portal { display:none !important; }" });
    await page.waitForFunction(() => Boolean(window.stormStage));
    // Use the same validator and resolver as the editor/stage, with no second grammar implementation.
    const prepared = await page.evaluate(value => window.stormStage.prepare(value), board);
    const storyboard = prepared.storyboard;
    const aspect = storyboard.format?.aspect ?? "16:9";
    const width = storyboard.format?.width ?? (aspect === "16:9" ? 1920 : 1080);
    const [x, y] = aspect.split(":").map(Number), height = Math.round(width * y / x);
    await page.setViewportSize({ width, height });
    const only = options["--only"] ? new Set(options["--only"].split(",")) : null;
    if (only) for (const id of only) if (!storyboard.stills.some(s => s.id === id)) throw new Error(`--only: still inexistente "${id}"`);
    const out = path.resolve(options["--out"] ?? path.join("stills", storyboard.locale, storyboard.lesson));
    await mkdir(out, { recursive: true });
    /** @type {import('../../lib/sequencer/storyboard').StillsManifest} */
    const manifest = { lesson: storyboard.lesson, locale: storyboard.locale, title: storyboard.title, width, height, generatedAt: new Date().toISOString(), stills: [] };
    for (const [index, still] of storyboard.stills.entries()) {
      if (only && !only.has(still.id)) continue;
      const file = `${String(index + 1).padStart(2, "0")}-${still.id}.png`;
      try {
        if (still.audio) console.warn(`Still "${still.id}": audio está reservado; esta versión genera solo PNG.`);
        await page.evaluate(async ({ still, score, format, context }) => {
          await window.stormStage.render(still, score, format, context);
        }, { still, score: still.project ? prepared.scores[still.project] : null, format: storyboard.format,
          context: { lesson: storyboard.lesson, title: storyboard.title, index: index + 1, total: storyboard.stills.length } });
        await page.waitForFunction(() => document.documentElement.dataset.stageReady === "1");
        const element = page.getByTestId("still");
        const bounds = await element.boundingBox();
        if (!bounds || bounds.width !== width || bounds.height !== height) throw new Error(`Tamaño inesperado: ${JSON.stringify(bounds)}`);
        await element.screenshot({ path: path.join(out, file), animations: "disabled", scale: "css" });
        manifest.stills.push({ id: still.id, file, duration: still.duration ?? 5, heading: still.heading, caption: still.caption, narration: still.narration });
        console.log(`${still.id} → ${path.join(out, file)} (${width}×${height})`);
      } catch (error) { throw new Error(`Still "${still.id}": ${error.message}`); }
    }
    await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
    console.log(`Manifest: ${path.join(out, "manifest.json")}`);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(`Stills: ${error.message}`); process.exitCode = 1; });
