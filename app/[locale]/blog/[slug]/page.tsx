import { notFound } from "next/navigation";
import { getBlogPost, getBlogPosts } from "@/lib/mdx";
import { BlogLayout } from "@/components/blog/BlogLayout";
import { JsonLd } from "@/components/JsonLd";
import { MDXRemote } from "next-mdx-remote/rsc";
import { createPageMetadata } from "@/lib/seo/page-alternates";
import { getBlogPostUrls } from "@/data/seo/blog-post-translations";
import type { Locale } from "@/i18n/routing";

interface BlogPostPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  const post = await getBlogPost(locale, slug);

  if (!post) notFound();

  const postUrl = `https://www.stormstudios.com.mx/${locale}/blog/${slug}`;

  return (
    <BlogLayout frontmatter={post.frontmatter} locale={locale}>
      <MDXRemote source={post.content} />
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.frontmatter.title,
        "description": post.frontmatter.description,
        "url": postUrl,
        "datePublished": post.frontmatter.date,
        "dateModified": post.frontmatter.date,
        "author": {
          "@type": "Organization",
          "@id": "https://www.stormstudios.com.mx/#organization",
          "name": post.frontmatter.author ?? "Storm Studios Learning"
        },
        "publisher": {
          "@type": "Organization",
          "@id": "https://www.stormstudios.com.mx/#organization",
          "name": "Storm Studios Learning",
          "logo": "https://www.stormstudios.com.mx/images/logo-storm.png"
        },
        "image": "https://www.stormstudios.com.mx/images/og-default.jpg",
        "keywords": post.frontmatter.tags?.join(", "),
        "inLanguage": locale === "es" ? "es-MX" : "en-US",
        "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl }
      }} />
    </BlogLayout>
  );
}

export async function generateStaticParams() {
  const locales = ["es", "en"];
  const params: { locale: string; slug: string }[] = [];

  for (const locale of locales) {
    const posts = await getBlogPosts(locale);
    for (const post of posts) {
      params.push({ locale, slug: post.slug });
    }
  }

  return params;
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { locale, slug } = await params;
  const post = await getBlogPost(locale, slug);

  if (!post) return {};

  return createPageMetadata({
    locale: locale as Locale,
    urls: getBlogPostUrls(locale as Locale, slug),
    title: post.frontmatter.title,
    description: post.frontmatter.description ?? post.frontmatter.title,
    keywords: post.frontmatter.tags,
    type: "article",
    publishedTime: post.frontmatter.date,
    modifiedTime: post.frontmatter.date,
    authors: post.frontmatter.author ? [post.frontmatter.author] : undefined,
    tags: post.frontmatter.tags,
  });
}
