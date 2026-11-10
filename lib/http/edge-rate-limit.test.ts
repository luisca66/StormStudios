import { describe, expect, it } from "vitest";
import { edgeRateLimitKey } from "./edge-rate-limit";

describe("edgeRateLimitKey", () => {
  // Cloudflare cuenta por clave entre todas las instancias del Worker: si la
  // clave cambiara por instancia, el límite nunca se alcanzaría.
  it("is stable for the same visitor, across module instances", async () => {
    const first = edgeRateLimitKey("CONTACT_LIMITER", "203.0.113.7");
    const { edgeRateLimitKey: reloaded } = await import(`./edge-rate-limit?again=${Date.now()}`);
    expect(reloaded("CONTACT_LIMITER", "203.0.113.7")).toBe(first);
  });

  it("separates visitors and limiters, and never holds the raw IP", () => {
    const key = edgeRateLimitKey("CONTACT_LIMITER", "203.0.113.7");
    expect(edgeRateLimitKey("CONTACT_LIMITER", "203.0.113.8")).not.toBe(key);
    expect(edgeRateLimitKey("MAESTRO_LIMITER", "203.0.113.7")).not.toBe(key);
    expect(key).not.toContain("203.0.113.7");
  });
});
