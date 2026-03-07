import { MusicPlayer } from "@/components/MusicPlayer";
import { HomeCTA } from "@/components/home/HomeCTA";
import { HomeFeatures } from "@/components/home/HomeFeatures";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeStructuredData } from "@/components/home/HomeStructuredData";

export async function generateMetadata({ params }) {
  const locale = params?.locale;

  return {
    title: "Storm Studios Learning",
    description:
      "Aprende armonía tradicional, desarrolla tu oído musical y explora herramientas de entrenamiento auditivo con Storm Studios Learning.",

    openGraph: {
      title: "Storm Studios Learning",
      description:
        "Aprende armonía tradicional, desarrolla tu oído musical y explora herramientas de entrenamiento auditivo con Storm Studios Learning.",
      images: [
        {
          url: "/og/home-es.jpg",
          width: 1200,
          height: 630,
          alt: "Storm Studios Learning"
        }
      ]
    },

    twitter: {
      card: "summary_large_image",
      title: "Storm Studios Learning",
      description:
        "Aprende armonía tradicional, desarrolla tu oído musical y explora herramientas de entrenamiento auditivo con Storm Studios Learning.",
      images: ["/og/home-es.jpg"]
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
