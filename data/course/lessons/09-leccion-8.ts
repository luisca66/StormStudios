import type { LessonConfig } from "@/types/course";

// Curso Medrano pp. 15–17 y Tabla general de enlaces: material armónico y enlaces de acordes.
// La tarea son 8 enlaces de dos acordes asignados, cada uno en una tonalidad mayor elegida por el alumno.
export const lesson: LessonConfig = {
  id: "09-leccion-8",
  slug: "09-leccion-8",
  order: 9,
  lessonNumber: 8,
  module: "triadas-satb",
  status: "published",
  title: {
    es: "Lección 8 — Material armónico y enlaces",
    en: "Lesson 8 — Harmonic Material and Chord Connections",
  },
  description: {
    es: "Qué acordes de quinta usamos y en qué estado, la tabla general de enlaces y cómo se enlazan dos acordes en el cuarteto vocal.",
    en: "Which triads we use and in which position, the general table of connections, and how two chords connect in the vocal quartet.",
  },
  prerequisites: ["08-leccion-7"],
  videosByLocale: {
    es: [{
      youtubeId: "__YOUTUBE_ID_ES__",
      embedUrl: "__EMBED_URL_ES__",
      title: { es: "Material armónico y enlaces", en: "Harmonic Material and Chord Connections" },
    }],
    en: [{
      youtubeId: "__YOUTUBE_ID_EN__",
      embedUrl: "__EMBED_URL_EN__",
      title: { es: "Material armónico y enlaces", en: "Harmonic Material and Chord Connections" },
    }],
  },
  activeRules: [],
  // Un solo archivo: 8 enlaces de dos acordes (16 acordes) en las cuatro voces.
  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    minChords: 16,
    maxChords: 16,
  },
  tags: ["cuarteto vocal", "SATB", "material armónico", "enlaces", "tabla de enlaces"],
};
