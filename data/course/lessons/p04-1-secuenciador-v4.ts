import type { LessonConfig } from "@/types/course";

// Cada versión nueva del secuenciador entra como su propio renglón debajo de P04 (P04.1, P04.2…).
// P04 se queda con el v3 porque el video introductorio y las lecciones 1 a 3 lo usan.
export const lesson: LessonConfig = {
  id: "p04-1-secuenciador-v4",
  slug: "p04-1-secuenciador-v4",
  order: 1.45,
  module: "propedeutico",

  title: {
    es: "P04.1 – Uso del Secuenciador v4",
    en: "P04.1 – Using the Sequencer v4",
  },
  description: {
    es: "La versión nueva del secuenciador: escribe notas y acordes, escúchalos, ponles su cifrado y guarda tu trabajo.",
    en: "The new version of the sequencer: write notes and chords, listen to them, add their chord symbols and save your work.",
  },
  estimatedMinutes: 10,

  prerequisites: ["p04-secuenciador"],

  videosByLocale: {
    es: [{ youtubeId: "c39Sj9c4g5I", embedUrl: "https://www.youtube.com/embed/c39Sj9c4g5I?si=hFxwEhAn5IpR9kJB" }],
    en: [{ youtubeId: "-CAElXLJQaw", embedUrl: "https://www.youtube.com/embed/-CAElXLJQaw?si=mV_8sLMMkfN4B_gV" }],
  },

  tools: [
    {
      kind: "sequencer",
      title: {
        es: "Storm Sequencer v4.0",
        en: "Storm Sequencer v4.0",
      },
      description: {
        es: "La versión renovada del secuenciador: partitura continua o por páginas, Piano Roll, selección y copia de notas.",
        en: "The renewed sequencer: continuous or page view, Piano Roll, selecting and copying notes.",
      },
      url: "/sequencer/v4",
      icon: "🎹",
    },
  ],

  activeRules: [],

  tags: ["secuenciador", "herramienta", "propedéutico"],
};
