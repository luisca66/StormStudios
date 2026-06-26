import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/cosmic-ear/jugar"),
    title: locale === "es" ? "Cosmic Ear — Modo juego de Desglose" : "Cosmic Ear — Desglose game mode",
    description:
      locale === "es"
        ? "Pilotea una nave 3D por el cosmos y resuelve planetas cantando las notas de cada acorde."
        : "Pilot a 3D ship through the cosmos and clear planets by singing the notes of each chord.",
    noIndex: true,
  });
}

export default async function CosmicEarPage({ params }: Props) {
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
        background: "#05070d",
      }}
    >
      <div
        style={{
          background: "#05070d",
          borderBottom: "1px solid rgba(255,255,255,0.12)",
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <a
            href={`/${locale}/apps/desglose-auditivo`}
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              textDecoration: "none",
            }}
          >
            ← {es ? "Volver a Desglose" : "Back to Unlocking"}
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: "#f5f2e9",
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            Cosmic Ear
          </span>
          <span
            style={{
              background: "rgba(139,92,246,0.14)",
              border: "1px solid rgba(139,92,246,0.35)",
              color: "#c4b5fd",
              fontSize: "0.6rem",
              fontFamily: "monospace",
              padding: "2px 7px",
              borderRadius: "999px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {es ? "Modo juego" : "Game mode"}
          </span>
        </div>
        <span
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: "0.68rem",
            fontFamily: "monospace",
          }}
        >
          {es ? "Pilotea · Escucha · Canta" : "Pilot · Listen · Sing"}
        </span>
      </div>

      <iframe
        src="/apps/cosmic-ear/index.html"
        title="Cosmic Ear"
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
