import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "p04-secuenciador",
  slug: "p04-secuenciador",
  order: 1.4,
  module: "propedeutico",

  title: {
    es: "P04 – Uso del Secuenciador",
    en: "P04 – Using the Sequencer",
  },
  description: {
    es: "Aprende a usar el Storm Sequencer para escribir, escuchar y exportar tus ejercicios.",
    en: "Learn to use the Storm Sequencer to write, listen to, and export your exercises.",
  },
  estimatedMinutes: 15,

  prerequisites: ["p03-intervalos"],

  videos: [
    {
      youtubeId: "2YBUqVs08VY",
      youtubeIdEn: "AuSL-6cBoI4",
      title: {
        es: "Cómo usar el Secuenciador Storm Studios",
        en: "How to use the Storm Studios Sequencer",
      },
      description: {
        es: "Aprende a escribir melodías y ejercicios de armonía en el secuenciador antes de comenzar el curso.",
        en: "Learn to write melodies and harmony exercises in the sequencer before starting the course.",
      },
    },
  ],

  tools: [
    {
      kind: "sequencer",
      title: {
        es: "Storm Sequencer v3.0",
        en: "Storm Sequencer v3.0",
      },
      description: {
        es: "El secuenciador musical que usarás para todos los ejercicios del curso. Escribe, escucha y exporta tus partituras.",
        en: "The music sequencer you'll use for all course exercises. Write, listen to, and export your scores.",
      },
      url: "/sequencer",
      icon: "🎹",
    },
  ],

  activeRules: [],

  tags: ["secuenciador", "herramienta", "propedéutico"],
};
