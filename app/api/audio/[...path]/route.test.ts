import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, HEAD } from "./route";

afterEach(() => vi.unstubAllGlobals());
const context = { params: Promise.resolve({ path: ["piano", "C4.mp3"] }) };
describe("audio proxy HTTP contract", () => {
  it.each([404, 500, 503])("does not cache an upstream %i even if upstream asks for it", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status, headers: { "Cache-Control": "public, max-age=31536000" } })));
    const response = await GET(new NextRequest("https://example.org/api/audio/piano/C4.mp3"), context);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("forwards a byte range and preserves the partial response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("abc", { status: 206, headers: { "content-range": "bytes 0-2/10", "content-type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(new NextRequest("https://example.org/api/audio/piano/C4.mp3", { headers: { Range: "bytes=0-2" } }), context);
    expect(fetcher.mock.calls[0][1].headers.get("range")).toBe("bytes=0-2");
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-2/10");
    expect(await response.text()).toBe("abc");
  });
  it("uses HEAD upstream and returns no body", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { headers: { "content-length": "100" } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await HEAD(new NextRequest("https://example.org/api/audio/piano/C4.mp3", { method: "HEAD" }), context);
    expect(fetcher.mock.calls[0][1].method).toBe("HEAD");
    expect(response.headers.get("content-length")).toBe("100");
    expect(await response.text()).toBe("");
  });
  it("preserves conditional 304 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 304, headers: { etag: '"sample"' } })));
    const response = await GET(new NextRequest("https://example.org/api/audio/piano/C4.mp3"), context);
    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"sample"');
    expect(await response.text()).toBe("");
  });
  it.each([[new Error("network failure"), 502], [new DOMException("expired", "TimeoutError"), 504]])("handles upstream failure", async (error, status) => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(error));
    const response = await GET(new NextRequest("https://example.org/api/audio/piano/C4.mp3"), context);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain("network failure");
  });
  it("rejects traversal without contacting upstream", async () => {
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    const response = await GET(new NextRequest("https://example.org/api/audio/test"), { params: Promise.resolve({ path: ["..", "private"] }) });
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
