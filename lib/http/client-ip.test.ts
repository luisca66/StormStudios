import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

describe("getClientIp", () => {
  it("prefers the address Cloudflare sets at the edge", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("ignores a spoofed x-forwarded-for when Cloudflare is in front", () => {
    const first = new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    const second = new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.2" });
    expect(getClientIp(first)).toBe(getClientIp(second));
  });

  it("does not accept a malformed edge address", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "not-an-ip" }))).toBe("unknown");
  });

  it("falls back to forwarding headers outside Cloudflare", () => {
    expect(getClientIp(new Headers({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" }))).toBe("198.51.100.9");
    expect(getClientIp(new Headers({ "x-real-ip": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});
