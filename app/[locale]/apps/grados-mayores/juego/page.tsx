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
    urls: getLocalizedRouteUrls("/apps/grados-mayores/juego"),
    title:
      locale === "es"
        ? "Expreso Tonal — Modo juego de Grados Escala Mayor"
        : "Tonal Express — Major Scale Degrees game mode",
    description:
      locale === "es"
        ? "Conduce una locomotora de vapor hasta la Estación Terminal: cada bifurcación de la vía es un grado de la escala mayor que debes reconocer de oído."
        : "Drive a steam locomotive to the Terminal Station: every fork in the track is a major-scale degree you must recognize by ear.",
    noIndex: true,
  });
}

export default async function GradosMayoresJuegoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#1a1410"
      backHref={`/${locale}/apps/grados-mayores`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Expreso Tonal" : "Tonal Express"}
      badge={{
        label: es ? "Modo juego 3D" : "3D game mode",
        bg: "rgba(201,162,39,0.14)",
        border: "rgba(201,162,39,0.35)",
        color: "#c9a227",
      }}
      tagline={es ? "Escucha · Decide · Llega" : "Listen · Decide · Arrive"}
      taglineHiddenOnMobile
    >
      <iframe
        src={`/apps/grados-mayores-juego/index.html?lang=${locale}`}
        title={es ? "Expreso Tonal" : "Tonal Express"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
