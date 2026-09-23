import type { Locale } from "@/i18n/routing";

// Solo mapas de slugs: este módulo lo importa el selector de idioma (cliente),
// así que no debe arrastrar el contenido de lecciones ni de guías.

export const RESOURCE_SLUGS = {
  "traditional-harmony-course": { es: "curso-de-armonia-tradicional", en: "traditional-harmony-course" },
  "ear-training-exercises": { es: "ejercicios-de-entrenamiento-auditivo", en: "ear-training-exercises" },
  "interval-recognition": { es: "reconocimiento-de-intervalos", en: "interval-recognition" },
  "music-theory-basics": { es: "fundamentos-de-teoria-musical", en: "music-theory-basics" },
} satisfies Record<string, Record<Locale, string>>;

export const LESSON_URL_SLUGS: Record<string, Record<Locale, string>> = {
  "00-introduccion": {
    es: "00-introduccion",
    en: "00-course-introduction",
  },
  "p01-notas": {
    es: "p01-notas",
    en: "p01-writing-musical-notes",
  },
  "p02-ritmica": {
    es: "p02-ritmica",
    en: "p02-writing-musical-rhythm",
  },
  "p03-intervalos": {
    es: "p03-intervalos",
    en: "p03-intervals",
  },
  "p04-secuenciador": {
    es: "p04-secuenciador",
    en: "p04-using-the-sequencer",
  },
  "02-leccion-1": {
    es: "02-leccion-1",
    en: "02-lesson-1-major-scales",
  },
  "03-leccion-2": {
    es: "03-leccion-2",
    en: "03-lesson-2-modes",
  },
  "04-leccion-3": {
    es: "04-leccion-3",
    en: "04-lesson-3-minor-scales",
  },
  "05-leccion-4": {
    es: "05-leccion-4",
    en: "05-lesson-4-triads-fifth-chords",
  },
  "06-leccion-5": {
    es: "06-leccion-5",
    en: "06-lesson-5-second-inversion-64-cadence",
  },
};

export function translateResourceSlug(locale: Locale, slug: string, targetLocale: Locale) {
  return Object.values(RESOURCE_SLUGS).find((slugs) => slugs[locale] === slug)?.[targetLocale];
}

/** Acepta el slug localizado o el ID interno antiguo de una lección. */
export function translateLessonSlug(locale: Locale, slug: string, targetLocale: Locale) {
  const entry = Object.entries(LESSON_URL_SLUGS).find(
    ([id, slugs]) => id === slug || slugs[locale] === slug
  );
  return entry?.[1][targetLocale];
}
