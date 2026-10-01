import { expect, it } from "vitest";
import sitemap from "./sitemap";

it("lists Lesson 4 only in its published language", async () => {
  const entries = await sitemap();
  const spanish = entries.find((entry) => entry.url.endsWith("/es/curso-armonia/05-leccion-4"));
  expect(spanish).toBeDefined();
  expect(spanish?.alternates?.languages).toEqual({
    "es-MX": "https://www.stormstudios.com.mx/es/curso-armonia/05-leccion-4",
  });
  expect(entries.some((entry) => entry.url.includes("05-lesson-4"))).toBe(false);
});
