import { expect, it } from "vitest";
import sitemap from "./sitemap";

it("lists Lesson 4 in both languages and Lesson 5 only in Spanish while English is in construction", async () => {
  const entries = await sitemap();
  const spanish = entries.find((entry) => entry.url.endsWith("/es/curso-armonia/05-leccion-4"));
  expect(spanish).toBeDefined();
  expect(spanish?.alternates?.languages).toEqual({
    "es-MX": "https://www.stormstudios.com.mx/es/curso-armonia/05-leccion-4",
    "en-US": "https://www.stormstudios.com.mx/en/harmony-course/05-lesson-4-triads-fifth-chords",
  });
  const english = entries.find((entry) => entry.url.endsWith("/en/harmony-course/05-lesson-4-triads-fifth-chords"));
  expect(english?.alternates?.languages).toEqual(spanish?.alternates?.languages);
  expect(entries.some((entry) => entry.url.endsWith("/es/curso-armonia/06-leccion-5"))).toBe(true);
  expect(entries.some((entry) => /\/en\/.*06-lesson-5/.test(entry.url))).toBe(false);
});
