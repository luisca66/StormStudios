import { expect, test } from "@playwright/test";

test("Spanish lesson plays the approved YouTube video", async ({ page }) => {
  await page.goto("/es/curso-armonia/05-leccion-4");
  await expect(page.getByRole("heading", { name: "Lección 4 — Acordes de 5a" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu tarea" })).toBeVisible();
  await expect(page.getByText("Lección en construcción", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "El Acorde de Sexta" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reproducir video: Acordes de 5a" }).click();
  await expect(page.locator('iframe[title="Acordes de 5a"]')).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/omBSeuK90e4\?si=tWB-Kv3ctWQF3Gjg&autoplay=1/);
});

test("English lesson announces the translation without playing the Spanish video", async ({ page }) => {
  await page.goto("/en/harmony-course/05-lesson-4-triads-fifth-chords");
  await expect(page.getByRole("heading", { name: "Coming soon", exact: true })).toBeVisible();
  await expect(page.getByText("The English version of Lesson 4 is coming soon.", { exact: true })).toBeVisible();
  await expect(page.locator('iframe[src*="omBSeuK90e4"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Play video/ })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
