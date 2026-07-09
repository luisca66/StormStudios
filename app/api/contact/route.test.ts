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

function contactRequest(ip: string) {
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
      startedAt: Date.now() - 5000,
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
});
