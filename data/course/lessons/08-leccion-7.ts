import type { LessonConfig } from "@/types/course";

// Curso Medrano pp. 13–14: movimientos melódicos y armónicos. La tarea practica la melodía
// de cada voz por separado; las reglas armónicas ya están en el core para las lecciones de enlaces.
export const lesson: LessonConfig = {
  id: "08-leccion-7",
  slug: "08-leccion-7",
  order: 8,
  lessonNumber: 7,
  module: "triadas-satb",
  status: "published",
  title: {
    es: "Lección 7 — Movimientos melódicos y armónicos",
    en: "Lesson 7 — Melodic and Harmonic Motion",
  },
  description: {
    es: "Cómo se mueve cada voz al enlazar un acorde con otro: intervalos melódicos permitidos, grado conjunto y saltos, disminuidos, saltos sucesivos, y las quintas y octavas paralelas o contrarias.",
    en: "How each voice moves when one chord connects to the next: allowed melodic intervals, steps and leaps, diminished intervals, successive leaps, and parallel or contrary fifths and octaves.",
  },
  prerequisites: ["07-leccion-6"],
  videosByLocale: {
    es: [{
      youtubeId: "__YOUTUBE_ID_ES__",
      embedUrl: "__EMBED_URL_ES__",
      title: { es: "Movimientos melódicos y armónicos", en: "Melodic and Harmonic Motion" },
    }],
    en: [{
      youtubeId: "t6OGFBwUk5k",
      embedUrl: "https://www.youtube.com/embed/t6OGFBwUk5k?si=uaU3CkbV4UR-K8NG",
      title: { es: "Movimientos melódicos y armónicos", en: "Melodic and Harmonic Motion" },
    }],
  },
  activeRules: [],
  tags: ["cuarteto vocal", "SATB", "movimiento melódico", "intervalos", "quintas paralelas", "octavas paralelas"],
};
