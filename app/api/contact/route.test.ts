import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmail };
  },
}));

import { POST } from "./route";

const originalResendApiKey = process.env.RESEND_API_KEY;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function contactRequest(ip: string, overrides: Record<string, unknown> = {}) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      name: "Nombre de prueba",
      email: "persona@example.com",
      message: "Este es un mensaje de prueba válido.",
      website: "",
      elapsedMs: 5000,
      attemptId: "3f2b8c1e-attempt",
      ...overrides,
    }),
  });
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();

    if (originalResendApiKey) {
      process.env.RESEND_API_KEY = originalResendApiKey;
    } else {
      delete process.env.RESEND_API_KEY;
    }
  });

  it("does not report success or log form data when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;

    const response = await POST(contactRequest("198.51.100.10"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "temporarily_unavailable",
      retryable: true,
    });
    expect(response.headers.get("retry-after")).toBe("60");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[CONTACT API] RESEND_API_KEY is not configured"
    );
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(
      "persona@example.com"
    );
  });

  it("returns a retryable failure when Resend rejects the email", async () => {
    process.env.RESEND_API_KEY = "re_test";
    sendEmail.mockResolvedValue({
      data: null,
      error: {
        name: "internal_server_error",
        message: "Email service unavailable",
        statusCode: 500,
      },
      headers: null,
    });

    const response = await POST(contactRequest("198.51.100.11"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "temporarily_unavailable",
      retryable: true,
    });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[CONTACT API] Email provider rejected the request"
    );
  });

  it("reports success only after Resend returns an email id", async () => {
    process.env.RESEND_API_KEY = "re_test";
    sendEmail.mockResolvedValue({
      data: { id: "email_123" },
      error: null,
      headers: null,
    });

    const response = await POST(contactRequest("198.51.100.12"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("uses the same opaque provider key when the same request is retried", async () => {
    process.env.RESEND_API_KEY = "re_test";
    sendEmail.mockResolvedValue({ data: { id: "email_retry" }, error: null });
    const request = contactRequest("198.51.100.30");
    const retry = request.clone() as NextRequest;
    expect((await POST(request)).status).toBe(200);
    expect((await POST(retry)).status).toBe(200);
    const firstKey = sendEmail.mock.calls[0][1].idempotencyKey;
    expect(firstKey).toMatch(/^contact-[a-f0-9]{64}$/);
    expect(sendEmail.mock.calls[1][1].idempotencyKey).toBe(firstKey);
    expect(firstKey).not.toContain("persona@example.com");
  });

  it("rejects submissions made faster than a human could type", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const response = await POST(contactRequest("198.51.100.40", { elapsedMs: 500 }));
    expect(response.status).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("does not depend on the visitor clock", async () => {
    process.env.RESEND_API_KEY = "re_test";
    sendEmail.mockResolvedValue({ data: { id: "email_clock" }, error: null });
    vi.useFakeTimers({ now: new Date("2020-01-01T00:00:00Z") });
    try {
      const response = await POST(contactRequest("198.51.100.41"));
      expect(response.status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it("silently accepts but does not send when the honeypot is filled", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const response = await POST(contactRequest("198.51.100.42", { website: "spam.example" }));
    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
