"use client";

import { useLocale } from "next-intl";
import LiteYouTube from "@/components/media/LiteYouTube";
import { PAUSAR_MUSICA } from "@/components/MusicPlayer";

/** Video demo del sitio (70 s) bajo el hero. Al darle play se pausa la música de fondo. */
const DEMO_SRC = "https://www.youtube-nocookie.com/embed/lxhH-65sfJg";

export function HomeDemoVideo() {
  const es = useLocale() === "es";

  return (
    <section style={{ padding: "0 2rem 5rem", position: "relative", zIndex: 1, maxWidth: "1100px", margin: "0 auto" }}>
      <p className="ss-mono" style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--ss-muted)", textAlign: "center", marginBottom: "0.75rem" }}>
        {es ? "Video demo" : "Demo video"}
      </p>
      <h2 className="ss-serif" style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, textAlign: "center", marginBottom: "2rem" }}>
        {es ? "Storm Studios en " : "Storm Studios in "}
        <span className="ss-text-gradient">{es ? "70 segundos" : "70 seconds"}</span>
      </h2>
      <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "1.25rem", overflow: "hidden", border: "1px solid rgba(139,92,246,0.3)", boxShadow: "0 0 80px rgba(139,92,246,0.18)" }}>
        <LiteYouTube
          src={DEMO_SRC}
          title={es ? "Storm Studios Learning — video demo" : "Storm Studios Learning — demo video"}
          playLabel={es ? "Reproducir video" : "Play video"}
          onPlay={() => window.dispatchEvent(new Event(PAUSAR_MUSICA))}
        />
      </div>
    </section>
  );
}
