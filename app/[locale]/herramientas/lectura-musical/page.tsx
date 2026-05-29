import { MusicReadingApp } from "@/components/music-reading/MusicReadingApp";
import {
  createPageMetadata,
  getLocalizedRouteUrls,
} from "@/lib/seo/page-alternates";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ locale: string }>;
};

const copy = {
  es: {
    title: "Juego de lectura musical",
    description:
      "Practica el reconocimiento de notas naturales en clave de sol y clave de fa con niveles progresivos.",
  },
  en: {
    title: "Music Reading Game",
    description:
      "Practice recognizing natural notes in treble clef and bass clef with progressive levels.",
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
    urls: getLocalizedRouteUrls("/herramientas/lectura-musical"),
    title: localizedCopy.title,
    description: localizedCopy.description,
    keywords:
      currentLocale === "es"
        ? ["lectura musical", "notas musicales", "clave de sol", "clave de fa"]
        : ["music reading", "musical notes", "treble clef", "bass clef"],
    image: currentLocale === "es" ? "/og/course-es.jpg" : "/og/course-en.jpg",
  });
}

export default async function MusicReadingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <MusicReadingApp locale={locale === "en" ? "en" : "es"} />;
}
