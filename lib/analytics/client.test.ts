import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { measurementContext, track } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("browser measurement transport", () => {
  it("sends no cookies, full referrer, hash, form data or arbitrary query parameters", () => {
    vi.stubGlobal("window", { location: { href: "https://www.stormstudios.com.mx/en/the-book?email=private@example.com&utm_source=newsletter&utm_campaign=luis%40example.com#private" } });
    vi.stubGlobal("document", { documentElement: { lang: "en" }, referrer: "https://google.com/search?q=private" });
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    expect(measurementContext()).toEqual({ path: "/en/the-book", language: "en", referrer: "google.com", utm_source: "newsletter", utm_campaign: "" });
    track("amazon_click", "kindle:amazon.com");
    const [endpoint, options] = fetcher.mock.calls[0];
    expect(endpoint).toBe("/api/events");
    expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer", keepalive: true });
    expect(options.body).not.toMatch(/private|example\.com|email|#|\?/);
  });

  it("ignores rejected network requests and synchronous failures", async () => {
    vi.stubGlobal("window", { location: { href: "https://www.stormstudios.com.mx/es" } });
    vi.stubGlobal("document", { documentElement: { lang: "es" }, referrer: "" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(() => track("page_view")).not.toThrow();
    await Promise.resolve();
    vi.stubGlobal("fetch", () => { throw new Error("blocked"); });
    expect(() => track("page_view")).not.toThrow();
  });

  it("counts a standalone HTML arrival, with the same privacy rules; skips iframes", () => {
    const script = readFileSync(new URL("../../public/site-measurement.js", import.meta.url), "utf8");
    const top = {};
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const sandbox = { URL, window: { top, self: top, location: { href: "https://www.stormstudios.com.mx/apps/storm-bateria-v9.6-en.html?utm_campaign=a123456789&utm_source=youtube&email=private" } }, document: { documentElement: { lang: "en" }, referrer: "https://198.51.100.1/private" }, fetch: fetcher };
    runInNewContext(script, sandbox);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ name: "page_view", path: "/apps/storm-bateria-v9.6-en.html", language: "en", referrer: "", utm_source: "youtube", utm_campaign: "" });
    fetcher.mockClear();
    sandbox.window.self = {};
    runInNewContext(script, sandbox);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
