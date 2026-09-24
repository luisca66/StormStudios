import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { getPageContent } from "@/lib/mdx";
import DarkMDXRenderer from "@/components/DarkMDXRenderer";
import { DarkPageLayout } from "@/components/layout/DarkPageLayout";
import { JsonLd } from "@/components/JsonLd";
import { type Locale } from "@/i18n/routing";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getLocalizedRouteUrls } from "@/lib/seo/page-alternates";

type Props = { params: Promise<{ locale: string }> };

const SLUG_MAP: Record<string, string> = { es: "el-libro", en: "the-book" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) return {};
  return createPageMetadata({
    locale: locale as Locale,
    noIndex: page.isFallback,
    urls: getLocalizedRouteUrls("/el-libro"),
    title:
      locale === "es"
        ? "Los Seres Musicales | Libro de Luis Cárdenas"
        : "The Musical Beings | Book by Luis Cardenas",
    description:
      locale === "es"
        ? "Descubre el libro Los Seres Musicales y la visión de Storm Studios Learning sobre armonía, escucha y transformación musical."
        : "Discover The Musical Beings and the Storm Studios Learning vision of harmony, listening and musical transformation.",
    keywords:
      locale === "es"
        ? ["libro de música", "Luis Cárdenas", "Los Seres Musicales", "armonía"]
        : ["music book", "Luis Cardenas", "The Musical Beings", "traditional harmony"],
    image: locale === "es" ? "/og/book-es.jpg" : "/og/book-en.jpg",
  });
}

export default async function ElLibroPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const page = await getPageContent(locale, SLUG_MAP[locale] || SLUG_MAP["es"]);
  if (!page) notFound();

  return (
    <DarkPageLayout maxWidth="1000px">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Book",
        name: locale === "es" ? "Los Seres Musicales: Una Historia de Transformación" : "The Musical Beings",
        author: { "@type": "Person", "@id": "https://www.stormstudios.com.mx/#luis-cardenas", name: "Luis Cárdenas" },
        inLanguage: locale === "es" ? "es" : "en",
        image: "https://www.stormstudios.com.mx/images/portada-libro.jpg",
        url: `https://www.stormstudios.com.mx${locale === "es" ? "/es/el-libro" : "/en/the-book"}`,
        sameAs: locale === "es"
          ? ["https://www.amazon.com/dp/B0DK4B9892", "https://www.amazon.com.mx/dp/B0DK4B9892"]
          : ["https://www.amazon.com/dp/B0DK63ZD8K", "https://www.amazon.com/dp/B0DK65FZDD"],
      }} />
      <div className="grid md:grid-cols-[260px_1fr] gap-12 items-start">
        {/* Portada */}
        <div className="flex justify-center ss-reveal">
          <Image src="/images/portada-libro.jpg"
            alt={locale === "es" ? "Portada — Los Seres Musicales" : "Cover — The Musical Beings"}
            width={260} height={350} priority
            className="rounded-xl object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 0 60px rgba(139,92,246,0.2)" }} />
        </div>
        {/* Contenido */}
        <div>
          <h1 className="ss-serif ss-reveal mb-6"
            style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", color: "#f0eeff", lineHeight: 1.1 }}>
            {page.frontmatter.title}
          </h1>
          <div className="ss-divider mb-8" />
          <DarkMDXRenderer content={page.content} />
        </div>
      </div>
    </DarkPageLayout>
  );
}
