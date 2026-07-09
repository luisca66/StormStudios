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
    urls: getLocalizedRouteUrls("/apps/grados-menores/jugar"),
    title: locale === "es" ? "Grados Escala Menor" : "Minor Scale Degrees",
    description:
      locale === "es"
        ? "Reconoce la función tonal de grados diatónicos y cromáticos en tonalidades menores, con timbres, modos de juego y estadísticas locales."
        : "Recognize the tonal function of diatonic and chromatic degrees in minor keys, with timbres, game modes, and local statistics.",
    noIndex: true,
  });
}

export default async function GradosMenoresPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0c0c14"
      backHref={`/${locale}/apps/grados-menores`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Grados Escala Menor" : "Minor Scale Degrees"}
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
        src={`/apps/grados-menores/index.html?lang=${locale}`}
        title={es ? "Grados Escala Menor" : "Minor Scale Degrees"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
