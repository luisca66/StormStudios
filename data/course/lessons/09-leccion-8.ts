import type { LessonConfig } from "@/types/course";

// Curso Medrano p. 15 y Tabla general de enlaces: material armónico y enlaces de acordes.
// En construcción; su primera tarea serán enlaces de dos acordes asignados.
export const lesson: LessonConfig = {
  id: "09-leccion-8",
  slug: "09-leccion-8",
  order: 9,
  lessonNumber: 8,
  module: "triadas-satb",
  status: "construction",
  title: {
    es: "Lección 8 — Material armónico y enlaces",
    en: "Lesson 8 — Harmonic Material and Chord Connections",
  },
  description: {
    es: "Qué acordes de quinta usamos y en qué estado, y cómo se enlazan dos acordes en el cuarteto vocal.",
    en: "Which fifth chords we use and in which state, and how two chords connect in the vocal quartet.",
  },
  prerequisites: ["08-leccion-7"],
  videos: [],
  activeRules: [],
  tags: ["cuarteto vocal", "SATB", "material armónico", "enlaces", "tabla de enlaces"],
};
