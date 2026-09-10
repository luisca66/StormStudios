import { describe, expect, it } from "vitest";
import { toAudioUrl } from "./audio-player";

describe("toAudioUrl", () => {
  it("serves samples from the shared Storm Studios R2 bucket by default", () => {
    expect(toAudioUrl("Piano/A2.mp3")).toBe(
      "https://samples.stormstudios.com.mx/Piano/A2.mp3",
    );
  });

  it("encodes sharp notes as URL data", () => {
    expect(toAudioUrl("Cello/C#3.mp3")).toBe(
      "https://samples.stormstudios.com.mx/Cello/C%233.mp3",
    );
  });
});
