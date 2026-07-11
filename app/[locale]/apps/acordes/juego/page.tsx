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
    urls: getLocalizedRouteUrls("/apps/acordes/juego"),
    title:
      locale === "es"
        ? "Batisfera — Modo juego de Reconocimiento de Acordes"
        : "Bathysphere — Chord Recognition game mode",
    description:
      locale === "es"
        ? "Desciende por cinco zonas oceánicas y captura criaturas reconociendo acordes, desde tríadas hasta trecenas."
        : "Descend through five ocean zones and capture creatures by recognizing chords, from triads to thirteenths.",
    noIndex: true,
  });
}

export default async function AcordesJuegoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#01060d"
      backHref={`/${locale}/apps/acordes`}
      backLabel={es ? "Volver" : "Back"}
      title="Batisfera"
      badge={{
        label: es ? "Modo juego 3D" : "3D game mode",
        bg: "rgba(56,189,248,0.14)",
        border: "rgba(56,189,248,0.35)",
        color: "#7dd3fc",
      }}
      tagline={es ? "Desciende · Escucha · Cataloga" : "Descend · Listen · Catalogue"}
      taglineHiddenOnMobile
    >
      <iframe
        src={`/apps/acordes-juego/index.html?lang=${locale}`}
        title="Batisfera"
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
