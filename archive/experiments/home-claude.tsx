// app/page.tsx — Storm Studios Learning
// Next.js 15 · App Router · RSC + Client Island para la ola animada
//
// SETUP (una sola vez):
//   1. Copia storm-studios.css a app/storm-studios.css
//   2. En app/globals.css agrega al inicio: @import './storm-studios.css';
//   3. Crea components/WaveVisualizer.tsx (incluido abajo como comentario)

import type { Metadata } from "next";
import { WaveVisualizer } from "@/components/WaveVisualizer";

export const metadata: Metadata = {
  title: "Storm Studios Learning · Armonía Tradicional + IA",
  description:
    "Aprende análisis armónico con el método Shostakovich–Hernández Medrano. Cursos, apps de ear training y evaluación con IA.",
};

// ─── Sub-components (Server) ──────────────────────────────────────────────────

function NavBar() {
  const links = ["Curso", "Apps", "Libro", "Método"];

  return (
    <nav
      className="ss-mono"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1.5rem 2rem",
        maxWidth: "1280px",
        margin: "0 auto",
        position: "relative",
        zIndex: 10,
        flexWrap: "wrap",
        gap: "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "0.5rem",
            background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.9rem",
          }}
        >
          🎵
        </div>
        <span className="ss-serif" style={{ fontSize: "1.1rem", color: "white" }}>
          Storm Studios
        </span>
        <span
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            background: "rgba(139,92,246,0.2)",
            color: "#c4b5fd",
            border: "1px solid rgba(139,92,246,0.3)",
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
          }}
        >
          Learning
        </span>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" as const }}>
        {links.map((item) => (
          <a
            key={item}
            href="#"
            style={{
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.5)",
              textDecoration: "none",
              letterSpacing: "0.05em",
            }}
          >
            {item}
          </a>
        ))}
      </div>

      <button
        style={{
          background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
          color: "white",
          border: "none",
          cursor: "pointer",
          padding: "0.65rem 1.4rem",
          borderRadius: "0.75rem",
          fontFamily: "inherit",
          fontSize: "0.8rem",
          boxShadow: "0 4px 20px rgba(139,92,246,0.3)",
        }}
      >
        Comenzar gratis
      </button>
    </nav>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
      <span className="ss-serif ss-text-gradient" style={{ fontSize: "2.8rem", lineHeight: 1 }}>
        {value}
      </span>
      <span
        className="ss-mono"
        style={{
          fontSize: "0.65rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface CardProps {
  icon: string;
  tag: string;
  tagColor: string;
  accentHex: string;
  title: string;
  description: string;
  delay: string;
}

function FeatureCard({ icon, tag, tagColor, accentHex, title, description, delay }: CardProps) {
  return (
    <div
      className="ss-glass ss-card ss-reveal"
      style={{
        borderRadius: "1.25rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        animationDelay: delay,
      }}
    >
      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          background: `${accentHex}22`,
          border: `1px solid ${accentHex}44`,
        }}
      >
        {icon}
      </div>

      <span
        className="ss-mono"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase" as const,
          padding: "0.25rem 0.75rem",
          borderRadius: "9999px",
          alignSelf: "flex-start",
          background: `${accentHex}22`,
          color: tagColor,
          border: `1px solid ${accentHex}40`,
        }}
      >
        {tag}
      </span>

      <h3 className="ss-serif" style={{ fontSize: "1.5rem", lineHeight: 1.2, color: "white" }}>
        {title}
      </h3>

      <p className="ss-mono" style={{ fontSize: "0.8rem", lineHeight: 1.8, color: "rgba(255,255,255,0.5)" }}>
        {description}
      </p>

      <a
        href="#"
        className="ss-mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.78rem",
          fontWeight: 500,
          textDecoration: "none",
          marginTop: "auto",
          color: tagColor,
        }}
      >
        Explorar →
      </a>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const features: CardProps[] = [
    {
      icon: "📖",
      tag: "Armonía Clásica",
      tagColor: "#c4b5fd",
      accentHex: "#8b5cf6",
      title: "Curso de Armonía Tradicional",
      description:
        "El método Shostakovich–Hernández Medrano: análisis armónico profundo, voice leading y forma musical. 12 módulos con partituras y MIDI interactivo.",
      delay: "0.1s",
    },
    {
      icon: "🎧",
      tag: "Entrenamiento Auditivo",
      tagColor: "#93c5fd",
      accentHex: "#3b82f6",
      title: "Apps de Ear Training",
      description:
        "Intervalos, acordes, progresiones y dictado melódico. Algoritmos de repetición espaciada que se adaptan a tus errores en tiempo real.",
      delay: "0.25s",
    },
    {
      icon: "🧠",
      tag: "IA + Pedagogía",
      tagColor: "#67e8f9",
      accentHex: "#06b6d4",
      title: "Sistema de Evaluación IA",
      description:
        "Sube tu ejercicio MIDI. Nuestra IA valida tu armonía contra las reglas del método, genera retroalimentación escrita y registra tu progreso.",
      delay: "0.4s",
    },
    {
      icon: "📚",
      tag: "Libro Digital",
      tagColor: "#6ee7b7",
      accentHex: "#10b981",
      title: "Manual de Armonía Shostakovich",
      description:
        "El libro de texto oficial del método. Partituras, ejemplos históricos, ejercicios graduados y referencia técnica permanente.",
      delay: "0.55s",
    },
  ];

  return (
    <div className="ss-root">
      {/* Ambient orbs */}
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      {/* ═══ NAV ═══ */}
      <NavBar />

      {/* ═══ HERO ═══ */}
      <section
        style={{
          textAlign: "center",
          padding: "6rem 2rem 8rem",
          maxWidth: "1280px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Badge */}
        <div
          className="ss-glass ss-reveal ss-mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.45rem 1rem",
            borderRadius: "9999px",
            marginBottom: "2.5rem",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.65)",
            animationDelay: "0s",
          }}
        >
          <span
            className="ss-blink"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#fbbf24",
              boxShadow: "0 0 8px #fbbf24",
              display: "inline-block",
            }}
          />
          Método Shostakovich · Potenciado por IA
        </div>

        {/* Headline */}
        <h1
          className="ss-serif ss-reveal"
          style={{
            fontSize: "clamp(3rem,9vw,7rem)",
            lineHeight: 1,
            marginBottom: "1.5rem",
            animationDelay: "0.12s",
          }}
        >
          Domina la <span className="ss-text-gradient">Armonía</span>
          <br />
          del Futuro
        </h1>

        {/* Sub */}
        <p
          className="ss-mono ss-reveal"
          style={{
            maxWidth: "600px",
            fontSize: "1rem",
            lineHeight: 1.75,
            color: "rgba(255,255,255,0.5)",
            marginBottom: "3rem",
            animationDelay: "0.24s",
          }}
        >
          Donde la tradición de Shostakovich converge con la inteligencia artificial.
          Aprende análisis armónico profundo, valida tus composiciones con IA
          y lleva tu oído musical al siguiente nivel.
        </p>

        {/* CTAs */}
        <div
          className="ss-reveal"
          style={{
            display: "flex",
            gap: "1rem",
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: "5rem",
            animationDelay: "0.36s",
          }}
        >
          <button
            className="ss-mono"
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
              color: "white",
              border: "none",
              cursor: "pointer",
              padding: "1rem 2.2rem",
              borderRadius: "0.875rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
            }}
          >
            Explorar el Curso →
          </button>
          <button
            className="ss-glass ss-mono"
            style={{
              color: "rgba(255,255,255,0.7)",
              background: "transparent",
              cursor: "pointer",
              padding: "1rem 2.2rem",
              borderRadius: "0.875rem",
              fontSize: "0.85rem",
            }}
          >
            Ver demostración ▶
          </button>
        </div>

        {/* Wave window — Client Island */}
        <div
          className="ss-reveal"
          style={{ width: "100%", maxWidth: "680px", animationDelay: "0.48s" }}
        >
          <div
            className="ss-glass"
            style={{
              borderRadius: "1.25rem",
              padding: "1.5rem 2rem",
              boxShadow:
                "0 0 80px rgba(139,92,246,0.12), inset 0 0 40px rgba(59,130,246,0.05)",
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                {["#ef4444", "#fbbf24", "#22c55e"].map((c) => (
                  <div
                    key={c}
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: c,
                    }}
                  />
                ))}
              </div>
              <span
                className="ss-mono"
                style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.28)",
                  letterSpacing: "0.08em",
                }}
              >
                análisis · sonata op. 64 nº 2 — shostakovich
              </span>
              <div
                className="ss-blink"
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 10px #22c55e",
                }}
              />
            </div>

            {/* Animated bars — needs "use client" */}
            <WaveVisualizer />
          </div>
        </div>

        {/* Stats */}
        <div
          className="ss-reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "3rem",
            justifyContent: "center",
            marginTop: "5rem",
            animationDelay: "0.6s",
          }}
        >
          <StatItem value="12" label="Módulos" />
          <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
          <StatItem value="300+" label="Ejercicios" />
          <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
          <StatItem value="IA" label="Evaluación" />
          <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
          <StatItem value="∞" label="Acceso" />
        </div>
      </section>

      {/* Divider */}
      <div
        className="ss-divider"
        style={{ margin: "0 2rem", position: "relative", zIndex: 1 }}
      />

      {/* ═══ FEATURES ═══ */}
      <section
        style={{
          padding: "6rem 2rem",
          position: "relative",
          zIndex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span
            className="ss-mono"
            style={{
              display: "inline-block",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
              background: "rgba(139,92,246,0.15)",
              color: "#c4b5fd",
              border: "1px solid rgba(139,92,246,0.25)",
              padding: "0.35rem 1rem",
              borderRadius: "9999px",
              marginBottom: "1.5rem",
            }}
          >
            Lo que incluye
          </span>
          <h2
            className="ss-serif ss-reveal"
            style={{
              fontSize: "clamp(2rem,5vw,3.5rem)",
              lineHeight: 1.1,
              marginBottom: "1rem",
              animationDelay: "0.1s",
            }}
          >
            Todo lo que necesitas
            <br />
            <span className="ss-text-gradient">en un solo lugar</span>
          </h2>
          <p
            className="ss-mono ss-reveal"
            style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.45)",
              maxWidth: "480px",
              margin: "0 auto",
              lineHeight: 1.8,
              animationDelay: "0.2s",
            }}
          >
            Un ecosistema completo: teoría clásica, práctica auditiva y retroalimentación inteligente.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.tag} {...f} />
          ))}
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section
        style={{
          padding: "0 2rem 8rem",
          position: "relative",
          zIndex: 1,
          maxWidth: "1280px",
          margin: "0 auto",
        }}
      >
        <div
          className="ss-glass"
          style={{
            borderRadius: "2rem",
            padding: "4rem 3rem",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 0 100px rgba(139,92,246,0.14)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "2rem",
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <h2
            className="ss-serif ss-reveal"
            style={{
              fontSize: "clamp(1.8rem,4vw,3rem)",
              lineHeight: 1.15,
              marginBottom: "1rem",
              position: "relative",
              zIndex: 1,
              animationDelay: "0.1s",
            }}
          >
            Comienza tu viaje
            <br />
            <span className="ss-text-gradient">armónico hoy</span>
          </h2>
          <p
            className="ss-mono ss-reveal"
            style={{
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "2rem",
              position: "relative",
              zIndex: 1,
              animationDelay: "0.2s",
            }}
          >
            Acceso gratuito al primer módulo. Sin tarjeta de crédito.
          </p>
          <button
            className="ss-mono ss-reveal"
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
              color: "white",
              border: "none",
              cursor: "pointer",
              padding: "1rem 2.5rem",
              borderRadius: "0.875rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              boxShadow: "0 8px 40px rgba(139,92,246,0.4)",
              position: "relative",
              zIndex: 1,
              animationDelay: "0.3s",
            }}
          >
            Acceder gratis →
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer
        className="ss-mono"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
          maxWidth: "1280px",
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          fontSize: "0.72rem",
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.05em",
        }}
      >
        <span>🎵 © 2025 Storm Studios Learning</span>
        <span>Armonía tradicional · IA · México</span>
      </footer>
    </div>
  );
}
