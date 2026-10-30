import type { Locale } from "@/i18n/routing";

type MasteryTranslation = {
  key: string;
  slugs: Record<Locale, string>;
};

export const MASTERY_TRANSLATIONS: MasteryTranslation[] = [
  {
    key: "sunlight-to-strength",
    slugs: {
      en: "from-sunlight-to-strength",
      es: "del-sol-a-la-fuerza",
    },
  },
];

export function getMasteryPieceSlug(locale: Locale, slug: string, targetLocale: Locale) {
  return MASTERY_TRANSLATIONS.find((entry) => entry.slugs[locale] === slug)?.slugs[targetLocale];
}

const MASTERY_PATHS: Record<Locale, string> = { es: "/es/maestria", en: "/en/mastery" };

/** Una pieza sin traducción registrada solo enlaza su propio idioma. */
export function getMasteryPieceUrls(locale: Locale, slug: string): Partial<Record<Locale, string>> {
  const translation = MASTERY_TRANSLATIONS.find((entry) => entry.slugs[locale] === slug);
  if (!translation) return { [locale]: `${MASTERY_PATHS[locale]}/${slug}` };

  return {
    es: `${MASTERY_PATHS.es}/${translation.slugs.es}`,
    en: `${MASTERY_PATHS.en}/${translation.slugs.en}`,
  };
}
