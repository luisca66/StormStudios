import type { EventName, MeasurementContext } from "./events";
import { campaignLabel, referrerDomain } from "./privacy";

export function measurementContext(): MeasurementContext {
  const url = new URL(window.location.href);
  return {
    path: url.pathname,
    language: document.documentElement.lang === "en" ? "en" : "es",
    referrer: referrerDomain(document.referrer),
    utm_source: campaignLabel(url.searchParams.get("utm_source") ?? ""),
    utm_campaign: campaignLabel(url.searchParams.get("utm_campaign") ?? ""),
  };
}

export function track(name: EventName, destination = ""): void {
  try {
    // No cookies, credentials or Referer header containing the current URL.
    void fetch("/api/events", {
      method: "POST", credentials: "omit", referrerPolicy: "no-referrer", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...measurementContext(), name, destination }),
    }).catch(() => {});
  } catch { /* Measurement failure must not affect the action. */ }
}
