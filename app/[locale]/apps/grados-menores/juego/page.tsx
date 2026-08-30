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
    urls: getLocalizedRouteUrls("/apps/grados-menores/juego"),
    title:
      locale === "es"
        ? "El Cometa — Modo juego de Grados Escala Menor"
        : "The Comet — Minor Scale Degrees game mode",
    description:
      locale === "es"
        ? "Pilota un cometa de vuelta a su estrella natal: cada anillo de navegación es un grado de la escala menor que debes reconocer de oído."
        : "Pilot a comet back to its home star: every navigation ring is a minor-scale degree you must recognize by ear.",
    noIndex: true,
  });
}

export default async function GradosMenoresJuegoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#0e1428"
      backHref={`/${locale}/apps/grados-menores`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "El Cometa" : "The Comet"}
      badge={{
        label: es ? "Modo juego 3D" : "3D game mode",
        bg: "rgba(159,216,232,0.14)",
        border: "rgba(159,216,232,0.35)",
        color: "#9fd8e8",
      }}
      tagline={es ? "Escucha · Decide · Vuelve" : "Listen · Decide · Return"}
      taglineHiddenOnMobile
    >
      <iframe
        src={`/apps/grados-menores-juego/index.html?lang=${locale}`}
        title={es ? "El Cometa" : "The Comet"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
