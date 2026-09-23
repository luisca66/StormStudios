import { describe, expect, it } from "vitest";
import { getAllResources } from "@/data/resources/resources-catalog";
import { getAllLessons, getLessonUrlSlug } from "@/lib/course";
import { translateLessonSlug, translateResourceSlug } from "./localized-slugs";

describe("localized slug maps", () => {
  it("translates every resource slug in both directions", () => {
    for (const resource of getAllResources()) {
      expect(translateResourceSlug("es", resource.slugs.es, "en")).toBe(resource.slugs.en);
      expect(translateResourceSlug("en", resource.slugs.en, "es")).toBe(resource.slugs.es);
    }
  });

  it("translates localized and legacy lesson slugs", () => {
    for (const lesson of getAllLessons()) {
      const es = getLessonUrlSlug(lesson, "es");
      const en = getLessonUrlSlug(lesson, "en");
      expect(translateLessonSlug("es", es, "en")).toBe(en);
      expect(translateLessonSlug("en", en, "es")).toBe(es);
      expect(translateLessonSlug("en", lesson.slug, "es")).toBe(es);
    }
  });

  it("returns undefined for unknown slugs", () => {
    expect(translateResourceSlug("es", "no-existe", "en")).toBeUndefined();
    expect(translateLessonSlug("es", "no-existe", "en")).toBeUndefined();
  });
});
