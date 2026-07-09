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
    urls: getLocalizedRouteUrls("/apps/intervalos-reconocimiento/juego"),
    title: locale === "es" ? "Synth-Kong - Videojuego" : "Synth-Kong - Video Game",
    description:
      locale === "es"
        ? "Avanza por sectores en un videojuego retro mientras reconoces intervalos auditivos."
        : "Advance through sectors in a retro video game while recognizing musical intervals by ear.",
    noIndex: true,
  });
}

export default async function IntervalosReconocimientoJuegoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#050510"
      backHref={`/${locale}/apps/intervalos-reconocimiento`}
      backLabel={es ? "Volver a Intervalos" : "Back to Intervals"}
      title="Synth-Kong"
      badge={{
        label: es ? "Videojuego" : "Video game",
        bg: "rgba(0,229,255,0.12)",
        border: "rgba(0,229,255,0.3)",
        color: "#67e8f9",
      }}
      tagline={es ? "Escucha · Reconoce · Dispara" : "Listen · Recognize · Fire"}
    >
      <iframe
        src={`/apps/intervalos-reconocimiento-juego/index.html?lang=${es ? "es" : "en"}`}
        title="Synth-Kong"
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
