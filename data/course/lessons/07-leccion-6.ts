import type { LessonConfig } from "@/types/course";

// Curso Medrano pp. 12–13: el cuarteto vocal armónico.
export const lesson: LessonConfig = {
  id: "07-leccion-6",
  slug: "07-leccion-6",
  order: 7,
  lessonNumber: 6,
  module: "triadas-satb",
  status: "published",
  title: {
    es: "Lección 6 — Cuarteto vocal armónico",
    en: "Lesson 6 — The Harmonic Vocal Quartet",
  },
  description: {
    es: "Soprano, contralto, tenor y bajo: tesituras, extensiones entre voces, duplicaciones y supresiones, estados, posición melódica y disposición de los acordes de quinta.",
    en: "Soprano, alto, tenor and bass: ranges, spacing between voices, doublings and omissions, inversions, melodic position and voicing of fifth chords.",
  },
  prerequisites: ["06-leccion-5"],
  videosByLocale: {
    es: [{
      youtubeId: "GbyIAJ5bKac",
      embedUrl: "https://www.youtube.com/embed/GbyIAJ5bKac?si=8XvgQHlFba0pzZ7Z",
      title: { es: "Cuarteto vocal armónico", en: "The Harmonic Vocal Quartet" },
    }],
    en: [{
      youtubeId: "WXghlxZc9Y8",
      embedUrl: "https://www.youtube.com/embed/WXghlxZc9Y8?si=XzxC1YUqYh8mIKca",
      title: { es: "Cuarteto vocal armónico", en: "The Harmonic Vocal Quartet" },
    }],
  },
  activeRules: [],
  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    minChords: 7,
    maxChords: 7,
  },
  tags: ["cuarteto vocal", "SATB", "tesituras", "duplicaciones", "estados", "disposición"],
};
