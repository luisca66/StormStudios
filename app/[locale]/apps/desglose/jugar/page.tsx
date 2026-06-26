import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/desglose/jugar"),
    title: locale === "es" ? "Desglose" : "Unlocking",
    description:
      locale === "es"
        ? "Aísla y canta cada nota dentro de un acorde; la app evalúa tu afinación con el micrófono."
        : "Isolate and sing each note inside a chord; the app evaluates your pitch with the microphone.",
    noIndex: true,
  });
}

export default async function DesglosePage({ params }: Props) {
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
        background: "#10100f",
      }}
    >
      <div
        style={{
          background: "#10100f",
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
            ← {es ? "Volver" : "Back"}
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
            {es ? "Desglose" : "Unlocking"}
          </span>
          <span
            style={{
              background: "rgba(218,165,32,0.12)",
              border: "1px solid rgba(218,165,32,0.3)",
              color: "#d8b766",
              fontSize: "0.6rem",
              fontFamily: "monospace",
              padding: "2px 7px",
              borderRadius: "999px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
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
          }}
        >
          {es ? "Escucha · Aísla · Canta" : "Listen · Isolate · Sing"}
        </span>
      </div>

      <iframe
        src={`/apps/desglose/index.html?lang=${locale}`}
        title={es ? "Desglose" : "Unlocking"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
