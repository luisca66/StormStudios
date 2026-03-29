import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/intervalos"),
    title: locale === "es" ? "Piano de Intervalos" : "Interval Piano",
    description:
      locale === "es"
        ? "Herramienta interactiva para explorar intervalos musicales en el piano."
        : "Interactive tool for exploring musical intervals on the piano.",
    noIndex: true,
  });
}

export default async function IntervalosPage({ params }: Props) {
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
          <a href={`/${locale}/curso-armonia`}
            style={{ color: "rgba(148,163,184,0.7)", fontSize: "0.72rem", fontFamily: "monospace", textDecoration: "none" }}>
            ← {es ? "Curso de Armonía" : "Harmony Course"}
          </a>
          <span style={{ color: "#334155", fontSize: "0.75rem" }}>|</span>
          <span style={{ color: "#f0eeff", fontFamily: "monospace", fontSize: "0.78rem", fontWeight: 600 }}>
            {es ? "Piano de Intervalos" : "Interval Piano"}
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
          {es ? "Selecciona · Escucha · Aprende" : "Select · Listen · Learn"}
        </span>
      </div>

      {/* Iframe */}
      <iframe
        src={`/apps/intervalos.html?lang=${locale}`}
        title={es ? "Piano de Intervalos" : "Interval Piano"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
