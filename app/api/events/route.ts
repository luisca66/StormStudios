import { createHash, randomBytes } from "node:crypto";
import { appDestination, normalizeEvent } from "@/lib/analytics/events";
import { writeEvent } from "@/lib/analytics/write";
import { getClientIp } from "@/lib/http/client-ip";
import { passesEdgeRateLimit } from "@/lib/http/edge-rate-limit";

export const runtime = "nodejs";
const MAX_BYTES = 2048;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const RATE_LIMIT_SALT = randomBytes(16).toString("hex");
const ipRequestLog = new Map<string, number[]>();
let lastCleanupAt = 0;

const reply = (status: number, extraHeaders?: Record<string, string>) =>
  new Response(null, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });

function passesLocalRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  if (now - lastCleanupAt >= RATE_LIMIT_WINDOW_MS || ipRequestLog.size >= MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, list] of ipRequestLog) {
      const recent = list.filter((ts) => ts > windowStart);
      if (recent.length === 0) ipRequestLog.delete(k);
      else if (recent.length !== list.length) ipRequestLog.set(k, recent);
    }
    while (ipRequestLog.size > MAX_RATE_LIMIT_ENTRIES) {
      const oldest = ipRequestLog.keys().next().value;
      if (!oldest) break;
      ipRequestLog.delete(oldest);
    }
    lastCleanupAt = now;
  }
  const key = createHash("sha256").update(`${RATE_LIMIT_SALT}:${ip}`).digest("base64url");
  const recent = (ipRequestLog.get(key) ?? []).filter((ts) => ts > windowStart);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestLog.set(key, recent);
    return false;
  }
  recent.push(now);
  ipRequestLog.set(key, recent);
  return true;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin ||
      request.headers.get("sec-fetch-site") === "cross-site") return reply(403);
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return reply(415);
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return reply(413);
  const ip = getClientIp(request.headers);
  if (!(await passesEdgeRateLimit("EVENTS_LIMITER", ip)) || !passesLocalRateLimit(ip)) {
    return reply(429, { "Retry-After": "60" });
  }
  const reader = request.body?.getReader();
  if (!reader) return reply(400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  let input: unknown;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) { await reader.cancel(); return reply(413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return reply(400); }
  finally { reader.releaseLock(); }
  const event = normalizeEvent(input);
  // Successful mail submissions are recorded exclusively by their mail endpoints.
  if (!event || (event.name === "contact_success" || event.name === "notify_success")) return reply(400);
  if (!writeEvent(event)) return reply(503);
  if (event.name === "page_view" && appDestination(event.path)) {
    writeEvent({ ...event, name: "app_open", destination: appDestination(event.path)! });
  }
  return reply(204);
}
