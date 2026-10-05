import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { LESSON_URL_SLUGS } from "../data/seo/localized-slugs";

for (const locale of ["es", "en"] as const) {
  test(`Lesson 6 uploads SATB MIDI and shows chord analysis in ${locale}`, async ({ page }) => {
    const es = locale === "es";
    const course = es ? "curso-armonia" : "harmony-course";
    const slug = LESSON_URL_SLUGS["07-leccion-6"][locale];
    const videoId = es ? "GbyIAJ5bKac" : "WXghlxZc9Y8";
    await page.goto(`/${locale}/${course}/${slug}`);
    await expect(page.getByRole("heading", { name: es ? "Lección en construcción" : "Coming soon", exact: true })).toHaveCount(0);
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(0);
    await expect(page.locator(`img[src*="${videoId}"], iframe[src*="${videoId}"]`).first()).toBeAttached();
    await page.locator('input[type="file"]').setInputFiles(join(process.cwd(), "lib/maestro-virtual/__fixtures__/Leccion_6_Do_mayor_correcta.mid"));
    await expect(page.getByText(es ? "Puntuación: 100/100" : "Score: 100/100", { exact: true })).toBeVisible();
    const heading = page.getByRole("heading", { name: es ? "Análisis de los acordes" : "Chord analysis", exact: true });
    await expect(heading).toBeVisible();
    const analysis = heading.locator("..");
    await expect(analysis.locator("li")).toHaveCount(8);
    await expect(analysis).toContainText(es ? "Tonalidad reconocida: Do mayor." : "Detected key: C major.");
    await expect(analysis).toContainText(es ? "Estado: fundamental." : "State: root position.");
    await expect(analysis).toContainText(es ? "Acorde 7 (VII, Si disminuido)" : "Chord 7 (VII, B diminished)");

    await page.getByRole("button", { name: es ? "Subir otro archivo" : "Upload another file" }).click();
    await page.locator('input[type="file"]').setInputFiles(join(process.cwd(), "lib/maestro-virtual/__fixtures__/Leccion_6_Do_mayor_errores.mid"));
    await expect(page.getByText(es ? "Puntuación: 0/100" : "Score: 0/100", { exact: true })).toBeVisible();
    const errors = page.getByRole("heading", { name: es ? "Errores a corregir" : "Errors to correct" });
    await expect(errors).toBeVisible();
    await expect(heading).toBeVisible();
    // The lesson text mentions measures; the feedback must speak of chords instead.
    await expect(errors.locator("..").getByText(es ? "compás" : "measure", { exact: false })).toHaveCount(0);
  });
}
