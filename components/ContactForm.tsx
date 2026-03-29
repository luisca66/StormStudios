"use client";

import { useEffect, useRef, useState } from "react";

type Props = { locale: string };

const LABELS = {
  es: {
    name: "Nombre",
    email: "Correo electrónico",
    message: "Mensaje",
    send: "Enviar mensaje",
    sending: "Enviando...",
    success: "¡Mensaje enviado! Te responderé pronto.",
    error: "Error al enviar. Intenta de nuevo.",
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
    error: "Error sending. Please try again.",
    namePlaceholder: "Your name",
    emailPlaceholder: "your@email.com",
    messagePlaceholder: "How can I help you?",
  },
};

export default function ContactForm({ locale }: Props) {
  const l = LABELS[locale as "es" | "en"] || LABELS.es;
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const startedAtRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (startedAtRef.current) {
      startedAtRef.current.value = String(Date.now());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
      website: (form.elements.namedItem("website") as HTMLInputElement).value,
      startedAt: Number((form.elements.namedItem("startedAt") as HTMLInputElement).value),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
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

      {status === "error" && <p className="text-red-600 text-sm">{l.error}</p>}

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
