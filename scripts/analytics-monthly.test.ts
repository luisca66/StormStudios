import { describe, expect, it, vi } from "vitest";
import { monthRange, monthlyQueries, renderReport, run } from "./analytics-monthly.mjs";
import { instrumentHtml } from "./instrument-standalone.mjs";

describe("monthly analytics report", () => {
  it("uses complete UTC calendar months including leap years and December", () => {
    expect(monthRange("2028-02")).toEqual({ start: "2028-02-01", end: "2028-03-01" });
    expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" });
    for (const invalid of ["2026-13", "2026-00", "2026-1", "2026-11' OR 1=1"]) expect(() => monthRange(invalid)).toThrow();
  });
  it("weights sampled counts and limits attribution to page views", () => {
    const queries = monthlyQueries("2026-11");
    for (const sql of Object.values(queries)) {
      expect(sql).toContain("SUM(_sample_interval)");
      expect(sql).toContain("timestamp < toDateTime('2026-12-01 00:00:00')");
    }
    expect(queries.stores).toContain("blob1 = 'store_click'");
    expect(queries.notifications).toContain("blob1 = 'notify_success'");
    expect(queries.notifications).toContain("GROUP BY destination, language");
    expect(queries.sources).toContain("AND blob1 = 'page_view'");
    expect(queries.amazon).toContain("GROUP BY destination, language");
  });
  it("renders empty months and escapes untrusted Markdown", () => {
    const report = renderReport("2026-11", { events: [], pages: [], amazon: [], contacts: [], apps: [],
      sources: [{ referrer: "source|name", source: "<script>", campaign: "hello\nworld", total: "3" }] });
    expect(report).toContain("**0**");
    expect(report).toContain("source\\|name");
    expect(report).toContain("\\<script\\>");
    expect(report).toContain("hello world");
  });
  it("renders store and notification counts by destination and language", () => {
    const report = renderReport("2026-11", { events: [], pages: [], amazon: [], contacts: [], apps: [], sources: [],
      stores: [{ destination: "play:apsuper", language: "es", total: 7 }],
      notifications: [{ destination: "libro", language: "en", total: 2 }] });
    expect(report).toContain("| play:apsuper | es | 7 |");
    expect(report).toContain("| libro | en | 2 |");
  });
  it("requires environment credentials and never reflects API error bodies", async () => {
    const fetcher = vi.fn();
    await expect(run("2026-11", "unused.md", {}, fetcher)).rejects.toThrow("Define CLOUDFLARE");
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(new Response("secret-personal-information", { status: 403 }));
    await expect(run("2026-11", "unused.md", { CLOUDFLARE_ANALYTICS_API_TOKEN: "test-secret", CLOUDFLARE_ACCOUNT_ID: "a".repeat(32) }, fetcher)).rejects.toThrow("HTTP 403");
  });
  it("instruments HTML idempotently, preserving source bundle checks", () => {
    const html = "<!doctype html><html><head><title>App</title></head><body></body></html>";
    const result = instrumentHtml(html);
    expect(result).toContain('<script defer src="/site-measurement.js"></script>');
    expect(instrumentHtml(result)).toBe(result);
  });
});
