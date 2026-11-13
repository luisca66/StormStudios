import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";

export const MAIL_FROM = "Storm Studios <noreply@stormstudios.com.mx>";
export const MAIL_TO = "info@stormstudios.com.mx";

export const MIN_SUBMIT_TIME_MS = 3000;
export const MAX_SUBMIT_TIME_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const RATE_LIMIT_SALT = randomBytes(16).toString("hex");

// Dos capas: el binding CONTACT_LIMITER de Cloudflare cuenta entre todas las
// instancias (ver lib/http/edge-rate-limit.ts) y este contador en memoria, que
// solo ve su propio isolate, cubre `next dev`/`next start` y ráfagas locales.
const ipRequestLog = new Map<string, number[]>();
let lastRateLimitCleanupAt = 0;

type MailFormErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "temporarily_unavailable";

// Escapa caracteres HTML para evitar inyección en el cuerpo del correo.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getRateLimitKey(ip: string): string {
  // No conservar la IP en memoria más tiempo del necesario para este límite local.
  return createHash("sha256")
    .update(`${RATE_LIMIT_SALT}:${ip}`)
    .digest("base64url");
}

function pruneRateLimitLog(now: number) {
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  for (const [key, timestamps] of ipRequestLog) {
    const recent = timestamps.filter((timestamp) => timestamp > windowStart);

    if (recent.length === 0) {
      ipRequestLog.delete(key);
    } else if (recent.length !== timestamps.length) {
      ipRequestLog.set(key, recent);
    }
  }

  while (ipRequestLog.size > MAX_RATE_LIMIT_ENTRIES) {
    const oldestKey = ipRequestLog.keys().next().value;
    if (!oldestKey) {
      break;
    }
    ipRequestLog.delete(oldestKey);
  }

  lastRateLimitCleanupAt = now;
}

export function getRateLimitResult(ip: string) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const key = getRateLimitKey(ip);

  if (
    now - lastRateLimitCleanupAt >= RATE_LIMIT_WINDOW_MS ||
    ipRequestLog.size >= MAX_RATE_LIMIT_ENTRIES
  ) {
    pruneRateLimitLog(now);
  }

  const recent = (ipRequestLog.get(key) || []).filter(
    (timestamp) => timestamp > windowStart
  );

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestLog.set(key, recent);
    return {
      limited: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((recent[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
      ),
    };
  }

  recent.push(now);
  ipRequestLog.set(key, recent);
  return { limited: false };
}

export function errorResponse(
  error: MailFormErrorCode,
  status: number,
  retryable = false,
  retryAfterSeconds?: number
) {
  return NextResponse.json(
    { error, retryable },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfterSeconds
          ? { "Retry-After": String(retryAfterSeconds) }
          : {}),
      },
    }
  );
}

export function hasAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  // Las integraciones que no envían Origin siguen siendo posibles, pero una
  // petición de navegador con Origin cruzado no debe usar este endpoint.
  return !origin || origin === request.nextUrl.origin;
}

export async function readRequestBody(request: NextRequest): Promise<unknown | null> {
  const contentLength = Number(request.headers.get("content-length"));
  const contentType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (
    contentType !== "application/json" ||
    (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES)
  ) {
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return null;
  }

  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      byteLength += value.byteLength;
      if (byteLength > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

