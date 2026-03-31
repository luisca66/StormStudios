import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "p03-intervalos",
  slug: "p03-intervalos",
  order: 1.3,
  module: "propedeutico",

  title: {
    es: "P03 – Intervalos",
    en: "P03 – Intervals",
  },
  description: {
    es: "Comprende y clasifica los intervalos musicales: segundas, terceras, cuartas y más.",
    en: "Understand and classify musical intervals: seconds, thirds, fourths and more.",
  },
  estimatedMinutes: 20,

  prerequisites: ["p02-ritmica"],

  tools: [
    {
      kind: "app",
      title: {
        es: "Piano de Intervalos",
        en: "Interval Piano",
      },
      description: {
        es: "Explora intervalos en el piano: selecciona dos notas y escucha el intervalo melódico o armónico.",
        en: "Explore intervals on the piano: select two notes and listen melodically or harmonically.",
      },
      url: "/intervalos",
      icon: "🎵",
    },
  ],

  activeRules: [],

  tags: ["intervalos", "distancia", "propedéutico"],
};
