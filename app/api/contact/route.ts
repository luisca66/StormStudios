import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MIN_SUBMIT_TIME_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Lightweight in-memory rate limiter (per instance/process).
// Suitable for basic protection, but not shared across multiple server instances.
const ipRequestLog = new Map<string, number[]>();

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
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
});

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recent = (ipRequestLog.get(ip) || []).filter((ts) => ts > windowStart);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    ipRequestLog.set(ip, recent);
    return true;
  }

  recent.push(now);
  ipRequestLog.set(ip, recent);
  return false;
}

function blockedResponse(status = 400) {
  return NextResponse.json(
    { error: "No se pudo procesar la solicitud" },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (isRateLimited(ip)) {
      return blockedResponse(429);
    }

    const body = await request.json();
    const parsed = ContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { name, email, message, website, startedAt } = parsed.data;

    if (website.trim().length > 0) {
      return blockedResponse();
    }

    if (Date.now() - startedAt < MIN_SUBMIT_TIME_MS) {
      return blockedResponse();
    }

    // Envío con Resend (configurar RESEND_API_KEY en variables de entorno)
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Storm Studios <noreply@stormstudios.com.mx>",
        to: "info@stormstudios.com.mx",
        replyTo: email,
        subject: `Mensaje de contacto de ${name}`,
        text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <hr>
          <p><strong>Mensaje:</strong></p>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      });
    } else {
      // En desarrollo, solo loggear
      console.log("[CONTACT FORM]", { name, email, message });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONTACT API ERROR]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
