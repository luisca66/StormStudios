import type { Locale } from "@/i18n/routing";

type BlogPostTranslation = {
  key: string;
  slugs: Record<Locale, string>;
};

export const BLOG_POST_TRANSLATIONS: BlogPostTranslation[] = [
  {
    key: "welcome",
    slugs: {
      en: "2026-05-21-welcome",
      es: "2026-05-21-bienvenida",
    },
  },
];

export function findBlogTranslationBySlug(locale: Locale, slug: string) {
  return BLOG_POST_TRANSLATIONS.find((entry) => entry.slugs[locale] === slug);
}

export function getBlogPostSlug(locale: Locale, slug: string, targetLocale: Locale) {
  const translation = findBlogTranslationBySlug(locale, slug);
  return translation?.slugs[targetLocale];
}

export function getBlogPostUrls(locale: Locale, slug: string) {
  const translation = findBlogTranslationBySlug(locale, slug);
  const esSlug = translation?.slugs.es ?? slug;
  const enSlug = translation?.slugs.en ?? slug;

  return {
    es: `/es/blog/${esSlug}`,
    en: `/en/blog/${enSlug}`,
  };
}
