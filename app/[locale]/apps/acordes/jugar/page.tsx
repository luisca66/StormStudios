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
    urls: getLocalizedRouteUrls("/apps/acordes/jugar"),
    title: locale === "es" ? "Reconocimiento de Acordes" : "Chord Recognition",
    description:
      locale === "es"
        ? "Entrena la identificación auditiva de acordes con timbres, rangos, modos de juego y estadísticas locales."
        : "Train chord recognition with timbres, ranges, game modes, and local statistics.",
    noIndex: true,
  });
}

export default async function AcordesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0c0c14"
      backHref={`/${locale}/apps/acordes`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Reconocimiento de Acordes" : "Chord Recognition"}
      titleColor="#ede8df"
      badge={{
        label: "Web App",
        bg: "rgba(201,168,108,0.12)",
        border: "rgba(201,168,108,0.3)",
        color: "#d8b766",
      }}
      tagline={es ? "Escucha · Reconoce · Responde" : "Listen · Recognize · Answer"}
    >
      <iframe
        src={`/apps/acordes/index.html?lang=${locale}`}
        title={es ? "Reconocimiento de Acordes" : "Chord Recognition"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
