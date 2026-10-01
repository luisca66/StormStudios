import { describe, expect, it } from "vitest";
import { concatFile, nearestPause, silenceMidpoints, srtTime, validateAudioMap, xmlParagraphs, partialSubtitle } from "./video-utils.mjs";
import spanish from "../../content/storyboards/es/05-leccion-4.json";
import english from "../../content/storyboards/en/05-leccion-4.json";
import englishMap from "../../content/storyboards/en/05-leccion-4.audio.json";

describe("lesson video timing and script", () => {
  it("preserves Spanish music and the 58 visual steps while covering all English voice clips", () => {
    expect(english.stills.map(s => s.id)).toEqual(spanish.stills.map(s => s.id));
    for (const key of Object.keys(spanish.projects) as Array<keyof typeof spanish.projects>) {
      expect(english.projects[key].text).toBe(spanish.projects[key].text);
      expect(english.projects[key].setup.key).toBe(spanish.projects[key].setup.key);
      expect(english.projects[key].setup.tempo).toBe(spanish.projects[key].setup.tempo);
    }
    expect(englishMap.source.clips).toBe(137);
    expect(() => validateAudioMap(english, englishMap)).not.toThrow();
    expect(englishMap.stills.find(s => s.id === "do-tercera")?.partialText?.[17]).toBe("A third above C is E,");
  });
  it("uses map text for divided English clips and preserves whole clips and Spanish legacy text", () => {
    const entry = { id: "do-tercera", partialText: { 17: "A third above C is E," } };
    expect(partialSubtitle(entry, 17, "A third above C is E, and a third above E is G.", 0, 2, 4)).toBe("A third above C is E,");
    expect(partialSubtitle(entry, 18, "So we have C, E, and G.", 0, 3, 3)).toBe("So we have C, E, and G.");
    expect(partialSubtitle({ id: "do-quinta" }, 16, "Empiezo sobre Do. Una tercera arriba tenemos Mi, y una tercera arriba de Mi tenemos Sol.", 4, 6, 6)).toBe("y una tercera arriba de Mi tenemos Sol.");
    expect(() => partialSubtitle({ id: "other" }, 17, "Hello.", 0, 1, 2)).toThrow("texto explícito");
  });
  it("reads split DOCX runs and entities while excluding empty paragraphs", () => {
    expect(xmlParagraphs('<w:document><w:p><w:r><w:t>Do &amp; </w:t></w:r><w:r><w:t>Mi&#33;</w:t></w:r></w:p><w:p/><w:p><w:r><w:t>Sol</w:t><w:br/><w:t>La</w:t></w:r></w:p></w:document>')).toEqual(["Do & Mi!", "Sol La"]);
  });
  it("snaps clip boundaries to the middle of the nearest detected silence", () => {
    const pauses = silenceMidpoints("silence_start: 1.0978\nsilence_end: 2.033401\nsilence_start: 3.680431\nsilence_end: 3.976349");
    expect(nearestPause(pauses, .2, 7.366)).toBeCloseTo(1.5656005);
    expect(nearestPause(pauses, .56, 7.366)).toBeCloseTo(3.82839);
    expect(() => nearestPause([], .2, 4)).toThrow();
  });
  it("requires complete narration without overlaps, gaps or reordered stills", () => {
    const board = { lesson: "test", stills: [{ id: "one" }, { id: "two" }] };
    const map = { lesson: "test", source: { clips: 2 }, stills: [{ id: "one", start: { clip: 1, at: 0 }, end: { clip: 1, at: .5 } }, { id: "two", start: { clip: 1, at: .5 }, end: { clip: 2, at: 1 } }] };
    expect(() => validateAudioMap(board, map)).not.toThrow();
    expect(() => validateAudioMap(board, { ...map, stills: [map.stills[0], { ...map.stills[1], start: { clip: 2, at: 0 } }] })).toThrow("discontinuo");
  });
  it("rounds SRT timestamps and safely quotes paths with spaces and apostrophes", () => {
    expect(srtTime(3599.9997)).toBe("01:00:00,000");
    expect(concatFile("C:\\Luis's files\\clip.wav")).toBe("file 'C:/Luis'\\''s files/clip.wav'");
  });
});
