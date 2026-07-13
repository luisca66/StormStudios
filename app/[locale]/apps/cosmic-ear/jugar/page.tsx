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
    urls: getLocalizedRouteUrls("/apps/cosmic-ear/jugar"),
    title: locale === "es" ? "Cosmic Ear — Modo juego de Desglose" : "Cosmic Ear — Unlocking game mode",
    description:
      locale === "es"
        ? "Pilotea una nave 3D por el cosmos y resuelve planetas cantando las notas de cada acorde."
        : "Pilot a 3D ship through the cosmos and clear planets by singing the notes of each chord.",
    noIndex: true,
  });
}

export default async function CosmicEarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#05070d"
      backHref={`/${locale}/apps/desglose-auditivo`}
      backLabel={es ? "Volver a Desglose" : "Back to Unlocking"}
      title="Cosmic Ear"
      badge={{
        label: es ? "Modo juego" : "Game mode",
        bg: "rgba(139,92,246,0.14)",
        border: "rgba(139,92,246,0.35)",
        color: "#c4b5fd",
      }}
      tagline={es ? "Pilotea · Escucha · Canta" : "Pilot · Listen · Sing"}
    >
      <iframe
        src={`/apps/cosmic-ear/index.html?lang=${locale}`}
        title="Cosmic Ear"
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
