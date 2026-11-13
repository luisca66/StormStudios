import { describe, expect, it } from "vitest";
import { getMasteryPiece } from "@/lib/mdx";
import { getMasteryPieceSlug, getMasteryPieceUrls, MASTERY_TRANSLATIONS } from "./mastery-translations";

describe("getMasteryPieceUrls", () => {
  it("links both languages for a translated piece", () => {
    expect(getMasteryPieceUrls("en", "from-sunlight-to-strength")).toEqual({
      es: "/es/maestria/del-sol-a-la-fuerza",
      en: "/en/mastery/from-sunlight-to-strength",
    });
  });

  it("links only its own language for an untranslated piece", () => {
    expect(getMasteryPieceUrls("es", "solo-espanol")).toEqual({ es: "/es/maestria/solo-espanol" });
  });
});

describe("getMasteryPieceSlug", () => {
  it("translates the slug for the language switcher", () => {
    expect(getMasteryPieceSlug("es", "del-sol-a-la-fuerza", "en")).toBe("from-sunlight-to-strength");
  });
});

describe("MASTERY_TRANSLATIONS", () => {
  it.each(MASTERY_TRANSLATIONS)("$key exists in both languages with its own video", async ({ slugs }) => {
    const [es, en] = await Promise.all([getMasteryPiece("es", slugs.es), getMasteryPiece("en", slugs.en)]);
    expect(es?.frontmatter.youtubeId).toBeTruthy();
    expect(en?.frontmatter.youtubeId).toBeTruthy();
    expect(es?.frontmatter.youtubeId).not.toBe(en?.frontmatter.youtubeId);
  });
});
