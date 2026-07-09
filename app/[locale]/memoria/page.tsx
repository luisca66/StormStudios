import type { Metadata } from "next";
import type { Locale } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import MemoriaApp from "@/components/apps/memoria/MemoriaApp";
import GameShell from "@/components/apps/GameShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/memoria"),
    title: locale === "es" ? "App Memoria – Nemotecnia" : "Memory App – Mnemonics",
    description:
      locale === "es"
        ? "Herramienta interactiva de memoria y nemotecnia para practica musical y cognitiva."
        : "Interactive memory and mnemonic tool for musical and cognitive practice.",
    noIndex: true,
  });
}

export default async function MemoriaPage({ params }: Props) {
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
      backHref={`/${locale}/apps`}
      backLabel="Apps"
      title={es ? "App Memoria – Nemotecnia" : "Memory App – Mnemonics"}
      titleColor="#f0eeff"
      badge={{
        label: "Web App",
        bg: "rgba(16,185,129,0.15)",
        border: "rgba(16,185,129,0.3)",
        color: "rgba(52,211,153,0.9)",
      }}
      tagline={es ? "Memoriza · Practica · Domina" : "Memorize · Practice · Master"}
    >
      {/* App Nativa React */}
      <div style={{ flex: 1, width: "100%", overflowY: "auto" }}>
        <MemoriaApp locale={locale} />
      </div>
    </GameShell>
  );
}
