import { StudyPaths } from "@/components/home/StudyPaths";
import { MusicPlayer } from "@/components/MusicPlayer";
import { HomeCTA } from "@/components/home/HomeCTA";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeGrowthSection } from "@/components/home/HomeGrowthSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeResourcesSection } from "@/components/home/HomeResourcesSection";
import { HomeStructuredData } from "@/components/home/HomeStructuredData";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;

  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/"),
    xDefault: "/es",
    title: {
      absolute:
        locale === "es"
          ? "Storm Studios Learning · Curso de armonía y oído"
          : "Storm Studios Learning · Harmony and ear training",
    },
    description:
      locale === "es"
        ? "Curso gratis de armonía tradicional, entrenamiento auditivo y apps musicales, en el linaje Shostakovich-Medrano-Cárdenas."
        : "Free traditional harmony course, ear training and music apps rooted in the Shostakovich-Medrano-Cárdenas lineage.",
    keywords:
      locale === "es"
        ? [
            "curso de armonía",
            "curso de armonía tradicional",
            "entrenamiento auditivo",
            "teoría musical",
            "curso de armonía gratis",
            "apps de entrenamiento auditivo",
          ]
        : [
            "traditional harmony course",
            "ear training",
            "music theory course",
            "free harmony lessons",
            "music education apps",
            "harmony lessons",
          ],
    image: locale === "es" ? "/og/home-es.jpg" : "/og/home-en.jpg",
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="ss-root">
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      <HomeHero />
      <StudyPaths />



      <div
        className="ss-divider"
        style={{ margin: "0 2rem", position: "relative", zIndex: 1 }}
      />

      <HomeFeatures />

      <HomeResourcesSection />

      <HomeCTA />

      <HomeGrowthSection />

      <MusicPlayer />
      <HomeStructuredData />
    </div>
  );
}
