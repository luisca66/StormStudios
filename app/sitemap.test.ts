import { expect, it } from "vitest";
import sitemap from "./sitemap";

it("lists Lessons 4, 5 and 6 in both languages", async () => {
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
  expect(entries.some((entry) => entry.url.endsWith("/en/harmony-course/06-lesson-5-degrees-chords-tonality"))).toBe(true);
  expect(entries.some((entry) => entry.url.endsWith("/es/curso-armonia/07-leccion-6"))).toBe(true);
  expect(entries.some((entry) => entry.url.endsWith("/en/harmony-course/07-lesson-6-harmonic-vocal-quartet"))).toBe(true);
});
