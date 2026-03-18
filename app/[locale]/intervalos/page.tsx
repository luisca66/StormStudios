import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "es" ? "Piano de Intervalos" : "Interval Piano",
    description: locale === "es"
      ? "Explora intervalos musicales en el piano: selecciona dos notas y escucha el intervalo melódico o armónico."
      : "Explore musical intervals on the piano: select two notes and listen melodically or harmonically.",
  };
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
