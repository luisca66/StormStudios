import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/memoria"),
    title: locale === "es" ? "App Memoria – Nemotecnia" : "Memory App – Mnemonics",
    description:
      locale === "es"
        ? "Herramienta interactiva de memoria y nemotecnia para practica musical y cognitiva."
        : "Interactive memory and mnemonic tool for musical and cognitive practice.",
    noIndex: true,
  });
}

export default async function MemoriaPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 64px)",
      overflow: "hidden",
      background: "#0f172a",
    }}>
      {/* Barra superior */}
      <div style={{
        background: "#0f172a",
        borderBottom: "1px solid rgba(71,85,105,0.6)",
        padding: "6px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a href={`/${locale}/apps`}
            style={{ color: "rgba(148,163,184,0.7)", fontSize: "0.72rem", fontFamily: "monospace", textDecoration: "none" }}>
            ← {es ? "Apps" : "Apps"}
          </a>
          <span style={{ color: "#334155", fontSize: "0.75rem" }}>|</span>
          <span style={{ color: "#f0eeff", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600 }}>
            {es ? "App Memoria – Nemotecnia" : "Memory App – Mnemonics"}
          </span>
          <span style={{
            background: "rgba(16,185,129,0.15)",
            border: "1px solid rgba(16,185,129,0.3)",
            color: "rgba(52,211,153,0.9)",
            fontSize: "0.6rem",
            fontFamily: "monospace",
            padding: "2px 7px",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}>
            Web App
          </span>
        </div>
        <span style={{ color: "rgba(148,163,184,0.4)", fontSize: "0.68rem", fontFamily: "monospace" }}>
          {es ? "Memoriza · Practica · Domina" : "Memorize · Practice · Master"}
        </span>
      </div>

      {/* Iframe */}
      <iframe
        src={`/apps/memoria.html?lang=${locale}`}
        title={es ? "App Memoria – Nemotecnia" : "Memory App – Mnemonics"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
