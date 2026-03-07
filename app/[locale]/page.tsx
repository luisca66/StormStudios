import type { Metadata } from "next";


import type { Metadata } from "next";
import { WaveVisualizer } from "@/components/WaveVisualizer";
import { MusicPlayer } from "@/components/MusicPlayer";
import { JsonLd } from "@/components/JsonLd";
import { Link } from "@/i18n/navigation";
import { APPS } from "@/data/apps/apps-catalog";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "es" ? "Storm Studios" : "Storm Studios";
  const description = locale === "es"
    ? "Composición, armonía y tecnología musical para aprender, crear y compartir."
    : "Composition, harmony, and music technology to learn, create, and share.";
  const image = locale === "es" ? "/og/home-es.jpg" : "/og/home-en.jpg";

  return {
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      images: [image],
    },
  };
}

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
        ? "El método Shostakovich-Medrano-Cárdenas: armonía y análisis, cuarteto vocal armónico. 60+ lecciones, completamente gratis."
        : "The Shostakovich-Medrano-Cárdenas method: harmony and analysis, harmonic vocal quartet. 60+ lessons, completely free.",
      delay: "0.1s",
      href: "/curso-armonia",
    },
    {
      icon: "🎧",
      tag: es ? "Entrenamiento Auditivo" : "Ear Training",
      tagColor: "#93c5fd",
      accentHex: "#3b82f6",
      title: es ? "10 Apps Educativas" : "10 Educational Apps",
      description: es
        ? "Suite de apps gratuitas dentro del website y para Android: matemáticas mentales, memoria y entrenamiento auditivo total."
        : "Free app suite on the website and for Android: mental math, memory and total ear training.",
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
        ? "Escribe tu tarea como midi file en nuestro secuenciador y el Maestro Virtual te guiará hacia la perfección."
        : "Write your assignment as a midi file in our sequencer and the Virtual Teacher will guide you toward perfection.",
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
        ? "El libro que comparte los principios sobre los cuales está desarrollado este método de enseñanza."
        : "The book that shares the principles upon which this teaching method is developed.",
      delay: "0.55s",
      href: "/el-libro",
    },
  ];

  return (
    <div className="ss-root">
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      <HomeHero />

      <div
        className="ss-divider"
        style={{ margin: "0 2rem", position: "relative", zIndex: 1 }}
      />

      <HomeFeatures />

      <HomeCTA />

      <MusicPlayer />
      <HomeStructuredData />
    </div>
  );
}
