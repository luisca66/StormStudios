import { notFound } from "next/navigation";
import { getMasteryPiece, getMasteryPieces } from "@/lib/mdx";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { MasteryVideo } from "@/components/mastery/MasteryVideo";
import { JsonLd } from "@/components/JsonLd";
import { MDXRemote } from "next-mdx-remote/rsc";
import { setRequestLocale } from "next-intl/server";
import { createPageMetadata, getAbsoluteUrl, getLocalizedPathname } from "@/lib/seo/page-alternates";
import { getMasteryPieceUrls } from "@/data/seo/mastery-translations";
import type { Locale } from "@/i18n/routing";

interface MasteryPiecePageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function MasteryPiecePage({ params }: MasteryPiecePageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const piece = await getMasteryPiece(locale, slug);

  if (!piece) notFound();

  const es = locale === "es";
  const { frontmatter } = piece;
  const pieceUrl = getAbsoluteUrl(getLocalizedPathname("/maestria/[slug]", locale as Locale, { slug }));

  return (
    <BlogLayout
      frontmatter={frontmatter}
      locale={locale}
      back={{
        href: getLocalizedPathname("/maestria", locale as Locale),
        label: es ? "← Maestría" : "← Mastery",
      }}
      media={frontmatter.youtubeId && (
        <MasteryVideo
          youtubeId={frontmatter.youtubeId}
          title={frontmatter.title}
          playLabel={es ? "Reproducir video" : "Play video"}
        />
      )}
      cta={{
        title: es ? "¿También eres músico?" : "Are you a musician too?",
        text: es
          ? "La misma atención a cada repetición guía el Curso de Armonía, gratis y con revisión automática de tus ejercicios."
          : "The same attention to every repetition guides the Harmony Course, free and with automatic feedback on your exercises.",
        href: getLocalizedPathname("/curso-armonia", locale as Locale),
        label: es ? "Ir al Curso →" : "Go to Course →",
      }}
    >
      <MDXRemote source={piece.content} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": frontmatter.title,
        "description": frontmatter.description,
        "url": pieceUrl,
        "datePublished": frontmatter.date,
        "dateModified": piece.lastModified?.toISOString(),
        "author": {
          "@type": "Person",
          "@id": "https://www.stormstudios.com.mx/#luis-cardenas",
          "name": "Luis Cárdenas"
        },
        "publisher": {
          "@type": "Organization",
          "@id": "https://www.stormstudios.com.mx/#organization",
          "name": "Storm Studios Learning",
          "logo": "https://www.stormstudios.com.mx/images/logo-storm.png"
        },
        "keywords": frontmatter.tags?.join(", "),
        "inLanguage": es ? "es-MX" : "en-US",
        "mainEntityOfPage": { "@type": "WebPage", "@id": pieceUrl },
        ...(frontmatter.youtubeId ? {
          "image": `https://i.ytimg.com/vi/${frontmatter.youtubeId}/maxresdefault.jpg`,
          "video": {
            "@type": "VideoObject",
            "name": frontmatter.title,
            "description": frontmatter.description,
            "thumbnailUrl": `https://i.ytimg.com/vi/${frontmatter.youtubeId}/maxresdefault.jpg`,
            "uploadDate": frontmatter.date,
            "duration": frontmatter.duration,
            "embedUrl": `https://www.youtube-nocookie.com/embed/${frontmatter.youtubeId}`,
            "contentUrl": `https://www.youtube.com/watch?v=${frontmatter.youtubeId}`,
            "inLanguage": es ? "es-MX" : "en-US"
          }
        } : {})
      }} />
    </BlogLayout>
  );
}

// Slugs fuera de generateStaticParams caen en el 404 raíz prerenderizado, igual que en el blog.
export const dynamicParams = false;

export async function generateStaticParams() {
  const locales = ["es", "en"];
  const params: { locale: string; slug: string }[] = [];

  for (const locale of locales) {
    const pieces = await getMasteryPieces(locale);
    for (const piece of pieces) {
      params.push({ locale, slug: piece.slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: MasteryPiecePageProps) {
  const { locale, slug } = await params;
  const piece = await getMasteryPiece(locale, slug);

  if (!piece) return {};

  const { frontmatter } = piece;

  return createPageMetadata({
    locale: locale as Locale,
    urls: getMasteryPieceUrls(locale as Locale, slug),
    title: typeof frontmatter.seoTitle === "string" ? frontmatter.seoTitle : frontmatter.title,
    description: frontmatter.description ?? frontmatter.title,
    keywords: frontmatter.tags,
    type: "article",
    publishedTime: frontmatter.date,
    modifiedTime: piece.lastModified?.toISOString(),
    authors: frontmatter.author ? [frontmatter.author] : undefined,
    tags: frontmatter.tags,
    image: frontmatter.youtubeId ? `https://i.ytimg.com/vi/${frontmatter.youtubeId}/maxresdefault.jpg` : undefined,
  });
}
