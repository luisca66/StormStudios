import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/intervalos-reconocimiento/juego"),
    title: locale === "es" ? "Synth-Kong - Videojuego" : "Synth-Kong - Video Game",
    description:
      locale === "es"
        ? "Avanza por sectores en un videojuego retro mientras reconoces intervalos auditivos."
        : "Advance through sectors in a retro video game while recognizing musical intervals by ear.",
    noIndex: true,
  });
}

export default async function IntervalosReconocimientoJuegoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        overflow: "hidden",
        background: "#050510",
      }}
    >
      <div
        style={{
          background: "#050510",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <a
            href={`/${locale}/apps/intervalos-reconocimiento`}
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← {es ? "Volver a Intervalos" : "Back to Intervals"}
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: "#f5f2e9",
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Synth-Kong
          </span>
          <span
            style={{
              background: "rgba(0,229,255,0.12)",
              border: "1px solid rgba(0,229,255,0.3)",
              color: "#67e8f9",
              fontSize: "0.6rem",
              fontFamily: "monospace",
              padding: "2px 7px",
              borderRadius: "999px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              whiteSpace: "nowrap",
            }}
          >
            {es ? "Videojuego" : "Video game"}
          </span>
        </div>
        <span
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: "0.68rem",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          {es ? "Escucha · Reconoce · Dispara" : "Listen · Recognize · Fire"}
        </span>
      </div>

      <iframe
        src={`/apps/intervalos-reconocimiento-juego/index.html?lang=${es ? "es" : "en"}`}
        title="Synth-Kong"
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
