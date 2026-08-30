import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import GameShell from "@/components/apps/GameShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/oido-absoluto-guitarra/juego"),
    title:
      locale === "es"
        ? "Resonancia — Juego de Oído Absoluto para Guitarra"
        : "Resonance — Classical Guitar Perfect Pitch Game",
    description:
      locale === "es"
        ? "Recorre un diapasón 3D, escucha muestras reales de guitarra clásica y abre la roseta reconociendo veinte notas consecutivas."
        : "Explore a 3D fretboard, hear real classical-guitar samples, and unlock the rosette by recognizing twenty consecutive notes.",
    noIndex: true,
  });
}

export default async function ResonanciaGuitarraPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#080e10"
      borderColor="rgba(232,216,181,0.18)"
      dividerColor="rgba(216,166,75,0.28)"
      backColor="rgba(240,229,208,0.7)"
      taglineColor="rgba(116,199,201,0.65)"
      backHref={`/${locale}/apps/oido-absoluto-guitarra`}
      backLabel={es ? "Volver" : "Back"}
      title="Resonancia"
      titleColor="#f0e5d0"
      badge={{
        label: es ? "Modo juego 3D" : "3D game mode",
        bg: "rgba(216,166,75,0.12)",
        border: "rgba(216,166,75,0.34)",
        color: "#e5ba62",
      }}
      tagline={es ? "Explora · Escucha · Reconoce" : "Explore · Listen · Recognize"}
      taglineHiddenOnMobile
    >
      <iframe
        src={`/apps/oido-absoluto-guitarra-juego/index.html?lang=${locale}`}
        title={es ? "Resonancia — Oído Absoluto Guitarra" : "Resonance — Classical Guitar Perfect Pitch"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
