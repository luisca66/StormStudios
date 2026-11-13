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
    urls: getLocalizedRouteUrls("/apps/etimologica/jugar"),
    title: locale === "es" ? "Etimológica" : "Etimológica",
    description:
      locale === "es"
        ? "Gimnasia cerebral para amantes de las palabras: descubre el significado y el origen de 200 palabras del español."
        : "Brain training for word lovers: discover the meaning and origin of 200 Spanish words.",
    noIndex: true,
  });
}

export default async function EtimologicaPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#2c3e6b"
      borderColor="rgba(250,248,245,0.18)"
      dividerColor="rgba(250,248,245,0.18)"
      backColor="rgba(250,248,245,0.7)"
      taglineColor="rgba(250,248,245,0.7)"
      backHref={`/${locale}/apps/etimologica`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Etimológica" : "Etimológica"}
      titleColor="#faf8f5"
      badge={{
        label: "Utility App",
        bg: "rgba(184,134,11,0.18)",
        border: "rgba(184,134,11,0.4)",
        color: "#e8c26a",
      }}
      tagline={es ? "Raíz · Historia · Palabra" : "Root · History · Word"}
    >
      <iframe
        src={`/apps/etimologica/index.html?lang=${locale}`}
        title={es ? "Etimológica" : "Etimológica"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
