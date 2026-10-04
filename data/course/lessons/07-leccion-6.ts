import type { LessonConfig } from "@/types/course";

// Curso Medrano pp. 12–13: el cuarteto vocal armónico. En construcción; su tarea SATB y el
// Maestro Virtual se definen al implementar la lección.
export const lesson: LessonConfig = {
  id: "07-leccion-6",
  slug: "07-leccion-6",
  order: 7,
  lessonNumber: 6,
  module: "triadas-satb",
  status: "construction",
  title: {
    es: "Lección 6 — Cuarteto vocal armónico",
    en: "Lesson 6 — The Harmonic Vocal Quartet",
  },
  description: {
    es: "Soprano, contralto, tenor y bajo: tesituras, extensiones entre voces, duplicaciones y supresiones, estados, posición melódica y disposición de los acordes de quinta.",
    en: "Soprano, alto, tenor and bass: ranges, spacing between voices, doublings and omissions, inversions, melodic position and voicing of fifth chords.",
  },
  prerequisites: ["06-leccion-5"],
  videos: [],
  activeRules: [],
  tags: ["cuarteto vocal", "SATB", "tesituras", "duplicaciones", "estados", "disposición"],
};
