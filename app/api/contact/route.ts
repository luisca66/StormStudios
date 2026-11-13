import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getClientIp } from "@/lib/http/client-ip";
import { passesEdgeRateLimit } from "@/lib/http/edge-rate-limit";
import { contextSchema, normalizeEvent } from "@/lib/analytics/events";
import { writeEvent } from "@/lib/analytics/write";

import { MIN_SUBMIT_TIME_MS, MAX_SUBMIT_TIME_MS, escapeHtml, getRateLimitResult, errorResponse, hasAllowedOrigin, readRequestBody, MAIL_FROM, MAIL_TO } from "@/lib/http/mail-form";

export const runtime = "nodejs";

const ContactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((value) => !/[\r\n]/.test(value)),
  email: z.email(),
  message: z.string().trim().min(10).max(2000),
  website: z.string().max(200).optional().default(""),
  // Tiempo en el formulario medido con el reloj monótono del navegador: no
  // depende de que el reloj del visitante coincida con el del servidor.
  elapsedMs: z.number().int().min(0).max(MAX_SUBMIT_TIME_MS),
  // Identificador del intento, estable entre reintentos del mismo envío.
  attemptId: z.string().regex(/^[A-Za-z0-9-]{8,64}$/),
  measurement: contextSchema.optional().catch(undefined),
}).strict();

export async function POST(request: NextRequest) {
  try {
    if (!hasAllowedOrigin(request)) {
      return errorResponse("invalid_request", 400);
    }

    const ip = getClientIp(request.headers);

    if (!(await passesEdgeRateLimit("CONTACT_LIMITER", ip))) {
      return errorResponse("rate_limited", 429, true, 60);
    }

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

    const { name, email, message, website, elapsedMs, attemptId } = parsed.data;
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeMessage = escapeHtml(message);

    if (website) {
      // Honeypot lleno: responder como éxito para no enseñar nada al bot.
      return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    }

    if (elapsedMs < MIN_SUBMIT_TIME_MS) {
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
      from: MAIL_FROM,
      to: MAIL_TO,
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
    }, {
      // Stable for retries of the same form attempt, including across instances.
      // Hash the payload so the provider key contains no readable personal data.
      idempotencyKey: `contact-${createHash("sha256")
        .update(JSON.stringify({ name, email, message, attemptId }))
        .digest("hex")}`,
    });

    if (error || !data?.id) {
      console.error("[CONTACT API] Email provider rejected the request");
      return errorResponse("temporarily_unavailable", 503, true, 60);
    }

    // Only after confirmed email delivery; never include the form's contents,
    // IP, attemptId or provider id in the measurement.
    if (parsed.data.measurement) {
      const event = normalizeEvent({ ...parsed.data.measurement, name: "contact_success" });
      if (event) writeEvent(event);
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
