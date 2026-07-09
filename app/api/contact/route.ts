import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";

export const runtime = "nodejs";

const MIN_SUBMIT_TIME_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const RATE_LIMIT_SALT = randomBytes(16).toString("hex");

// Protección local por proceso: reduce abuso contra una instancia, pero no es un
// rate limit distribuido. En producción debe complementarse con WAF o un store
// compartido si el volumen o el abuso lo justifican.
const ipRequestLog = new Map<string, number[]>();
let lastRateLimitCleanupAt = 0;

type ContactErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "temporarily_unavailable";

const ContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((value) => !/[\r\n]/.test(value)),
  email: z.email(),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(0).optional().default(""),
  startedAt: z.preprocess(
    (value) => {
      if (typeof value === "string" || typeof value === "number") {
        return Number(value);
      }
      return value;
    },
    z.number().finite().positive()
  ),
}).strict();

// Escapa caracteres HTML para evitar inyección en el cuerpo del correo.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for");
  const candidates = [
    forwardedFor?.split(",")[0]?.trim(),
    request.headers.get("x-real-ip")?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) {
      return candidate;
    }
  }

  return "unknown";
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

function getRateLimitResult(ip: string) {
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

function errorResponse(
  error: ContactErrorCode,
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

function hasAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  // Las integraciones que no envían Origin siguen siendo posibles, pero una
  // petición de navegador con Origin cruzado no debe usar este endpoint.
  return !origin || origin === request.nextUrl.origin;
}

async function readRequestBody(request: NextRequest): Promise<unknown | null> {
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

export async function POST(request: NextRequest) {
  try {
    if (!hasAllowedOrigin(request)) {
      return errorResponse("invalid_request", 400);
    }

    const ip = getClientIp(request);
    const rateLimit = getRateLimitResult(ip);

    if (rateLimit.limited) {
      return errorResponse(
        "rate_limited",
        429,
        true,
        rateLimit.retryAfterSeconds
      );
    }

    const body = await readRequestBody(request);
    const parsed = ContactSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("invalid_request", 400);
    }

    const { name, email, message, startedAt } = parsed.data;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    if (Date.now() - startedAt < MIN_SUBMIT_TIME_MS) {
      return errorResponse("invalid_request", 400);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      // Nunca registrar el contenido del formulario: contiene datos personales.
      console.error("[CONTACT API] RESEND_API_KEY is not configured");
      return errorResponse("temporarily_unavailable", 503, true, 60);
    }

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: "Storm Studios <noreply@stormstudios.com.mx>",
      to: "info@stormstudios.com.mx",
      replyTo: email,
      subject: `Mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
      html: `
        <h2>Nuevo mensaje de contacto</h2>
        <p><strong>Nombre:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${encodeURIComponent(email)}">${safeEmail}</a></p>
        <hr>
        <p><strong>Mensaje:</strong></p>
        <p>${safeMessage.replace(/\n/g, "<br>")}</p>
      `,
    });

    if (error || !data?.id) {
      console.error("[CONTACT API] Email provider rejected the request");
      return errorResponse("temporarily_unavailable", 503, true, 60);
    }

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    // No pasar el error a console: proveedores o runtimes pueden incluir PII.
    console.error("[CONTACT API] Unexpected contact delivery failure");
    return errorResponse("temporarily_unavailable", 503, true, 60);
  }
}
