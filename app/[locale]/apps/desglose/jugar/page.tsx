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
    urls: getLocalizedRouteUrls("/apps/desglose/jugar"),
    title: locale === "es" ? "Desglose" : "Unlocking",
    description:
      locale === "es"
        ? "Aísla y canta cada nota dentro de un acorde; la app evalúa tu afinación con el micrófono."
        : "Isolate and sing each note inside a chord; the app evaluates your pitch with the microphone.",
    noIndex: true,
  });
}

export default async function DesglosePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <GameShell
      locale={locale}
      background="#10100f"
      backHref={`/${locale}/apps/desglose-auditivo`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Desglose" : "Unlocking"}
      badge={{
        label: "Web App",
        bg: "rgba(218,165,32,0.12)",
        border: "rgba(218,165,32,0.3)",
        color: "#d8b766",
      }}
      tagline={es ? "Escucha · Aísla · Canta" : "Listen · Isolate · Sing"}
    >
      <iframe
        src={`/apps/desglose/index.html?lang=${locale}`}
        title={es ? "Desglose" : "Unlocking"}
        allow="autoplay; microphone"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
  );
}
