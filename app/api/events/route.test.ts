import { beforeEach, describe, expect, it, vi } from "vitest";

const { writeDataPoint, context } = vi.hoisted(() => ({ writeDataPoint: vi.fn(), context: vi.fn() }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: context }));
import { POST } from "./route";

function request(body: unknown, origin: string | null = "https://www.stormstudios.com.mx", type = "application/json") {
  return new Request("https://www.stormstudios.com.mx/api/events", {
    method: "POST", headers: { ...(origin ? { origin } : {}), "content-type": type },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const event = { name: "page_view", path: "/es", language: "es" };

describe("POST /api/events", () => {
  beforeEach(() => {
    writeDataPoint.mockReset();
    context.mockReset().mockReturnValue({ env: { SITE_ANALYTICS: { writeDataPoint } } });
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
  it("returns an observable failure for a missing or failing binding", async () => {
    context.mockReturnValue({ env: {} });
    expect((await POST(request(event))).status).toBe(503);
    context.mockImplementation(() => { throw new Error("context unavailable"); });
    expect((await POST(request(event))).status).toBe(503);
    context.mockReturnValue({ env: { SITE_ANALYTICS: { writeDataPoint } } });
    writeDataPoint.mockImplementation(() => { throw new Error("write failure"); });
    expect((await POST(request(event))).status).toBe(503);
  });
});
