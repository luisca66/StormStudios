import { describe, expect, it } from "vitest";
import { appDestination, dataPoint, normalizeEvent, publicPath } from "./events";
import { campaignLabel, referrerDomain } from "./privacy";

const base = { name: "page_view", path: "/es", language: "es" };

describe("anonymous measurement", () => {
  it("accepts only published paths, not query strings or arbitrary identifiers", () => {
    expect(publicPath("/es/")).toBe("/es");
    for (const path of ["/es?email=luis@example.com", "/es#personal", "/es/blog/persona-nueva", "/es/contacto/123", "//evil.com", "/api/contact"]) {
      expect(normalizeEvent({ ...base, path })).toBeNull();
    }
    expect(normalizeEvent({ ...base, language: "en" })).toBeNull();
    expect(normalizeEvent({ ...base, ip: "198.51.100.1" })).toBeNull();
    expect(normalizeEvent({ ...base, userId: "person" })).toBeNull();
  });

  it("stores only a domain and campaign slugs, with a stable column order", () => {
    const event = normalizeEvent({ ...base, destination: "ignored", referrer: "https://google.com/search?q=private#secret",
      utm_source: "newsletter", utm_campaign: "book_nov-2026" })!;
    expect(dataPoint(event)).toEqual({ indexes: ["page_view"], doubles: [1],
      blobs: ["page_view", "/es", "es", "", "google.com", "newsletter", "book_nov-2026"] });
    expect(referrerDomain("https://198.51.100.1/private")).toBe("");
    expect(referrerDomain("http://[::1]/")).toBe("");
    expect(referrerDomain("https://name:password@example.com/path")).toBe("");
    expect(referrerDomain("mailto:luis@example.com")).toBe("");
    for (const label of ["luis@example.com", "https://site.com", "person%40example.com", "x123456789", "f47ac10b-58cc-4372-a567-0e02b2c3d479", "a".repeat(65)]) {
      expect(campaignLabel(label)).toBe("");
    }
  });

  it("validates Amazon formats and stores, and contact placements", () => {
    for (const format of ["kindle", "paperback", "hardcover"]) {
      for (const store of ["amazon.com", "amazon.com.mx"]) {
        expect(normalizeEvent({ ...base, name: "amazon_click", destination: `${format}:${store}` })).not.toBeNull();
      }
    }
    expect(normalizeEvent({ ...base, name: "amazon_click", destination: "kindle:evil.com" })).toBeNull();
    expect(normalizeEvent({ ...base, name: "contact_click", destination: "home" })).not.toBeNull();
    expect(normalizeEvent({ ...base, name: "contact_click", destination: "lesson" })).toBeNull();
    expect(normalizeEvent({ ...base, path: "/es/curso-armonia/02-leccion-1", name: "contact_click", destination: "lesson" })).not.toBeNull();
    expect(normalizeEvent({ ...base, name: "contact_success" })).toBeNull();
    expect(normalizeEvent({ ...base, path: "/es/contacto", name: "contact_success" })?.destination).toBe("form");
  });

  it("distinguishes listings from actual launches, including English URLs and HTML apps", () => {
    expect(appDestination("/es/apps/acordes")).toBeUndefined();
    for (const path of ["/es/apps/acordes/jugar", "/en/apps/acordes/play", "/en/apps/acordes/game", "/es/memoria", "/es/herramientas/lectura-musical", "/apps/acordes/index.html", "/apps/acordes", "/apps/storm-bateria-v9.6.html"]) {
      expect(appDestination(path), path).toBeTruthy();
    }
  });
});
