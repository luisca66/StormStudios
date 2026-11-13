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
    urls: getLocalizedRouteUrls("/apps/diapason/jugar"),
    title: locale === "es" ? "Diapasón" : "Fretboard",
    description:
      locale === "es"
        ? "Aprende las notas del mástil de la guitarra con muestras reales, en vista plana o vista desde el guitarrista."
        : "Learn the notes on the guitar fretboard with real samples, in a flat view or from the guitarist's point of view.",
    noIndex: true,
  });
}

export default async function DiapasonPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0e0905"
      borderColor="rgba(232,200,140,0.16)"
      dividerColor="rgba(232,200,140,0.16)"
      backColor="rgba(232,200,140,0.6)"
      taglineColor="rgba(232,200,140,0.6)"
      backHref={`/${locale}/apps/diapason`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Diapasón" : "Fretboard"}
      titleColor="#f3e3c2"
      badge={{
        label: "Utility App",
        bg: "rgba(212,168,72,0.14)",
        border: "rgba(212,168,72,0.32)",
        color: "#e2b860",
      }}
      tagline={es ? "Cuerda · Traste · Nota" : "String · Fret · Note"}
    >
      <iframe
        src={`/apps/diapason/index.html?lang=${locale}`}
        title={es ? "Diapasón" : "Fretboard"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
