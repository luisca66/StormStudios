import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getClientIp } from "@/lib/http/client-ip";
import { passesEdgeRateLimit } from "@/lib/http/edge-rate-limit";
import { MIN_SUBMIT_TIME_MS, MAX_SUBMIT_TIME_MS, getRateLimitResult, errorResponse, hasAllowedOrigin, readRequestBody, MAIL_FROM, MAIL_TO } from "@/lib/http/mail-form";
import { contextSchema, normalizeEvent } from "@/lib/analytics/events";
import { writeEvent } from "@/lib/analytics/write";

export const runtime = "nodejs";
const NotifySchema = z.object({
  email: z.email().max(254),
  source: z.enum(["leccion", "catalogo", "libro"]),
  language: z.enum(["es", "en"]),
  website: z.string().max(200).optional().default(""),
  elapsedMs: z.number().int().min(0).max(MAX_SUBMIT_TIME_MS),
  attemptId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  measurement: contextSchema.optional().catch(undefined),
}).strict();

export async function POST(request: NextRequest) {
  try {
    if (!hasAllowedOrigin(request)) return errorResponse("invalid_request", 400);
    const ip = getClientIp(request.headers);
    if (!(await passesEdgeRateLimit("CONTACT_LIMITER", ip))) {
      return errorResponse("rate_limited", 429, true, 60);
    }
    const limit = getRateLimitResult(ip);
    if (limit.limited) return errorResponse("rate_limited", 429, true, limit.retryAfterSeconds);
    const parsed = NotifySchema.safeParse(await readRequestBody(request));
    if (!parsed.success) return errorResponse("invalid_request", 400);
    const { email, source, language, website, elapsedMs, attemptId, measurement } = parsed.data;
    if (website) return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    if (elapsedMs < MIN_SUBMIT_TIME_MS) return errorResponse("invalid_request", 400);
    if (!process.env.RESEND_API_KEY) return errorResponse("temporarily_unavailable", 503, true, 60);
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: email,
      subject: `Avísame: ${source} (${language})`,
      text: `Correo: ${email}\nOrigen: ${source}\nIdioma: ${language}\n\nSolicita recibir avisos solo de nuevas apps o libros.`,
    }, {
      idempotencyKey: `notify-${createHash("sha256").update(JSON.stringify({ email, source, language, attemptId })).digest("hex")}`,
    });
    if (error || !data?.id) return errorResponse("temporarily_unavailable", 503, true, 60);
    if (measurement && measurement.language === language) {
      const event = normalizeEvent({ ...measurement, name: "notify_success", destination: source });
      if (event) writeEvent(event);
    }
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not log provider errors or form contents: they may contain personal data.
    return errorResponse("temporarily_unavailable", 503, true, 60);
  }
}
