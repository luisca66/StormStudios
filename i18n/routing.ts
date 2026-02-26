import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",

  // Mapeo de rutas por idioma
  pathnames: {
    "/": "/",
    "/quien-soy": {
      es: "/quien-soy",
      en: "/about-me",
    },
    "/mi-metodo": {
      es: "/mi-metodo",
      en: "/my-method",
    },
    "/clases-taller": {
      es: "/clases-taller",
      en: "/classes-workshop",
    },
    "/curso-armonia": {
      es: "/curso-armonia",
      en: "/harmony-course",
    },
    "/curso-armonia/[slug]": {
      es: "/curso-armonia/[slug]",
      en: "/harmony-course/[slug]",
    },
    "/apps": "/apps",
    "/apps/[slug]": "/apps/[slug]",
    "/el-libro": {
      es: "/el-libro",
      en: "/the-book",
    },
    "/blog": "/blog",
    "/blog/[slug]": "/blog/[slug]",
    "/contacto": {
      es: "/contacto",
      en: "/contact",
    },
    "/privacidad": {
      es: "/privacidad",
      en: "/privacy",
    },
    "/sequencer": "/sequencer",
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathnames = keyof typeof routing.pathnames;
