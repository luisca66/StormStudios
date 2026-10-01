import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "05-leccion-4",
  slug: "05-leccion-4",
  order: 5,
  lessonNumber: 4,
  module: "triadas-satb",
  status: "published",
  statusByLocale: { en: "construction" },

  title: {
    es: "Lección 4 — Acordes de 5a",
    en: "Lesson 4 — Triads (Fifth Chords)",
  },
  description: {
    es: "Las tríadas (acordes de 5a): mayor, menor, disminuida y aumentada, sobre cada grado de las escalas básicas.",
    en: "Triads (fifth chords): major, minor, diminished and augmented, built on each degree of the basic scales.",
  },
  estimatedMinutes: 75,

  prerequisites: ["04-leccion-3"],

  videos: [
    {
      youtubeId: "Xe4kFYwIuKQ",
      embedUrl: "https://www.youtube.com/embed/Xe4kFYwIuKQ?si=rAS7hnc6z8K27JNY",
      title: { es: "Acordes de 5a", en: "Triads (Fifth Chords)" },
      durationMinutes: 10.63,
    },
  ],

  // La revisión automática de este ejercicio se incorporará más adelante.
  activeRules: [],

  tags: ["tríadas", "acordes de quinta", "escalas", "mayor", "menor", "disminuido", "aumentado"],
};
