import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import type { Locale } from "@/i18n/routing";
import ElefantitoApp from "@/components/apps/elefantito-nextjs/ElefantitoApp";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-press-start-2p",
  subsets: ["latin"],
  display: "swap",
});

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/apps/matematicas-mentales/jugar"),
    title: locale === "es" ? "Elefantito Matemático – Jugar" : "Math Elephant – Play",
    description:
      locale === "es"
        ? "Versión jugable de Elefantito Matemático dentro del navegador."
        : "Browser play version of Math Elephant.",
    noIndex: true,
  });
}

export default async function JugarPage({ params }: Props) {
  const { locale } = await params;

  return (
    <div className={`min-h-screen bg-[#08090f] text-zinc-100 ${pressStart2P.variable}`}>
      <ElefantitoApp initialLocale={locale} />
    </div>
  );
}
