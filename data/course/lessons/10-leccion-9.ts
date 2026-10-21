import type { LessonConfig } from "@/types/course";

// Curso Medrano (PDF 2024) p. 20; cuaderno vol. I pp. 15–16: cadencias auténtica, plagal, completa y ampliada.
// En construcción.
export const lesson: LessonConfig = {
  id: "10-leccion-9",
  slug: "10-leccion-9",
  order: 10,
  lessonNumber: 9,
  module: "triadas-satb",
  status: "construction",
  title: {
    es: "Lección 9 — Cadencias",
    en: "Lesson 9 — Cadences",
  },
  description: {
    es: "Cuatro cadencias en tonalidades mayores: auténtica, plagal, completa y ampliada, con sus estados, pulso fuerte y conducción de voces.",
    en: "Four cadences in major keys: authentic, plagal, complete and expanded, with inversions, strong beats and voice leading.",
  },
  prerequisites: ["09-leccion-8"],
  videos: [],
  activeRules: [],
  exercise: {
    type: "four-voice-chorale", voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"], minChords: 11, maxChords: 11,
  },
  tags: ["cuarteto vocal", "SATB", "cadencias", "tonalidades mayores", "I6/4"],
};
