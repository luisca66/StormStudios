import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildAlternates } from "@/lib/seo/page-alternates";
import { BLOG_POST_TRANSLATIONS, getBlogPostUrls } from "./blog-post-translations";

function postSlugs(locale: "es" | "en") {
  return readdirSync(path.join(process.cwd(), "content", "blog", locale))
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

describe("BLOG_POST_TRANSLATIONS", () => {
  // Un post sin registrar no entra al sitemap ni enlaza su traducción.
  it.each(["es", "en"] as const)("registers every %s post in content/blog", (locale) => {
    const registered = new Set(BLOG_POST_TRANSLATIONS.map((entry) => entry.slugs[locale]));
    expect(postSlugs(locale).filter((slug) => !registered.has(slug))).toEqual([]);
  });

  it.each(["es", "en"] as const)("points every %s slug at an existing post", (locale) => {
    const files = new Set(postSlugs(locale));
    expect(BLOG_POST_TRANSLATIONS.map((entry) => entry.slugs[locale]).filter((slug) => !files.has(slug))).toEqual([]);
  });
});

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
