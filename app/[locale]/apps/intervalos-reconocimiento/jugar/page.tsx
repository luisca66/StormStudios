import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/intervalos-reconocimiento/jugar"),
    title: locale === "es" ? "Intervalos - Reconocimiento" : "Intervals - Recognition",
    description:
      locale === "es"
        ? "Entrena el reconocimiento auditivo de intervalos con timbres, modos de reproducción y estadísticas locales."
        : "Train interval recognition with timbres, playback modes, and local statistics.",
    noIndex: true,
  });
}

export default async function IntervalosReconocimientoPage({ params }: Props) {
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
        background: "#0c0c14",
      }}
    >
      <div
        style={{
          background: "#0c0c14",
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
            ← {es ? "Volver" : "Back"}
          </a>
          <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: "#ede8df",
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {es ? "Intervalos - Reconocimiento" : "Intervals - Recognition"}
          </span>
          <span
            style={{
              background: "rgba(201,168,108,0.12)",
              border: "1px solid rgba(201,168,108,0.3)",
              color: "#d8b766",
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
          {es ? "Escucha · Reconoce · Responde" : "Listen · Recognize · Answer"}
        </span>
      </div>

      <iframe
        src={`/apps/intervalos-reconocimiento/index.html?lang=${locale}`}
        title={es ? "Intervalos - Reconocimiento" : "Intervals - Recognition"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
