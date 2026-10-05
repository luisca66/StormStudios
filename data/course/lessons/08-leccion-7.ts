import type { LessonConfig } from "@/types/course";

// Curso Medrano pp. 13–14: movimientos melódicos y armónicos. En construcción; su tarea y el
// Maestro Virtual se definen al implementar la lección.
export const lesson: LessonConfig = {
  id: "08-leccion-7",
  slug: "08-leccion-7",
  order: 8,
  lessonNumber: 7,
  module: "triadas-satb",
  status: "construction",
  title: {
    es: "Lección 7 — Movimientos melódicos y armónicos",
    en: "Lesson 7 — Melodic and Harmonic Motion",
  },
  description: {
    es: "Cómo se mueve cada voz al enlazar un acorde con otro: intervalos melódicos permitidos, grados conjuntos y saltos, y las quintas y octavas paralelas.",
    en: "How each voice moves when one chord connects to the next: allowed melodic intervals, steps and leaps, and parallel fifths and octaves.",
  },
  prerequisites: ["07-leccion-6"],
  videos: [],
  activeRules: [],
  tags: ["cuarteto vocal", "SATB", "movimiento melódico", "enlaces", "quintas paralelas"],
};
