import { beforeEach, describe, expect, it, vi } from "vitest";

const { writeDataPoint, context, limit } = vi.hoisted(() => ({ writeDataPoint: vi.fn(), context: vi.fn(), limit: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
import { POST } from "./route";

let ipCounter = 1;
function request(body: unknown, origin: string | null = "https://www.stormstudios.com.mx", type = "application/json", ip?: string) {
  return new Request("https://www.stormstudios.com.mx/api/events", {
    method: "POST",
    headers: {
      ...(origin ? { origin } : {}),
      "content-type": type,
      "cf-connecting-ip": ip ?? `198.51.100.${ipCounter++}`,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const event = { name: "page_view", path: "/es", language: "es" };

describe("POST /api/events", () => {
  beforeEach(() => {
    writeDataPoint.mockReset();
    limit.mockReset().mockResolvedValue({ success: true });
    context.mockReset().mockReturnValue({ env: { SITE_ANALYTICS: { writeDataPoint }, EVENTS_LIMITER: { limit } } });
  });
  it("writes through the real writer contract, with no cookies or cache", async () => {
    const response = await POST(request(event));
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(writeDataPoint).toHaveBeenCalledWith({ indexes: ["page_view"], doubles: [1], blobs: ["page_view", "/es", "es", "", "", "", ""] });
  });
  it("counts one app opening with a launch page view", async () => {
    expect((await POST(request({ ...event, path: "/es/apps/acordes/jugar" }))).status).toBe(204);
    expect(writeDataPoint).toHaveBeenCalledTimes(2);
    expect(writeDataPoint.mock.calls[1][0].blobs.slice(0, 4)).toEqual(["app_open", "/es/apps/acordes/jugar", "es", "/es/apps/acordes/jugar"]);
  });
  it("rejects cross-origin, missing origin, personal fields and forged contact success", async () => {
    expect((await POST(request(event, "https://evil.com"))).status).toBe(403);
    expect((await POST(request(event, null))).status).toBe(403);
    expect((await POST(request({ ...event, email: "name@example.com" }))).status).toBe(400);
    expect((await POST(request({ ...event, name: "contact_success", path: "/es/contacto" }))).status).toBe(400);
    expect((await POST(request({ ...event, name: "notify_success", path: "/es/el-libro", destination: "libro" }))).status).toBe(400);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
  it("bounds streamed bodies even without Content-Length and rejects malformed JSON", async () => {
    expect((await POST(request(" ".repeat(2049)))).status).toBe(413);
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request(event, undefined, "text/plain"))).status).toBe(415);
    expect(writeDataPoint).not.toHaveBeenCalled();
  });
  it("enforces edge and local rate limits without writing events", async () => {
    limit.mockResolvedValueOnce({ success: false });
    const edgeLimited = await POST(request(event));
    expect(edgeLimited.status).toBe(429);
    expect(edgeLimited.headers.get("retry-after")).toBe("60");
    expect(edgeLimited.headers.get("cache-control")).toBe("no-store");
    expect(writeDataPoint).not.toHaveBeenCalled();

    const floodedIp = "203.0.113.99";
    for (let i = 0; i < 60; i++) {
      expect((await POST(request(event, "https://www.stormstudios.com.mx", "application/json", floodedIp))).status).toBe(204);
    }
    const localLimited = await POST(request(event, "https://www.stormstudios.com.mx", "application/json", floodedIp));
    expect(localLimited.status).toBe(429);
  });

  it("returns an observable failure for a missing or failing binding", async () => {
    context.mockReturnValue({ env: { EVENTS_LIMITER: { limit } } });
    expect((await POST(request(event))).status).toBe(503);
    context.mockImplementation(() => { throw new Error("context unavailable"); });
    expect((await POST(request(event))).status).toBe(503);
    context.mockReturnValue({ env: { SITE_ANALYTICS: { writeDataPoint }, EVENTS_LIMITER: { limit } } });
    writeDataPoint.mockImplementation(() => { throw new Error("write failure"); });
    expect((await POST(request(event))).status).toBe(503);
  });
});
