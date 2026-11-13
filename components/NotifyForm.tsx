"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { measurementContext } from "@/lib/analytics/client";

type Props = { locale: string; source: "leccion" | "catalogo" | "libro" };
const labels = {
  es: {
    title: "¿Te aviso cuando haya novedades?",
    text: "Te escribo solo cuando salga una app o un libro nuevo. Nada más.",
    email: "Tu correo", button: "Avísame", sending: "Enviando...",
    success: "Listo. Te escribo cuando haya algo nuevo.",
    error: "No se pudo enviar. Inténtalo de nuevo en un momento.",
  },
  en: {
    title: "Shall I let you know when there's news?",
    text: "I'll only write when a new app or book comes out. Nothing else.",
    email: "Your email", button: "Let me know", sending: "Sending...",
    success: "Done. I'll write when there's something new.",
    error: "It couldn't be sent. Please try again in a moment.",
  },
};

export default function NotifyForm({ locale, source }: Props) {
  const language = locale === "en" ? "en" : "es";
  const l = labels[language];
  const id = useId();
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const started = useRef(0);
  const attempt = useRef("");
  const pending = useRef<AbortController | null>(null);
  useEffect(() => {
    started.current = performance.now();
    attempt.current = crypto.randomUUID();
    return () => { pending.current?.abort(); pending.current = null; };
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    const form = e.currentTarget;
    const values = new FormData(form);
    const controller = new AbortController();
    pending.current = controller;
    setStatus("sending");
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch("/api/notify", {
        method: "POST", headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          email: values.get("email"), website: values.get("website"), source, language,
          elapsedMs: Math.round(performance.now() - started.current), attemptId: attempt.current,
          measurement: measurementContext(),
        }),
      });
      const result = await response.json();
      if (pending.current !== controller) return;
      if (!response.ok || result?.success !== true) throw new Error("delivery_failed");
      form.reset();
      setStatus("success");
    } catch {
      if (pending.current === controller) setStatus("error");
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) pending.current = null;
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="ss-glass ss-mono rounded-2xl p-6 mt-6" style={{ border: "1px solid rgba(139,92,246,0.25)", color: "#f0eeff" }}>
      <h2 id={`${id}-title`} className="ss-serif text-xl mb-3">{l.title}</h2>
      <p className="text-sm mb-4" style={{ color: "var(--ss-muted)", lineHeight: 1.8 }}>{l.text}</p>
      {status !== "success" && <form onSubmit={submit} aria-busy={status === "sending"}>
        <div aria-hidden="true" className="absolute w-px h-px overflow-hidden" style={{ left: "-10000px" }}>
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <label htmlFor={`${id}-email`} className="block text-sm mb-2">{l.email}</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" required maxLength={254}
            className="min-w-0 flex-1 rounded-lg px-4 py-3 border border-violet-400 bg-slate-950 text-white focus-visible:outline-2 focus-visible:outline-violet-300" />
          <button type="submit" disabled={status === "sending"} className="rounded-lg px-5 py-3 bg-violet-700 text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-violet-300">
            {status === "sending" ? l.sending : l.button}
          </button>
        </div>
      </form>}
      <p role="status" aria-live="polite" className="text-sm mt-3">{status === "success" ? l.success : status === "error" ? l.error : ""}</p>
      <Link href="/privacidad" className="text-xs underline" style={{ color: "#c4b5fd" }}>{language === "es" ? "Aviso de privacidad" : "Privacy notice"}</Link>
    </section>
  );
}
