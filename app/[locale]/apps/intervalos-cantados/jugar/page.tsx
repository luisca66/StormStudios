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
    urls: getLocalizedRouteUrls("/apps/intervalos-cantados/jugar"),
    title: locale === "es" ? "Intervalos Cantados" : "Sung Intervals",
    description:
      locale === "es"
        ? "Entrena la producción vocal de intervalos: escucha la nota inicial, nombra la llegada y cántala con precisión."
        : "Train sung interval production: hear the starting note, name the target, and sing it accurately.",
    noIndex: true,
  });
}

export default async function IntervalosCantadosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#050711"
      backHref={`/${locale}/apps/intervalos-cantados`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Intervalos Cantados" : "Sung Intervals"}
      titleColor="#eaf4ff"
      badge={{
        label: "Web App",
        bg: "rgba(103,214,255,0.12)",
        border: "rgba(103,214,255,0.3)",
        color: "#67d6ff",
      }}
      tagline={es ? "Escucha · Nombra · Canta" : "Listen · Name · Sing"}
    >
      <iframe
        src={`/apps/intervalos-cantados/index.html?lang=${locale}`}
        title={es ? "Intervalos Cantados" : "Sung Intervals"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
