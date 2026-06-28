import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/oido-absoluto-multi/jugar"),
    title: locale === "es" ? "Oido Absoluto Multi-timbrico" : "Perfect Pitch Multi-timbral",
    description:
      locale === "es"
        ? "Entrena reconocimiento de notas absolutas con piano, cello, corno, coro, fagot, modos de juego y estadisticas locales."
        : "Train absolute-note recognition with piano, cello, horn, choir, bassoon, game modes, and local statistics.",
    noIndex: true,
  });
}

export default async function OidoAbsolutoMultiPage({ params }: Props) {
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
        background: "#10110f",
      }}
    >
      <div
        style={{
          background: "#10110f",
          borderBottom: "1px solid rgba(246,241,229,0.14)",
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
            href={`/${locale}/apps/oido-absoluto-multi`}
            style={{
              color: "rgba(246,241,229,0.65)",
              fontSize: "0.72rem",
              fontFamily: "monospace",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← {es ? "Volver" : "Back"}
          </a>
          <span style={{ color: "rgba(246,241,229,0.22)", fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: "#f6f1e5",
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {es ? "Oido Absoluto Multi-timbrico" : "Perfect Pitch Multi-timbral"}
          </span>
          <span
            style={{
              background: "rgba(64,206,197,0.14)",
              border: "1px solid rgba(64,206,197,0.34)",
              color: "#62efe6",
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
            color: "rgba(246,241,229,0.4)",
            fontSize: "0.68rem",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
          }}
        >
          {es ? "Escucha · Reconoce · Responde" : "Listen · Recognize · Answer"}
        </span>
      </div>

      <iframe
        src={`/apps/ap-multi/index.html?lang=${locale}`}
        title={es ? "Oido Absoluto Multi-timbrico" : "Perfect Pitch Multi-timbral"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
