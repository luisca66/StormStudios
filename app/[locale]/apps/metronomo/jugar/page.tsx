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
    urls: getLocalizedRouteUrls("/apps/metronomo/jugar"),
    title: locale === "es" ? "Metrónomo Pro" : "Metronome Pro",
    description:
      locale === "es"
        ? "Metrónomo preciso con acentos, subdivisiones, polirritmos y tres temas visuales."
        : "Precise metronome with accents, subdivisions, polyrhythms and three visual themes.",
    noIndex: true,
  });
}

export default async function MetronomoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#05050b"
      borderColor="rgba(232,230,255,0.12)"
      dividerColor="rgba(232,230,255,0.2)"
      backColor="rgba(232,230,255,0.65)"
      taglineColor="rgba(232,230,255,0.4)"
      backHref={`/${locale}/apps/metronomo`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Metrónomo Pro" : "Metronome Pro"}
      titleColor="#f0eeff"
      badge={{
        label: "Utility App",
        bg: "rgba(139,92,246,0.14)",
        border: "rgba(139,92,246,0.32)",
        color: "#c4b5fd",
      }}
      tagline={es ? "Pulso · Acento · Polirritmo" : "Pulse · Accent · Polyrhythm"}
    >
      <iframe
        src={`/apps/metronomo/index.html?lang=${locale}`}
        title={es ? "Metrónomo Pro" : "Metronome Pro"}
        allow="autoplay; fullscreen"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
