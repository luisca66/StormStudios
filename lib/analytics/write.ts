import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dataPoint, type MeasurementEvent } from "./events";

// Only the capability consumed here; OpenNext merges this with its own Env.
declare global {
  interface CloudflareEnv {
    SITE_ANALYTICS?: { writeDataPoint(point: ReturnType<typeof dataPoint>): void };
  }
}

/** Best effort: telemetry must never interrupt navigation or email delivery. */
export function writeEvent(event: MeasurementEvent): boolean {
  try {
    const { env } = getCloudflareContext();
    if (!env.SITE_ANALYTICS) throw new Error("Missing binding");
    env.SITE_ANALYTICS.writeDataPoint(dataPoint(event));
    return true;
  } catch {
    // Fixed message only: errors from runtimes can contain request information.
    if (process.env.NODE_ENV === "production") console.error("[measurement] dataset unavailable");
    return false;
  }
}
