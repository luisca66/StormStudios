import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { externalMusic, externalMusicFilter, musicWindow } from "./external-music.mjs";

describe("external lesson music", () => {
  it("uses the whole file by default and preserves exact trim offsets", () => {
    expect(musicWindow({ id: "whole" }, 12)).toEqual({ sourceStart: 0, sourceEnd: 12, seconds: 12 });
    expect(musicWindow({ id: "trimmed", musicTrim: [2.25, 8.75] }, 12)).toEqual({ sourceStart: 2.25, sourceEnd: 8.75, seconds: 6.5 });
    const filter = externalMusicFilter(musicWindow({ id: "trimmed", musicTrim: [2, 8] }, 12));
    expect(filter).toContain("atrim=start=2:end=8,asetpts=PTS-STARTPTS");
    expect(filter).toContain("loudnorm=I=-19");
    expect(filter).toContain("atrim=end_sample=288000");
    expect(filter).toContain("afade=t=in:st=0:d=0.5,afade=t=out:st=5.5:d=0.5");
  });
  it.each([[0, 13], [4, 4], [5, 2], [-1, 2], [0, Infinity], [NaN, 2]])("rejects invalid trim %s..%s with still context", (from, to) => {
    expect(() => musicWindow({ id: "bad", musicTrim: [from, to] }, 12)).toThrow(/Still "bad".*musicTrim/);
  });
  it("rejects simultaneous piano and external music", () => {
    expect(() => musicWindow({ id: "both", audio: true, musicFile: "test.mp3" }, 12)).toThrow(/Still "both".*excluyentes/);
  });
  it("resolves relative and absolute paths and names missing files and stills", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "storm-music-"));
    try {
      const file = path.join(folder, "test.mp3"); await writeFile(file, "fixture");
      for (const musicFile of ["test.mp3", file]) {
        expect(await externalMusic({ id: "local", musicFile }, path.join(folder, "board.json"), async () => 3)).toMatchObject({ file, seconds: 3 });
      }
      await expect(externalMusic({ id: "missing", musicFile: "absent.mp3" }, path.join(folder, "board.json"), async () => 3)).rejects.toThrow(/Still "missing".*falta musicFile.*absent.mp3/);
    } finally { await rm(folder, { recursive: true, force: true }); }
  });
});
