import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Storm Sequencer v3.0 — Storm Studios Learning",
    description: locale === "es"
      ? "Secuenciador musical online gratuito con notación en tiempo real — Storm Studios Learning"
      : "Free online music sequencer with real-time notation — Storm Studios Learning",
  };
}

export default async function SequencerPage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

  return (
    /*
     * El header del sitio mide 64px (h-16).
     * Esta página ocupa calc(100vh - 64px) para que el iframe
     * llene exactamente el espacio restante sin scroll.
     */
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 64px)",
      overflow: "hidden",
      background: "#0f172a",
    }}>
      {/* Barra del secuenciador */}
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
            Storm Sequencer v3.0
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
          {es ? "Compón · Experimenta · Exporta MIDI" : "Compose · Experiment · Export MIDI"}
        </span>
      </div>

      {/* Iframe — ocupa todo lo que queda */}
      <iframe
        src={es ? "/tools/secuenciador.html" : "/tools/sequencer.html"}
        title="Storm Sequencer v3.0"
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </div>
  );
}
