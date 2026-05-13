import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "p02-ritmica",
  slug: "p02-ritmica",
  order: 1.2,
  module: "propedeutico",

  title: {
    es: "P02 – Escritura de la Rítmica Musical",
    en: "P02 – Writing Musical Rhythm",
  },
  description: {
    es: "Aprende a escribir y leer figuras rítmicas, compases y duraciones.",
    en: "Learn to write and read rhythmic figures, time signatures, and durations.",
  },
  estimatedMinutes: 15,

  prerequisites: ["p01-notas"],

  videosByLocale: {
    es: [
      {
        youtubeId: "eSh6LBMKT4M",
        embedUrl: "https://www.youtube.com/embed/eSh6LBMKT4M?si=CdHYXW8CnLrm7-27",
      },
    ],
    en: [
      {
        youtubeId: "NQB4oav_5iQ",
        embedUrl: "https://www.youtube.com/embed/NQB4oav_5iQ?si=gwpEexKtjGtW_H1v",
      },
    ],
  },

  toolsByLocale: {
    es: [
      {
        kind: "app",
        title: {
          es: "Lecto-escritura de Batería",
          en: "Drum Reading and Writing",
        },
        description: {
          es: "Practica patrones rítmicos de batería con notación, reproducción y controles interactivos.",
          en: "Practice drum rhythm patterns with notation, playback, and interactive controls.",
        },
        url: "/apps/storm-bateria-v9.5.html",
        icon: "🥁",
      },
    ],
    en: [
      {
        kind: "app",
        title: {
          es: "Lecto-escritura de Batería",
          en: "Drum Reading and Writing",
        },
        description: {
          es: "Practica patrones rítmicos de batería con notación, reproducción y controles interactivos.",
          en: "Practice drum rhythm patterns with notation, playback, and interactive controls.",
        },
        url: "/apps/storm-bateria-v9.5-en.html",
        icon: "🥁",
      },
    ],
  },

  activeRules: [],

  tags: ["rítmica", "figuras", "compás", "propedéutico"],
};
