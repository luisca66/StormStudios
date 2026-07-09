"use client";

import { useEffect, useRef, useState } from "react";

type Props = { locale: string };
type ContactErrorCode =
  | "invalid_request"
  | "rate_limited"
  | "temporarily_unavailable";

const CONTACT_REQUEST_TIMEOUT_MS = 20_000;

const LABELS = {
  es: {
    name: "Nombre",
    email: "Correo electrónico",
    message: "Mensaje",
    send: "Enviar mensaje",
    sending: "Enviando...",
    success: "¡Mensaje enviado! Te responderé pronto.",
    error: "No pudimos enviar tu mensaje. Intenta de nuevo.",
    invalidRequest: "Revisa los datos del formulario e inténtalo de nuevo.",
    rateLimited: "Espera unos minutos antes de volver a intentarlo.",
    temporarilyUnavailable:
      "El formulario está temporalmente no disponible. Intenta de nuevo en unos minutos.",
    namePlaceholder: "Tu nombre",
    emailPlaceholder: "tu@correo.com",
    messagePlaceholder: "¿En qué puedo ayudarte?",
  },
  en: {
    name: "Name",
    email: "Email address",
    message: "Message",
    send: "Send message",
    sending: "Sending...",
    success: "Message sent! I'll get back to you soon.",
    error: "We couldn't send your message. Please try again.",
    invalidRequest: "Check the form details and try again.",
    rateLimited: "Please wait a few minutes before trying again.",
    temporarilyUnavailable:
      "The contact form is temporarily unavailable. Please try again in a few minutes.",
    namePlaceholder: "Your name",
    emailPlaceholder: "your@email.com",
    messagePlaceholder: "How can I help you?",
  },
};

export default function ContactForm({ locale }: Props) {
  const l = LABELS[locale as "es" | "en"] || LABELS.es;
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorCode, setErrorCode] = useState<ContactErrorCode | null>(null);
  const startedAtRef = useRef<HTMLInputElement | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    if (startedAtRef.current) {
      startedAtRef.current.value = String(Date.now());
    }

    return () => {
      isMountedRef.current = false;
      requestControllerRef.current?.abort();
      if (requestTimeoutRef.current !== null) {
        window.clearTimeout(requestTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    setErrorCode(null);
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      website: (form.elements.namedItem("website") as HTMLInputElement).value,
      startedAt: Number((form.elements.namedItem("startedAt") as HTMLInputElement).value),
    };
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      CONTACT_REQUEST_TIMEOUT_MS
    );
    requestTimeoutRef.current = timeoutId;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      const responseBody: unknown = await res.json().catch(() => null);

      if (
        res.ok &&
        typeof responseBody === "object" &&
        responseBody !== null &&
        "success" in responseBody &&
        responseBody.success === true
      ) {
        if (!isMountedRef.current || requestControllerRef.current !== controller) return;
        setStatus("success");
        form.reset();
      } else {
        if (!isMountedRef.current || requestControllerRef.current !== controller) return;
        if (
          typeof responseBody === "object" &&
          responseBody !== null &&
          "error" in responseBody &&
          (responseBody.error === "invalid_request" ||
            responseBody.error === "rate_limited" ||
            responseBody.error === "temporarily_unavailable")
        ) {
          setErrorCode(responseBody.error);
        }
        setStatus("error");
      }
    } catch {
      if (!isMountedRef.current || requestControllerRef.current !== controller) return;
      if (controller.signal.aborted) {
        setErrorCode("temporarily_unavailable");
      } else {
        setErrorCode(null);
      }
      setStatus("error");
    } finally {
      window.clearTimeout(timeoutId);
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }
      if (requestTimeoutRef.current === timeoutId) {
        requestTimeoutRef.current = null;
      }
    }
  };

  if (status === "success") {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-xl text-green-800 font-medium text-center">
        ✅ {l.success}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-10000px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <input ref={startedAtRef} type="hidden" id="startedAt" name="startedAt" defaultValue="" readOnly />

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          {l.name}
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder={l.namePlaceholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          {l.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder={l.emailPlaceholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
          {l.message}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder={l.messagePlaceholder}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-red-600 text-sm" role="alert" aria-live="assertive">
          {errorCode === "invalid_request"
            ? l.invalidRequest
            : errorCode === "rate_limited"
              ? l.rateLimited
              : errorCode === "temporarily_unavailable"
                ? l.temporarilyUnavailable
                : l.error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition"
      >
        {status === "sending" ? l.sending : l.send}
      </button>
    </form>
  );
}
