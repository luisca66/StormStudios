import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/intervalos-cantados/jugar"),
    title: locale === "es" ? "Intervalos Cantados" : "Sung Intervals",
    description:
      locale === "es"
        ? "Entrena la producción vocal de intervalos: escucha la nota inicial, nombra la llegada y cántala con precisión."
        : "Train sung interval production: hear the starting note, name the target, and sing it accurately.",
    noIndex: true,
  });
}

export default async function IntervalosCantadosPage({ params }: Props) {
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
        background: "#050711",
      }}
    >
      <div
        style={{
          background: "#050711",
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
            href={`/${locale}/apps/intervalos-cantados`}
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← {es ? "Volver" : "Back"}
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: "#eaf4ff",
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {es ? "Intervalos Cantados" : "Sung Intervals"}
          </span>
          <span
            style={{
              background: "rgba(103,214,255,0.12)",
              border: "1px solid rgba(103,214,255,0.3)",
              color: "#67d6ff",
              fontSize: "0.6rem",
              fontFamily: "monospace",
              padding: "2px 7px",
              borderRadius: "999px",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Web App
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
          {es ? "Escucha · Nombra · Canta" : "Listen · Name · Sing"}
        </span>
      </div>

      <iframe
        src={`/apps/intervalos-cantados/index.html?lang=${locale}`}
        title={es ? "Intervalos Cantados" : "Sung Intervals"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
