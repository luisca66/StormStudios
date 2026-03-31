import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getPageContent } from "@/lib/mdx";
import DarkMDXRenderer from "@/components/DarkMDXRenderer";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { type Locale } from "@/i18n/routing";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

const SLUG_MAP: Record<string, string> = { es: "quien-soy", en: "about-me" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) return {};
  return createPageMetadata({
    locale: locale as Locale,
    urls: getLocalizedRouteUrls("/quien-soy"),
    title:
      locale === "es"
        ? "Luis Cárdenas | Músico, compositor y educador"
        : "Luis Cardenas | Musician, composer and educator",
    description:
      locale === "es"
        ? "Conoce la trayectoria de Luis Cárdenas: músico, compositor, educador y fundador de Storm Studios Learning."
        : "Meet Luis Cardenas: musician, composer, educator and founder of Storm Studios Learning.",
    keywords:
      locale === "es"
        ? ["Luis Cárdenas", "Storm Studios Learning", "profesor de música", "armonía"]
        : ["Luis Cardenas", "Storm Studios Learning", "music educator", "traditional harmony"],
    image: page.frontmatter.image as string | undefined,
  });
}

export default async function QuienSoyPage({ params }: Props) {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) notFound();

  return (
    <DarkPageLayout>
      {page.frontmatter.image && (
        <div className="mb-10 flex justify-center ss-reveal">
          <Image src={page.frontmatter.image} alt="Luis Cárdenas"
            width={280} height={280} priority
            className="rounded-2xl object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
        </div>
      )}
      <h1 className="ss-serif ss-reveal mb-10"
        style={{ fontSize: "clamp(2rem,5vw,3rem)", color: "#f0eeff", lineHeight: 1.1 }}>
        {page.frontmatter.title}
      </h1>
      <div className="ss-divider mb-10" />
      <DarkMDXRenderer content={page.content} />
    </DarkPageLayout>
  );
}
