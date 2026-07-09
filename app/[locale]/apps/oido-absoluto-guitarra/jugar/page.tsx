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
    urls: getLocalizedRouteUrls("/apps/oido-absoluto-guitarra/jugar"),
    title: locale === "es" ? "Oido Absoluto Guitarra Clasica" : "Perfect Pitch Classical Guitar",
    description:
      locale === "es"
        ? "Entrena reconocimiento de notas absolutas con samples reales de guitarra clasica por cuerda, modos de juego y estadisticas locales."
        : "Train absolute-note recognition with real classical-guitar samples by string, game modes, and local statistics.",
    noIndex: true,
  });
}

export default async function OidoAbsolutoGuitarraPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#14110f"
      borderColor="rgba(242,232,221,0.14)"
      dividerColor="rgba(242,232,221,0.22)"
      backColor="rgba(242,232,221,0.65)"
      taglineColor="rgba(242,232,221,0.4)"
      backHref={`/${locale}/apps/oido-absoluto-guitarra`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Oido Absoluto Guitarra Clasica" : "Perfect Pitch Classical Guitar"}
      titleColor="#f2e8dd"
      badge={{
        label: "Web App",
        bg: "rgba(198,124,78,0.14)",
        border: "rgba(198,124,78,0.32)",
        color: "#dfa16e",
      }}
      tagline={es ? "Escucha · Reconoce · Responde" : "Listen · Recognize · Answer"}
    >
      <iframe
        src={`/apps/ap-guitar/index.html?lang=${locale}`}
        title={es ? "Oido Absoluto Guitarra Clasica" : "Perfect Pitch Classical Guitar"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
