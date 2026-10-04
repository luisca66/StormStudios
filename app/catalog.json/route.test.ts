import { expect, it } from "vitest";
import { GET } from "./route";

it("publishes working localized catalog URLs and only published languages of each lesson", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  const catalog = await response.json();
  expect(catalog.apps.length).toBeGreaterThan(10);
  const lesson4 = catalog.course.lessons.find((lesson: { id: string }) => lesson.id === "05-leccion-4");
  expect(lesson4.urls.es).toBe("https://www.stormstudios.com.mx/es/curso-armonia/05-leccion-4");
  expect(lesson4.urls.en).toBe("https://www.stormstudios.com.mx/en/harmony-course/05-lesson-4-triads-fifth-chords");
  // Lesson 5 is published in Spanish; English waits for its video.
  const lesson5 = catalog.course.lessons.find((lesson: { id: string }) => lesson.id === "06-leccion-5");
  expect(lesson5.urls.es).toBe("https://www.stormstudios.com.mx/es/curso-armonia/06-leccion-5");
  expect(lesson5.urls.en).toBeUndefined();
  for (const app of catalog.apps) {
    for (const locale of ["es", "en"]) {
      for (const url of Object.values(app.urls[locale])) {
        expect(url).toMatch(new RegExp(`^https://www\\.stormstudios\\.com\\.mx/${locale}/`));
        expect(url).not.toContain("undefined");
      }
    }
  }
});
