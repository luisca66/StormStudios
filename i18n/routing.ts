import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["es", "en"],
  defaultLocale: "es",
  localeDetection: false,
  alternateLinks: false,

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
    "/apps/acordes/jugar": {
      es: "/apps/acordes/jugar",
      en: "/apps/acordes/play",
    },
    "/apps/acordes/juego": {
      es: "/apps/acordes/juego",
      en: "/apps/acordes/game",
    },
    "/apps/acordes-cantar/jugar": "/apps/acordes-cantar/jugar",
    "/apps/desglose/jugar": "/apps/desglose/jugar",
    "/apps/intervalos-cantados/jugar": {
      es: "/apps/intervalos-cantados/jugar",
      en: "/apps/intervalos-cantados/play",
    },
    "/apps/intervalos-cantados/juego": {
      es: "/apps/intervalos-cantados/juego",
      en: "/apps/intervalos-cantados/game",
    },
    "/apps/intervalos-reconocimiento/jugar": {
      es: "/apps/intervalos-reconocimiento/jugar",
      en: "/apps/intervalos-reconocimiento/play",
    },
    "/apps/intervalos-reconocimiento/juego": {
      es: "/apps/intervalos-reconocimiento/juego",
      en: "/apps/intervalos-reconocimiento/game",
    },
    "/apps/cosmic-ear/jugar": {
      es: "/apps/cosmic-ear/jugar",
      en: "/apps/cosmic-ear/play",
    },
    "/apps/matematicas-mentales/jugar": "/apps/matematicas-mentales/jugar",
    "/apps/grados-mayores/jugar": "/apps/grados-mayores/jugar",
    "/apps/grados-menores/jugar": {
      es: "/apps/grados-menores/jugar",
      en: "/apps/grados-menores/play",
    },
    "/apps/oido-absoluto-guitarra/jugar": {
      es: "/apps/oido-absoluto-guitarra/jugar",
      en: "/apps/oido-absoluto-guitarra/play",
    },
    "/apps/oido-absoluto-multi/jugar": {
      es: "/apps/oido-absoluto-multi/jugar",
      en: "/apps/oido-absoluto-multi/play",
    },
    "/apps/oido-absoluto-multi/juego": {
      es: "/apps/oido-absoluto-multi/juego",
      en: "/apps/oido-absoluto-multi/game",
    },
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
    "/resources": {
      es: "/recursos",
      en: "/resources",
    },
    "/resources/[slug]": {
      es: "/recursos/[slug]",
      en: "/resources/[slug]",
    },
    "/herramientas/lectura-musical": {
      es: "/herramientas/lectura-musical",
      en: "/tools/music-reading",
    },
    "/herramientas/lectura-ritmica": {
      es: "/herramientas/lectura-ritmica",
      en: "/tools/rhythm-reading",
    },
    "/intervalos": "/intervalos",
    "/memoria": "/memoria",
    "/sequencer": "/sequencer",
  },
});

export type Locale = (typeof routing.locales)[number];
export type Pathnames = keyof typeof routing.pathnames;
