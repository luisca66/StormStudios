import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const STORAGE_PREFIX = "storm-bateria:exercise:";
const markupName = '<img src=x onerror="window.__drumXss=1">';

function exercise(name: string) {
  return {
    format: "storm-bateria-v1",
    name,
    savedAt: "2026-11-05T12:00:00.000Z",
    tempo: 127,
    timeSignature: { num: 4, den: 4 },
    bars: 1,
    slots: [Array.from({ length: 16 }, (_, i) => ({
      pieces: i === 0 ? ["bd", "hh"] : [],
      hhOpenByPiece: i === 0 ? { hh: true } : {},
    }))],
  };
}

async function openSavedExercises(page: Page) {
  await page.locator("#archivo-btn").click();
  await page.locator("#dd-abrir").click();
  await expect(page.locator("#modal-open")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost[:/])/, route => route.abort());
  await page.addInitScript(() => {
    (window as Window & { __drumXss?: number }).__drumXss = 0;
  });
});

for (const filename of [
  "storm-bateria-v9.6.html", "storm-bateria-v9.6-en.html",
  "storm-bateria-v9.5.html", "storm-bateria-v9.5-en.html",
]) {
  test(`${filename}: saved exercise names remain literal text`, async ({ page }) => {
    if (filename.includes("v9.5")) {
      // Production redirects legacy URLs; also exercise each retained legacy source.
      const body = await readFile(path.join(__dirname, "../public/apps", filename), "utf8");
      await page.route(`**/apps/${filename}`, route => route.fulfill({ contentType: "text/html", body }));
    }
    await page.goto(`/apps/${filename}`);
    await page.locator("#archivo-btn").click();
    await page.locator("#dd-guardar").click();
    await page.locator("#save-name-input").fill(markupName);
    await Promise.all([
      page.waitForEvent("download"),
      page.locator("#save-confirm-btn").click(),
    ]);
    await openSavedExercises(page);
    const item = page.locator(".exercise-item").filter({ hasText: markupName });
    await expect(item.locator(".exercise-name")).toHaveText(markupName);
    await expect(item.locator("img, script, svg")).toHaveCount(0);
    await expect(item.locator(".exercise-load-btn")).toBeEnabled();
    expect(await page.evaluate(() => (window as Window & { __drumXss?: number }).__drumXss)).toBe(0);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).name, STORAGE_PREFIX + markupName)).toBe(markupName);
  });
}

for (const filename of ["storm-bateria-v9.6.html", "storm-bateria-v9.6-en.html"]) {
  test(`${filename}: rejected records and imports preserve existing exercises`, async ({ page }) => {
    const original = JSON.stringify(exercise("Conservado"));
    const damaged = JSON.stringify({ ...exercise("Dañado"), timeSignature: { num: markupName, den: 4 } });
    const oversized = " ".repeat(65_537);
    await page.addInitScript(({ prefix, original, damaged, oversized }) => {
      localStorage.setItem(prefix + "Conservado", original);
      localStorage.setItem(prefix + "Dañado", damaged);
      localStorage.setItem(prefix + "Grande", oversized);
    }, { prefix: STORAGE_PREFIX, original, damaged, oversized });
    await page.goto(`/apps/${filename}`);
    await openSavedExercises(page);
    await expect(page.locator(".exercise-item")).toHaveCount(3);
    for (const name of ["Dañado", "Grande"]) {
      const item = page.locator(".exercise-item").filter({ hasText: name });
      await expect(item.locator(".exercise-load-btn")).toBeDisabled();
      await expect(item.locator(".exercise-meta")).toContainText(/original.*(guardado|saved)/);
    }
    await expect(page.locator("#exercise-list img, #exercise-list script")).toHaveCount(0);
    await page.locator(".exercise-item").filter({ hasText: "Conservado" }).locator(".exercise-load-btn").click();
    await expect(page.locator("#bpm-display")).toHaveText("127");
    await expect(page.locator("#bars-display")).toHaveText("1");

    // Invalid dimensions are rejected before changing the active score.
    const rejected = { ...exercise("Inválido"), bars: 1_000_000_000 };
    const dialogPromise = page.waitForEvent("dialog");
    await page.locator("#import-file-input").setInputFiles({
      name: "invalid.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(rejected)),
    });
    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/no válidos|invalid/i);
    await dialog.dismiss();
    await expect(page.locator("#bpm-display")).toHaveText("127");
    await expect(page.locator("#bars-display")).toHaveText("1");
    expect(await page.evaluate(prefix => ["Conservado", "Dañado", "Grande"].map(name => localStorage.getItem(prefix + name)), STORAGE_PREFIX))
      .toEqual([original, damaged, oversized]);
    expect(await page.evaluate(() => (window as Window & { __drumXss?: number }).__drumXss)).toBe(0);
  });
}
