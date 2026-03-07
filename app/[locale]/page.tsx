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
  const title = locale === "es" ? "Storm Studios" : "Storm Studios";
  const description = locale === "es"
    ? "Composición, armonía y tecnología musical para aprender, crear y compartir."
    : "Composition, harmony, and music technology to learn, create, and share.";
  const image = locale === "es" ? "/og/home-es.jpg" : "/og/home-en.jpg";

  return {
    alternates: getMainPageAlternates("/", locale as Locale),
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      title,
      description,
      images: [image],
    },
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
