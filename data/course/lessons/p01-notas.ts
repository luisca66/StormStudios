import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "p01-notas",
  slug: "p01-notas",
  order: 1.1,
  module: "propedeutico",

  title: {
    es: "P01 – Escritura de las Notas Musicales",
    en: "P01 – Writing Musical Notes",
  },
  description: {
    es: "Aprende a escribir y leer notas musicales en el pentagrama.",
    en: "Learn to write and read musical notes on the staff.",
  },
  estimatedMinutes: 15,

  prerequisites: ["00-introduccion"],

  tools: [
    {
      kind: "app",
      title: {
        es: "Piano Interactivo",
        en: "Interactive Piano",
      },
      description: {
        es: "Toca el piano y ve cada nota aparecer en el pentagrama en clave de Sol, Fa o Gran Pauta.",
        en: "Play the piano and see each note appear on the staff in treble clef, bass clef, or grand staff.",
      },
      url: "/apps/piano-notas.html",
      urlEn: "/apps/piano-notas-en.html",
      icon: "🎹",
      embed: true,
      embedHeight: 760,
    },
  ],

  activeRules: [],

  tags: ["notas", "pentagrama", "notación", "propedéutico"],
};
