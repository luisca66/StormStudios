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
    // TODO: agregar youtubeId cuando los videos estén publicados
  ],

  // Módulo propedéutico: solo lectura y repaso, sin ejercicio MIDI
  activeRules: [],

  tags: ["notación", "claves", "escalas", "fundamentos"],
};
