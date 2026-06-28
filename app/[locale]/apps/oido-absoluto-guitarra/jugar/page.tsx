import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/oido-absoluto-guitarra/jugar"),
    title: locale === "es" ? "Oido Absoluto Guitarra Clasica" : "Perfect Pitch Classical Guitar",
    description:
      locale === "es"
        ? "Entrena reconocimiento de notas absolutas con samples reales de guitarra clasica por cuerda, modos de juego y estadisticas locales."
        : "Train absolute-note recognition with real classical-guitar samples by string, game modes, and local statistics.",
    noIndex: true,
  });
}

export default async function OidoAbsolutoGuitarraPage({ params }: Props) {
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
        background: "#14110f",
      }}
    >
      <div
        style={{
          background: "#14110f",
          borderBottom: "1px solid rgba(242,232,221,0.14)",
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
            href={`/${locale}/apps/oido-absoluto-guitarra`}
            style={{
              color: "rgba(242,232,221,0.65)",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← {es ? "Volver" : "Back"}
          </a>
          <span style={{ color: "rgba(242,232,221,0.22)", fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: "#f2e8dd",
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {es ? "Oido Absoluto Guitarra Clasica" : "Perfect Pitch Classical Guitar"}
          </span>
          <span
            style={{
              background: "rgba(198,124,78,0.14)",
              border: "1px solid rgba(198,124,78,0.32)",
              color: "#dfa16e",
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
            color: "rgba(242,232,221,0.4)",
            fontSize: "0.68rem",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          {es ? "Escucha · Reconoce · Responde" : "Listen · Recognize · Answer"}
        </span>
      </div>

      <iframe
        src={`/apps/ap-guitar/index.html?lang=${locale}`}
        title={es ? "Oido Absoluto Guitarra Clasica" : "Perfect Pitch Classical Guitar"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
