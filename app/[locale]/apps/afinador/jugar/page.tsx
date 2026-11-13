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
    urls: getLocalizedRouteUrls("/apps/afinador/jugar"),
    title: locale === "es" ? "Afinador Cromático" : "Chromatic Tuner",
    description:
      locale === "es"
        ? "Afinador cromático con modos para guitarra, bajo, ukulele, violín, viola y cello, lectura en cents y calibración de La4."
        : "Chromatic tuner with guitar, bass, ukulele, violin, viola and cello modes, cents readout and A4 calibration.",
    noIndex: true,
  });
}

export default async function AfinadorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#050912"
      borderColor="rgba(220,240,232,0.14)"
      dividerColor="rgba(220,240,232,0.14)"
      backColor="rgba(220,240,232,0.6)"
      taglineColor="rgba(220,240,232,0.6)"
      backHref={`/${locale}/apps/afinador`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Afinador Cromático" : "Chromatic Tuner"}
      titleColor="#eef7f3"
      badge={{
        label: "Utility App",
        bg: "rgba(52,211,153,0.12)",
        border: "rgba(52,211,153,0.3)",
        color: "#6ee7b7",
      }}
      tagline={es ? "Escucha · Mide · Afina" : "Listen · Measure · Tune"}
    >
      {/* allow="microphone" es OBLIGATORIO: sin él getUserMedia falla dentro del iframe. */}
      <iframe
        src={`/apps/afinador/index.html?lang=${locale}`}
        title={es ? "Afinador Cromático" : "Chromatic Tuner"}
        allow="microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
