import { describe, expect, it } from "vitest";
import { toAudioUrl } from "./audio-player";

describe("toAudioUrl", () => {
  it("serves samples from Cloudflare R2", () => {
    expect(toAudioUrl("A String/A2.mp3")).toBe(
      "https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev/A%20String/A2.mp3",
    );
  });

  it("encodes sharp notes as URL data, not local aliases", () => {
    expect(toAudioUrl("A String/C#3.mp3")).toBe(
      "https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev/A%20String/C%233.mp3",
    );
  });
});
