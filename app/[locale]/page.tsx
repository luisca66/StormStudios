// app/[locale]/page.tsx — Storm Studios Learning
// RSC + Client Island (WaveVisualizer) para la ola animada

import { WaveVisualizer } from "@/components/WaveVisualizer";
import { MusicPlayer } from "@/components/MusicPlayer";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { APPS } from "@/data/apps/apps-catalog";

type Props = { params: Promise<{ locale: string }> };

// ─── Sub-components (Server) ──────────────────────────────────────────────────

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
          textTransform: "uppercase",
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
  href: string;
}

function FeatureCard({ icon, tag, tagColor, accentHex, title, description, delay, href }: CardProps) {
  return (
    <Link
      href={href as Parameters<typeof Link>[0]["href"]}
      className="ss-glass ss-card ss-reveal"
      style={{
        borderRadius: "1.25rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        animationDelay: delay,
        textDecoration: "none",
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
          textTransform: "uppercase",
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

      <span
        className="ss-mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.78rem",
          fontWeight: 500,
          marginTop: "auto",
          color: tagColor,
        }}
      >
        Explorar →
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const es = locale === "es";

  const features: CardProps[] = [
    {
      icon: "📖",
      tag: es ? "Armonía Clásica" : "Classical Harmony",
      tagColor: "#c4b5fd",
      accentHex: "#8b5cf6",
      title: es ? "Curso de Armonía Tradicional" : "Traditional Harmony Course",
      description: es
        ? "El método Shostakovich–Hernández Medrano: análisis armónico profundo, voice leading y escritura coral. 60 lecciones, completamente gratis."
        : "The Shostakovich–Hernández Medrano method: deep harmonic analysis, voice leading and chorale writing. 60 lessons, completely free.",
      delay: "0.1s",
      href: "/curso-armonia",
    },
    {
      icon: "🎧",
      tag: es ? "Entrenamiento Auditivo" : "Ear Training",
      tagColor: "#93c5fd",
      accentHex: "#3b82f6",
      title: es ? `${APPS.length} Apps Educativas` : `${APPS.length} Educational Apps`,
      description: es
        ? "Suite de apps gratuitas para Android: intervalos, acordes, dictado rítmico, escalas y más. Algoritmos adaptativos a tus errores."
        : "Free Android app suite: intervals, chords, rhythmic dictation, scales and more. Algorithms that adapt to your mistakes.",
      delay: "0.25s",
      href: "/apps",
    },
    {
      icon: "🧠",
      tag: es ? "IA + Pedagogía" : "AI + Pedagogy",
      tagColor: "#67e8f9",
      accentHex: "#06b6d4",
      title: es ? "Maestro Virtual" : "Virtual Teacher",
      description: es
        ? "Sube tu ejercicio MIDI. La IA valida tu armonía contra las reglas de cada lección y genera retroalimentación específica por compás."
        : "Upload your MIDI exercise. AI validates your harmony against each lesson's rules and generates specific feedback by measure.",
      delay: "0.4s",
      href: "/curso-armonia",
    },
    {
      icon: "📚",
      tag: es ? "Libro Digital" : "Digital Book",
      tagColor: "#6ee7b7",
      accentHex: "#10b981",
      title: es ? "Los Seres Musicales" : "The Musical Beings",
      description: es
        ? "El método integral de Storm Studios en un solo libro. Partituras, ejemplos históricos y ejercicios graduados para acompañar el curso."
        : "Storm Studios' integral method in one book. Scores, historical examples and graded exercises to accompany the course.",
      delay: "0.55s",
      href: "/el-libro",
    },
  ];

  return (
    <div className="ss-root">
      {/* Ambient orbs */}
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      {/* ═══ HERO ═══ */}
      <section
        style={{
          textAlign: "center",
          padding: "5rem 2rem 8rem",
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
          {es ? "Método Shostakovich · Potenciado por IA" : "Shostakovich Method · Powered by AI"}
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
          {es ? (
            <>Domina la <span className="ss-text-gradient">Armonía</span><br />del Futuro</>
          ) : (
            <>Master the <span className="ss-text-gradient">Harmony</span><br />of the Future</>
          )}
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
          {es
            ? "Donde la tradición de Shostakovich converge con la inteligencia artificial. Aprende análisis armónico profundo, valida tus composiciones con IA y lleva tu oído musical al siguiente nivel."
            : "Where Shostakovich's tradition converges with artificial intelligence. Learn deep harmonic analysis, validate your compositions with AI, and take your musical ear to the next level."}
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
          <Link
            href="/curso-armonia"
            className="ss-mono"
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
              color: "white",
              padding: "1rem 2.2rem",
              borderRadius: "0.875rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {es ? "Explorar el Curso →" : "Explore the Course →"}
          </Link>
          <Link
            href="/apps"
            className="ss-glass ss-mono"
            style={{
              color: "rgba(255,255,255,0.7)",
              padding: "1rem 2.2rem",
              borderRadius: "0.875rem",
              fontSize: "0.85rem",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {es ? "Ver Apps ▶" : "See Apps ▶"}
          </Link>
        </div>

        {/* Wave visualizer */}
        <div className="ss-reveal" style={{ width: "100%", maxWidth: "680px", animationDelay: "0.48s" }}>
          <div
            className="ss-glass"
            style={{
              borderRadius: "1.25rem",
              padding: "1.5rem 2rem",
              boxShadow: "0 0 80px rgba(139,92,246,0.12), inset 0 0 40px rgba(59,130,246,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                {["#ef4444", "#fbbf24", "#22c55e"].map((c) => (
                  <div key={c} style={{ width: "12px", height: "12px", borderRadius: "50%", background: c }} />
                ))}
              </div>
              <span className="ss-mono" style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.08em" }}>
                {es ? "análisis · sonata op. 64 nº 2 — shostakovich" : "analysis · sonata op. 64 nº 2 — shostakovich"}
              </span>
              <div className="ss-blink" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
            </div>
            <WaveVisualizer />
          </div>
        </div>

        {/* Stats */}
        <div
          className="ss-reveal"
          style={{ display: "flex", flexWrap: "wrap", gap: "3rem", justifyContent: "center", marginTop: "5rem", animationDelay: "0.6s" }}
        >
          <StatItem value="60" label={es ? "Lecciones" : "Lessons"} />
          <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
          <StatItem value={`${APPS.length}`} label={es ? "Apps Gratis" : "Free Apps"} />
          <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
          <StatItem value="IA" label={es ? "Evaluación" : "Evaluation"} />
          <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
          <StatItem value="∞" label={es ? "Acceso" : "Access"} />
        </div>
      </section>

      {/* Divider */}
      <div className="ss-divider" style={{ margin: "0 2rem", position: "relative", zIndex: 1 }} />

      {/* ═══ FEATURES ═══ */}
      <section style={{ padding: "6rem 2rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <span
            className="ss-mono"
            style={{
              display: "inline-block",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              background: "rgba(139,92,246,0.15)",
              color: "#c4b5fd",
              border: "1px solid rgba(139,92,246,0.25)",
              padding: "0.35rem 1rem",
              borderRadius: "9999px",
              marginBottom: "1.5rem",
            }}
          >
            {es ? "Lo que incluye" : "What's included"}
          </span>
          <h2
            className="ss-serif ss-reveal"
            style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, marginBottom: "1rem", animationDelay: "0.1s" }}
          >
            {es ? "Todo lo que necesitas" : "Everything you need"}
            <br />
            <span className="ss-text-gradient">{es ? "en un solo lugar" : "in one place"}</span>
          </h2>
          <p
            className="ss-mono ss-reveal"
            style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.8, animationDelay: "0.2s" }}
          >
            {es
              ? "Un ecosistema completo: teoría clásica, práctica auditiva y retroalimentación inteligente."
              : "A complete ecosystem: classical theory, ear training, and intelligent feedback."}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {features.map((f) => (
            <FeatureCard key={f.tag} {...f} />
          ))}
        </div>
      </section>

      {/* ═══ CTA BANNER ═══ */}
      <section style={{ padding: "0 2rem 8rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
        <div
          className="ss-glass"
          style={{ borderRadius: "2rem", padding: "4rem 3rem", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 0 100px rgba(139,92,246,0.14)" }}
        >
          <div style={{ position: "absolute", inset: 0, borderRadius: "2rem", background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 65%)", pointerEvents: "none" }} />
          <h2
            className="ss-serif ss-reveal"
            style={{ fontSize: "clamp(1.8rem,4vw,3rem)", lineHeight: 1.15, marginBottom: "1rem", position: "relative", zIndex: 1, animationDelay: "0.1s" }}
          >
            {es ? "Comienza tu viaje" : "Start your journey"}
            <br />
            <span className="ss-text-gradient">{es ? "armónico hoy" : "in harmony today"}</span>
          </h2>
          <p
            className="ss-mono ss-reveal"
            style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "2rem", position: "relative", zIndex: 1, animationDelay: "0.2s" }}
          >
            {es ? "Acceso gratuito completo. Sin tarjeta de crédito." : "Full free access. No credit card required."}
          </p>
          <Link
            href="/curso-armonia"
            className="ss-mono ss-reveal"
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
              color: "white",
              padding: "1rem 2.5rem",
              borderRadius: "0.875rem",
              fontSize: "0.85rem",
              fontWeight: 500,
              boxShadow: "0 8px 40px rgba(139,92,246,0.4)",
              position: "relative",
              zIndex: 1,
              animationDelay: "0.3s",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            {es ? "Acceder gratis →" : "Access for free →"}
          </Link>
        </div>
      </section>

      {/* Reproductor flotante de música de fondo */}
      <MusicPlayer />

      {/* JSON-LD — Organization + WebSite */}
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": "https://www.stormstudios.com.mx/#organization",
            "name": "Storm Studios Learning",
            "url": "https://www.stormstudios.com.mx",
            "logo": "https://www.stormstudios.com.mx/images/logo-storm.png",
            "sameAs": [
              "https://www.youtube.com/@StormStudiosLearning",
              "https://www.instagram.com/stormstudioslearning"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "contactType": "customer support",
              "availableLanguage": ["Spanish", "English"]
            }
          },
          {
            "@type": "WebSite",
            "@id": "https://www.stormstudios.com.mx/#website",
            "url": "https://www.stormstudios.com.mx",
            "name": "Storm Studios Learning",
            "description": es
              ? "Aprende armonía musical con inteligencia artificial — cursos, apps y maestro virtual"
              : "Learn music harmony with artificial intelligence — courses, apps and virtual teacher",
            "publisher": { "@id": "https://www.stormstudios.com.mx/#organization" },
            "inLanguage": [es ? "es-MX" : "en-US"]
          }
        ]
      }} />
    </div>
  );
}
