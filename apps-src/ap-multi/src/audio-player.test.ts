import { describe, expect, it } from "vitest";
import { toAudioUrl } from "./audio-player";

describe("toAudioUrl", () => {
  it("serves samples from the shared Storm Studios R2 bucket by default", () => {
    expect(toAudioUrl("Piano/A2.mp3")).toBe(
      "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/Piano/A2.mp3",
    );
  });

  it("encodes sharp notes as URL data", () => {
    expect(toAudioUrl("Cello/C#3.mp3")).toBe(
      "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev/Cello/C%233.mp3",
    );
  });
});
