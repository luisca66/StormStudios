import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { createPageMetadata } from "@/lib/seo/page-alternates";
import StudioV5 from "@/components/sequencer/v5/StudioV5";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: locale as Locale,
    urls: { es: "/es/sequencer/v5", en: "/en/sequencer/v5" },
    title: "Storm Sequencer 5",
    description: locale === "es"
      ? "Estudio de armonía de una sola pantalla: partitura, editor de teclas, pista de acordes y cuarteto SATB."
      : "A single-screen harmony studio: score, key editor, chord track and SATB quartet.",
    noIndex: true,
  });
}

export default async function SequencerV5Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StudioV5 locale={locale} />;
}
