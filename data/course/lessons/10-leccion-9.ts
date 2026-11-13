import type { LessonConfig } from "@/types/course";

// Curso Medrano (PDF 2024) p. 20; cuaderno vol. I pp. 15–16: cadencias auténtica, plagal, completa y ampliada.
// Publicada con una tarea de cuatro cadencias en tonalidades mayores distintas.
export const lesson: LessonConfig = {
  id: "10-leccion-9",
  slug: "10-leccion-9",
  order: 10,
  lessonNumber: 9,
  module: "triadas-satb",
  status: "published",
  title: {
    es: "Lección 9 — Cadencias",
    en: "Lesson 9 — Cadences",
  },
  description: {
    es: "Cuatro cadencias en tonalidades mayores: auténtica, plagal, completa y ampliada, con sus estados, pulso fuerte y conducción de voces.",
    en: "Four cadences in major keys: authentic, plagal, complete and extended, with inversions, strong beats and voice leading.",
  },
  prerequisites: ["09-leccion-8"],
  videosByLocale: {
    es: [{
      youtubeId: "__YOUTUBE_ID_ES__",
      embedUrl: "__EMBED_URL_ES__",
      title: { es: "Cadencias", en: "Cadences" },
    }],
    en: [{
      youtubeId: "__YOUTUBE_ID_EN__",
      embedUrl: "__EMBED_URL_EN__",
      title: { es: "Cadencias", en: "Cadences" },
    }],
  },
  activeRules: [],
  exercise: {
    type: "four-voice-chorale", voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"], minChords: 11, maxChords: 11,
  },
  tags: ["cuarteto vocal", "SATB", "cadencias", "tonalidades mayores", "I6/4"],
};
