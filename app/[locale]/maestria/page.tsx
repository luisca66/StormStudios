import { getMasteryPieces } from "@/lib/mdx";
import { MasteryCard } from "@/components/mastery/MasteryCard";
import { type Locale } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

interface MasteryPageProps {
  params: Promise<{ locale: string }>;
}

export default async function MasteryPage({ params }: MasteryPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  const pieces = await getMasteryPieces(locale);

  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      {/* Orbs */}
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />
      <div className="ss-orb ss-orb-c" aria-hidden />

      <div
        className="relative z-10"
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "120px 24px 80px" }}
      >
        {/* Header */}
        <div className="mb-16 ss-reveal">
          <span
            className="ss-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-6"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "var(--ss-violet-text)",
            }}
          >
            {es ? "• Maestría" : "• Mastery"}
          </span>

          <h1
            className="ss-serif"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              lineHeight: 1.05,
              color: "#f0eeff",
              marginBottom: "1rem",
            }}
          >
            {es ? (
              <>
                Sabiduría para <span className="ss-text-gradient">músicos y atletas</span>
              </>
            ) : (
              <>
                Wisdom for <span className="ss-text-gradient">musicians and athletes</span>
              </>
            )}
          </h1>

          <p
            className="ss-mono"
            style={{
              fontSize: "1.05rem",
              color: "var(--ss-muted)",
              maxWidth: "620px",
              lineHeight: 1.7,
            }}
          >
            {es
              ? "Videos y artículos sobre cómo funcionan el cuerpo y la mente, y cómo entrenarlos con inteligencia, en el instrumento y en el gimnasio."
              : "Videos and articles on how body and mind work, and how to train them intelligently, at the instrument and in the gym."}
          </p>
        </div>

        <div className="ss-divider mb-14" />

        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
        >
          {pieces.map((piece) => (
            <MasteryCard key={piece.slug} piece={piece} locale={locale} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function generateMetadata({ params }: MasteryPageProps) {
  return params.then(({ locale }) =>
    createPageMetadata({
      locale: locale as Locale,
      urls: getLocalizedRouteUrls("/maestria"),
      title: locale === "es" ? "Maestría: sabiduría para músicos y atletas" : "Mastery: wisdom for musicians and athletes",
      description:
        locale === "es"
          ? "Videos y artículos sobre cómo funcionan el cuerpo y la mente, y cómo entrenarlos con inteligencia, en el instrumento y en el gimnasio."
          : "Videos and articles on how body and mind work, and how to train them intelligently, at the instrument and in the gym.",
      keywords:
        locale === "es"
          ? ["práctica deliberada", "fuerza y música", "aprendizaje motor", "entrenamiento para músicos"]
          : ["deliberate practice", "strength and music", "motor learning", "training for musicians"],
    })
  );
}
