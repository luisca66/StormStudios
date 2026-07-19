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
    urls: getLocalizedRouteUrls("/apps/acordes-cantar/juego"),
    title:
      locale === "es"
        ? "Aerostato — Modo juego de Cantar Acordes"
        : "Aerostat — Sing Chords game mode",
    description:
      locale === "es"
        ? "Pilota un globo aerostático y asciende al borde del espacio encendiendo linternas con tu voz: canta cada nota de los acordes con afinador en tiempo real."
        : "Pilot a hot-air balloon and ascend to the edge of space lighting lanterns with your voice: sing every chord note with a real-time tuner.",
    noIndex: true,
  });
}

export default async function AerostatoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0a1428"
      backHref={`/${locale}/apps/acordes-cantar`}
      backLabel={es ? "Volver" : "Back"}
      backAsksGame
      title={es ? "Aerostato" : "Aerostat"}
      badge={{
        label: es ? "Modo juego 3D" : "3D game mode",
        bg: "rgba(255,210,127,0.14)",
        border: "rgba(255,210,127,0.35)",
        color: "#ffd27f",
      }}
      tagline={es ? "Asciende · Canta · Ilumina" : "Ascend · Sing · Illuminate"}
      taglineHiddenOnMobile
    >
      {/* allow="microphone" es OBLIGATORIO: sin él getUserMedia falla dentro del
          iframe aunque el usuario dé permiso (PLAN Aerostato §16). */}
      <iframe
        src={`/apps/acordes-cantar-juego/index.html?lang=${locale}`}
        title={es ? "Aerostato" : "Aerostat"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
