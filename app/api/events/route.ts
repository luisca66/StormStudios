import { appDestination, normalizeEvent } from "@/lib/analytics/events";
import { writeEvent } from "@/lib/analytics/write";

export const runtime = "nodejs";
const MAX_BYTES = 2048;
const reply = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin ||
      request.headers.get("sec-fetch-site") === "cross-site") return reply(403);
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/json") return reply(415);
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return reply(413);
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
