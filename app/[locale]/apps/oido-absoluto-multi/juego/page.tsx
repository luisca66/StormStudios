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
    urls: getLocalizedRouteUrls("/apps/oido-absoluto-multi/juego"),
    title: locale === "es" ? "Walking AP Multi — Modo juego de Oído Absoluto" : "Walking AP Multi — Perfect Pitch game mode",
    description:
      locale === "es"
        ? "Explora un mundo 3D y reconoce notas absolutas con piano, cello, corno, coro y fagot mientras avanzas por niveles."
        : "Explore a 3D world and recognize absolute notes with piano, cello, horn, choir, and bassoon as you advance through levels.",
    noIndex: true,
  });
}

export default async function WalkingApMultiPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#07101a"
      backHref={`/${locale}/apps/oido-absoluto-multi`}
      backLabel={es ? "Volver" : "Back"}
      title="Walking AP Multi"
      badge={{
        label: es ? "Modo juego 3D" : "3D game mode",
        bg: "rgba(139,92,246,0.14)",
        border: "rgba(139,92,246,0.35)",
        color: "#c4b5fd",
      }}
      tagline={es ? "Explora · Escucha · Reconoce" : "Explore · Listen · Recognize"}
      taglineHiddenOnMobile
    >
      <iframe
        src={`/apps/oido-absoluto-multi/index.html?lang=${locale}`}
        title="Walking AP Multi"
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
