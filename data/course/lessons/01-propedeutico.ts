import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "01-propedeutico",
  slug: "01-propedeutico",
  order: 1,
  module: "propedeutico",

  title: {
    es: "Módulo Propedéutico",
    en: "Preparatory Module",
  },
  description: {
    es: "Repaso esencial de notación musical, claves, figuras, compases, escalas mayores y menores.",
    en: "Essential review of music notation, clefs, note values, time signatures, major and minor scales.",
  },
  estimatedMinutes: 45,

  prerequisites: ["00-introduccion"],

  videos: [
    {
      youtubeId: "2YBUqVs08VY",
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

  // Módulo propedéutico: solo lectura y repaso, sin ejercicio MIDI
  activeRules: [],

  tags: ["notación", "claves", "escalas", "fundamentos"],
};
