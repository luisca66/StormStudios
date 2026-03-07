import { MusicPlayer } from "@/components/MusicPlayer";
import { HomeCTA } from "@/components/home/HomeCTA";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeStructuredData } from "@/components/home/HomeStructuredData";
import type { Metadata } from "next";

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> }
): Promise<Metadata> {
  const { locale } = await params;
  const es = locale === "es";

  const title = "Storm Studios Learning";
  const description = es
    ? "Aprende armonía tradicional, desarrolla tu oído musical y explora herramientas de entrenamiento auditivo con Storm Studios Learning."
    : "Learn traditional harmony, develop your ear, and explore ear-training tools with Storm Studios Learning.";
  const image = es ? "/og/home-es.jpg" : "/og/home-en.jpg";

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title
        }
      ]
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image]
    }
  };
}

export default function HomePage() {
  return (
    <div className="ss-root">
      <div className="ss-orb ss-orb-a" />
      <div className="ss-orb ss-orb-b" />
      <div className="ss-orb ss-orb-c" />

      <HomeHero />

      <div
        className="ss-divider"
        style={{ margin: "0 2rem", position: "relative", zIndex: 1 }}
      />

      <HomeFeatures />

      <HomeCTA />

      <MusicPlayer />
      <HomeStructuredData />
    </div>
  );
}
