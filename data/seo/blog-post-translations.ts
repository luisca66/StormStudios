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
  {
    key: "site-progress-lesson-4-delay",
    slugs: {
      en: "2026-09-24-lesson-4-is-late-but-the-site-kept-moving",
      es: "2026-09-24-lo-que-avanzamos-mientras-llega-la-leccion-4",
    },
  },
  {
    key: "storm-sequencer-v4",
    slugs: {
      en: "2026-09-30-storm-sequencer-v4",
      es: "2026-09-30-storm-sequencer-v4",
    },
  },
  {
    key: "lessons-4-and-5-published",
    slugs: {
      en: "2026-10-04-lessons-4-and-5-published",
      es: "2026-10-04-lecciones-4-y-5-publicadas",
    },
  },
  {
    key: "videos-made-with-ai",
    slugs: {
      en: "2026-10-04-videos-made-with-artificial-intelligence",
      es: "2026-10-04-videos-con-inteligencia-artificial",
    },
  },
  {
    key: "lesson-6-published",
    slugs: {
      en: "2026-10-05-lesson-6-published",
      es: "2026-10-05-leccion-6-publicada",
    },
  },
  {
    key: "lesson-7-published",
    slugs: {
      en: "2026-10-09-lesson-7-published",
      es: "2026-10-09-leccion-7-publicada",
    },
  },
  {
    key: "lesson-8-published",
    slugs: {
      en: "2026-10-09-lesson-8-published",
      es: "2026-10-09-leccion-8-publicada",
    },
  },
  {
    key: "3d-games-renewed-utility-apps",
    slugs: {
      en: "2026-10-20-3d-games-renewed-and-utility-apps",
      es: "2026-10-20-juegos-3d-renovados-y-utility-apps",
    },
  },
  {
    key: "mastery-section",
    slugs: {
      en: "2026-10-30-new-mastery-section",
      es: "2026-10-30-nueva-seccion-maestria",
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
