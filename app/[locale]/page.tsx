import type { Metadata } from "next";
import { MusicPlayer } from "@/components/MusicPlayer";
import { HomeCTA } from "@/components/home/HomeCTA";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeStructuredData } from "@/components/home/HomeStructuredData";
import { type Locale } from "@/i18n/routing";
import { getMainPageAlternates } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;

  return {
    alternates: getMainPageAlternates("/", locale as Locale),
  };
}

export default function HomePage() {
  return (
    <div className="ss-root">
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      <HomeHero />

      <div className="ss-divider" style={{ margin: "0 2rem", position: "relative", zIndex: 1 }} />

      <HomeFeatures />

      <HomeCTA />

      <MusicPlayer />
      <HomeStructuredData />
    </div>
  );
}
