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
    urls: getLocalizedRouteUrls("/apps/mutacion/jugar"),
    title: locale === "es" ? "Mutación" : "Mutation",
    description:
      locale === "es"
        ? "Entrena tu memoria visual: memoriza la cuadrícula y encuentra las figuras que cambiaron. 48 niveles."
        : "Train your visual memory: memorize the grid and find the shapes that changed. 48 levels.",
    noIndex: true,
  });
}

export default async function MutacionPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#121212"
      borderColor="rgba(255,255,255,0.12)"
      dividerColor="rgba(255,255,255,0.12)"
      backColor="rgba(255,255,255,0.6)"
      taglineColor="rgba(255,255,255,0.6)"
      backHref={`/${locale}/apps/mutacion`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Mutación" : "Mutation"}
      titleColor="#f5f5f5"
      badge={{
        label: "Utility App",
        bg: "rgba(0,230,118,0.12)",
        border: "rgba(0,230,118,0.32)",
        color: "#69f0ae",
      }}
      tagline={es ? "Memoriza · Observa · Encuentra" : "Memorize · Observe · Find"}
    >
      <iframe
        src={`/apps/mutacion/index.html?lang=${locale}`}
        title={es ? "Mutación" : "Mutation"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
