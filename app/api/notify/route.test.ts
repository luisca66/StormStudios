import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send, write, edge } = vi.hoisted(() => ({ send: vi.fn(), write: vi.fn(), edge: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
vi.mock("@/lib/analytics/write", () => ({ writeEvent: write }));
vi.mock("@/lib/http/edge-rate-limit", () => ({ passesEdgeRateLimit: edge }));
import { POST } from "./route";
import { POST as contact } from "../contact/route";

let ip = 0;
function request(overrides: Record<string, unknown> = {}, headers = {}, raw?: string) {
  return new NextRequest("https://storm.test/api/notify", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${++ip}`, ...headers },
    body: raw ?? JSON.stringify({ email: "reader@example.com", source: "libro", language: "es",
      website: "", elapsedMs: 5000, attemptId: "notify-attempt-123", ...overrides }),
  });
}
const measurement = { path: "/es/el-libro", language: "es" };
describe("POST /api/notify", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_mock");
    send.mockReset().mockResolvedValue({ data: { id: "accepted" }, error: null });
    write.mockReset().mockReturnValue(true);
    edge.mockReset().mockResolvedValue(true);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([["libro", "es", "/es/el-libro"], ["catalogo", "en", "/en/apps"],
    ["leccion", "es", "/es/curso-armonia/02-leccion-1"]])("delivers %s/%s to the contact mailbox and measures no personal data", async (source, language, path) => {
    const response = await POST(request({ source, language, measurement: { path, language } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(send.mock.calls[0][0]).toMatchObject({ from: "Storm Studios <noreply@stormstudios.com.mx>",
      to: "info@stormstudios.com.mx", replyTo: "reader@example.com", subject: `Avísame: ${source} (${language})` });
    expect(write).toHaveBeenCalledExactlyOnceWith({ name: "notify_success", path, language,
      destination: source, referrer: "", utm_source: "", utm_campaign: "" });
    expect(JSON.stringify(write.mock.calls)).not.toMatch(/reader@|192\.0|attempt|accepted/);
    expect(edge).toHaveBeenCalledWith("CONTACT_LIMITER", expect.any(String));
  });

  it.each([{ email: "invalid" }, { email: "x@example.com\r\nBcc: y@example.com" }, { source: "other" },
    { language: "fr" }, { elapsedMs: 1 }, { elapsedMs: 86400001 }, { attemptId: "bad" }, { extra: "private" }])("rejects invalid input %j", async (overrides) => {
    expect((await POST(request(overrides))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("rejects cross origin, wrong type, malformed and oversized bodies, including streams without length", async () => {
    for (const req of [request({}, { origin: "https://other.test" }), request({}, { "content-type": "text/plain" }),
      request({}, {}, "{"), request({}, { "content-length": "9000" }), request({}, {}, " ".repeat(8193))]) {
      expect((await POST(req)).status).toBe(400);
    }
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send or measure a filled honeypot", async () => {
    expect((await POST(request({ website: "spam", measurement }))).status).toBe(200);
    expect(send).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });

  it("returns retryable failures for missing configuration, rejected, missing-id or thrown provider responses without logging private data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.stubEnv("RESEND_API_KEY", "");
      expect((await POST(request({ measurement }))).status).toBe(503);
      expect(send).not.toHaveBeenCalled();
      vi.stubEnv("RESEND_API_KEY", "re_mock");
      for (const result of [{ data: null, error: { message: "reader@example.com" } }, { data: {}, error: null }]) {
        send.mockResolvedValue(result);
        const response = await POST(request({ measurement }));
        expect(response.status).toBe(503); expect(response.headers.get("retry-after")).toBe("60");
      }
      send.mockRejectedValue(new Error("reader@example.com"));
      expect((await POST(request({ measurement }))).status).toBe(503);
      expect(write).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
    } finally { log.mockRestore(); }
  });

  it("uses an opaque stable idempotency key for retries, and changes it for a new attempt", async () => {
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request())).status).toBe(200);
    expect((await POST(request({ attemptId: "another-attempt" }))).status).toBe(200);
    const key = send.mock.calls[0][1].idempotencyKey;
    expect(key).toMatch(/^notify-[a-f0-9]{64}$/);
    expect(send.mock.calls[1][1].idempotencyKey).toBe(key);
    expect(send.mock.calls[2][1].idempotencyKey).not.toBe(key);
  });

  it("ignores invalid, mismatched or personal measurement while still delivering", async () => {
    for (const metadata of [{ email: "reader@example.com" }, { ...measurement, path: "/es/contacto" },
      { path: "/en/the-book", language: "en" }]) {
      expect((await POST(request({ measurement: metadata }))).status).toBe(200);
    }
    expect(write).not.toHaveBeenCalled();
    write.mockReturnValue(false);
    expect((await POST(request({ measurement }))).status).toBe(200);
  });

  it("enforces the existing edge quota", async () => {
    edge.mockResolvedValue(false);
    const response = await POST(request());
    expect(response.status).toBe(429); expect(response.headers.get("retry-after")).toBe("60");
    expect(send).not.toHaveBeenCalled();
  });

  it("shares the local quota with contact and recovers after the window", async () => {
    vi.useFakeTimers();
    try {
      const headers = { "x-forwarded-for": "198.51.100.200" };
      for (let n = 0; n < 5; n++) expect((await POST(request({}, headers))).status).toBe(200);
      expect((await POST(request({}, headers))).status).toBe(429);
      expect((await contact(request({}, headers))).status).toBe(429);
      vi.advanceTimersByTime(600001);
      expect((await POST(request({}, headers))).status).toBe(200);
    } finally { vi.useRealTimers(); }
  });
});
