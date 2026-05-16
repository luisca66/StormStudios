import { RhythmReadingApp } from "@/components/rhythm-reading/RhythmReadingApp";
import type { Locale } from "@/i18n/routing";
import {
  createPageMetadata,
  getLocalizedRouteUrls,
} from "@/lib/seo/page-alternates";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

const copy = {
  es: {
    title: "Juego de lectura rítmica",
    description:
      "Practica lectura rítmica con patrones generados, metrónomo, tap tempo y evaluación de precisión.",
  },
  en: {
    title: "Rhythm Reading Game",
    description:
      "Practice rhythm reading with generated patterns, metronome, tap input, and timing evaluation.",
  },
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const currentLocale = locale as Locale;
  const localizedCopy = copy[currentLocale] ?? copy.es;

  return createPageMetadata({
    locale: currentLocale,
    urls: getLocalizedRouteUrls("/herramientas/lectura-ritmica"),
    title: localizedCopy.title,
    description: localizedCopy.description,
    keywords:
      currentLocale === "es"
        ? ["lectura rítmica", "ritmo musical", "figuras rítmicas", "metrónomo"]
        : ["rhythm reading", "musical rhythm", "rhythmic figures", "metronome"],
    image: currentLocale === "es" ? "/og/course-es.jpg" : "/og/course-en.jpg",
  });
}

export default async function RhythmReadingPage({ params }: Props) {
  const { locale } = await params;

  return <RhythmReadingApp locale={locale === "en" ? "en" : "es"} />;
}
