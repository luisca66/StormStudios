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
    urls: getLocalizedRouteUrls("/apps/intervalos-cantados/juego"),
    title: locale === "es" ? "Intervalos Cantados - Videojuego" : "Singing Intervals - Video Game",
    description:
      locale === "es"
        ? "Entrena tu oído musical y afinación vocal con este divertido videojuego arcade. Canta intervalos musicales y destruye notas enemigas."
        : "Train your musical ear and vocal tuning with this fun arcade game. Sing musical intervals and destroy enemy notes.",
    noIndex: true,
  });
}

export default async function IntervalosCantadosJuegoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#050510"
      backHref={`/${locale}/apps/intervalos-cantados`}
      backLabel={es ? "Volver a Intervalos Cantados" : "Back to Singing Intervals"}
      title="Intervalos Cantados"
      badge={{
        label: es ? "Videojuego" : "Video game",
        bg: "rgba(0,229,255,0.12)",
        border: "rgba(0,229,255,0.3)",
        color: "#67e8f9",
      }}
      tagline={es ? "Escucha · Canta · Defiende" : "Listen · Sing · Defend"}
    >
      <iframe
        src={`/apps/intervalos-cantados-juego/index.html?lang=${es ? "es" : "en"}`}
        title="Intervalos Cantados - Videojuego"
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
