import { MusicPlayer } from "@/components/MusicPlayer";
import { HomeCTA } from "@/components/home/HomeCTA";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeGrowthSection } from "@/components/home/HomeGrowthSection";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeResourcesSection } from "@/components/home/HomeResourcesSection";
import { HomeStructuredData } from "@/components/home/HomeStructuredData";
import type { Metadata } from "next";
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
    title:
      locale === "es"
        ? "Curso de Armonía Tradicional, Entrenamiento Auditivo y Teoría Musical"
        : "Traditional Harmony Course, Ear Training and Music Theory",
    description:
      locale === "es"
        ? "Storm Studios Learning ofrece curso de armonía tradicional, entrenamiento auditivo, teoría musical, lecciones gratis y apps educativas con el linaje Shostakovich-Medrano-Cárdenas."
        : "Storm Studios Learning offers a traditional harmony course, ear training, music theory, free harmony lessons and music education apps rooted in the Shostakovich-Medrano-Cardenas lineage.",
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

export default function HomePage() {
  return (
    <div className="ss-root">
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      <HomeHero />

      <HomeGrowthSection />

      <div
        className="ss-divider"
        style={{ margin: "0 2rem", position: "relative", zIndex: 1 }}
      />

      <HomeFeatures />

      <HomeResourcesSection />

      <HomeCTA />

      <MusicPlayer />
      <HomeStructuredData />
    </div>
  );
}
