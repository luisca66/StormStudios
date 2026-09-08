import { expect, it } from "vitest";
import { GET } from "./route";

it("publishes working localized catalog URLs and excludes draft lessons", async () => {
  const response = GET();
  expect(response.status).toBe(200);
  const catalog = await response.json();
  expect(catalog.apps.length).toBeGreaterThan(10);
  expect(catalog.course.lessons.map((lesson: { id: string }) => lesson.id)).not.toContain("05-leccion-4");
  for (const app of catalog.apps) {
    for (const locale of ["es", "en"]) {
      for (const url of Object.values(app.urls[locale])) {
        expect(url).toMatch(new RegExp(`^https://www\\.stormstudios\\.com\\.mx/${locale}/`));
        expect(url).not.toContain("undefined");
      }
    }
  }
});
