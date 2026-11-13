import StoreInvitation from "@/components/StoreInvitation";
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
    urls: getLocalizedRouteUrls("/apps/oido-absoluto-multi/jugar"),
    title: locale === "es" ? "Oido Absoluto Multi-timbrico" : "Perfect Pitch Multi-timbral",
    description:
      locale === "es"
        ? "El método AP Super en la web: 147 niveles de oído absoluto con seis timbres y estadísticas."
        : "The AP Super method on the web: 147 perfect-pitch levels with six timbres and statistics.",
    noIndex: true,
  });
}

export default async function OidoAbsolutoMultiPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const es = locale === "es";

  return (
    <>
    <GameShell
      locale={locale}
      background="#10110f"
      borderColor="rgba(246,241,229,0.14)"
      dividerColor="rgba(246,241,229,0.22)"
      backColor="rgba(246,241,229,0.65)"
      taglineColor="rgba(246,241,229,0.4)"
      backHref={`/${locale}/apps/oido-absoluto-multi`}
      backLabel={es ? "Volver" : "Back"}
      title={es ? "Oido Absoluto Multi-timbrico" : "Perfect Pitch Multi-timbral"}
      titleColor="#f6f1e5"
      badge={{
        label: "Web App",
        bg: "rgba(64,206,197,0.14)",
        border: "rgba(64,206,197,0.34)",
        color: "#62efe6",
      }}
      tagline={es ? "Escucha · Reconoce · Responde" : "Listen · Recognize · Answer"}
    >
      <iframe
        src={`/apps/ap-multi/index.html?lang=${locale}`}
        title={es ? "Oido Absoluto Multi-timbrico" : "Perfect Pitch Multi-timbral"}
        allow="autoplay"
        style={{ flex: 1, width: "100%", border: "none", display: "block" }}
      />
    </GameShell>
    <StoreInvitation locale={locale} />
    </>
  );
}
