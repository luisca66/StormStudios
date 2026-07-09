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
    urls: getLocalizedRouteUrls("/apps/acordes-cantar/jugar"),
    title: locale === "es" ? "Cantar Acordes" : "Sing Chords",
    description:
      locale === "es"
        ? "Entrena la afinación cantando las notas de acordes de dificultad progresiva."
        : "Train your pitch by singing the notes of progressively challenging chords.",
    noIndex: true,
  });
}

export default async function AcordesCantarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#10100f"
      backHref={`/${locale}/apps/acordes-cantar`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Cantar Acordes" : "Sing Chords"}
      badge={{
        label: "Web App",
        bg: "rgba(218,165,32,0.12)",
        border: "rgba(218,165,32,0.3)",
        color: "#d8b766",
      }}
      tagline={es ? "Escucha · Canta · Afina" : "Listen · Sing · Tune"}
    >
      <iframe
        src={`/apps/acordes-cantar/index.html?lang=${locale}`}
        title={es ? "Cantar Acordes" : "Sing Chords"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
