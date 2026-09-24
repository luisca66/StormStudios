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
  {
    key: "preparatory-module-apps-ready",
    slugs: {
      en: "2026-05-27-preparatory-module-ready-mental-math-memory-apps",
      es: "2026-05-27-propedeutico-listo-apps-matematicas-memoria",
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

/** Un post sin traducción registrada solo enlaza su propio idioma. */
export function getBlogPostUrls(locale: Locale, slug: string): Partial<Record<Locale, string>> {
  const translation = findBlogTranslationBySlug(locale, slug);
  if (!translation) return { [locale]: `/${locale}/blog/${slug}` };

  return {
    es: `/es/blog/${translation.slugs.es}`,
    en: `/en/blog/${translation.slugs.en}`,
  };
}
