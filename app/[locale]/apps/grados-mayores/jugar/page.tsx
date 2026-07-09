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
    urls: getLocalizedRouteUrls("/apps/grados-mayores/jugar"),
    title: locale === "es" ? "Grados Escala Mayor" : "Major Scale Degrees",
    description:
      locale === "es"
        ? "Reconoce la función tonal (grados diatónicos y cromáticos) de cada nota en las tonalidades mayores, con timbres, modos de juego y estadísticas locales."
        : "Recognize the tonal function (diatonic and chromatic degrees) of each note in major keys, with timbres, game modes, and local statistics.",
    noIndex: true,
  });
}

export default async function GradosMayoresPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0c0c14"
      backHref={`/${locale}/apps/grados-mayores`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Grados Escala Mayor" : "Major Scale Degrees"}
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
        src={`/apps/grados-mayores/index.html?lang=${locale}`}
        title={es ? "Grados Escala Mayor" : "Major Scale Degrees"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
