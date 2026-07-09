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
    urls: getLocalizedRouteUrls("/intervalos"),
    title: locale === "es" ? "Piano de Intervalos" : "Interval Piano",
    description:
      locale === "es"
        ? "Herramienta interactiva para explorar intervalos musicales en el piano."
        : "Interactive tool for exploring musical intervals on the piano.",
    noIndex: true,
  });
}

export default async function IntervalosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0f172a"
      borderColor="rgba(71,85,105,0.6)"
      dividerColor="#334155"
      backColor="rgba(148,163,184,0.7)"
      taglineColor="rgba(148,163,184,0.4)"
      backHref={`/${locale}/curso-armonia`}
      backLabel={es ? "Curso de Armonía" : "Harmony Course"}
      title={es ? "Piano de Intervalos" : "Interval Piano"}
      titleColor="#f0eeff"
      badge={{
        label: "Web App",
        bg: "rgba(16,185,129,0.15)",
        border: "rgba(16,185,129,0.3)",
        color: "rgba(52,211,153,0.9)",
      }}
      tagline={es ? "Selecciona · Escucha · Aprende" : "Select · Listen · Learn"}
    >
      <iframe
        src={`/apps/intervalos.html?lang=${locale}`}
        title={es ? "Piano de Intervalos" : "Interval Piano"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
