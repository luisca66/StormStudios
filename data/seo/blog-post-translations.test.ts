import { describe, expect, it } from "vitest";
import { buildAlternates } from "@/lib/seo/page-alternates";
import { getBlogPostUrls } from "./blog-post-translations";

describe("getBlogPostUrls", () => {
  it("links both languages for a translated post", () => {
    expect(getBlogPostUrls("es", "2026-05-21-bienvenida")).toEqual({
      es: "/es/blog/2026-05-21-bienvenida",
      en: "/en/blog/2026-05-21-welcome",
    });
  });

  it("links only its own language for an untranslated post", () => {
    expect(getBlogPostUrls("es", "2026-10-01-solo-espanol")).toEqual({
      es: "/es/blog/2026-10-01-solo-espanol",
    });
  });
});

describe("buildAlternates", () => {
  it("omits hreflang entries for missing translations", () => {
    const alternates = buildAlternates({ en: "/en/blog/english-only" }, "en");
    expect(alternates.canonical).toBe("https://www.stormstudios.com.mx/en/blog/english-only");
    expect(alternates.languages).toEqual({
      "en-US": "https://www.stormstudios.com.mx/en/blog/english-only",
      "x-default": "https://www.stormstudios.com.mx/en/blog/english-only",
    });
  });
});
