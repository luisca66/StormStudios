import type { LessonConfig } from "@/types/course";

// Curso Medrano (PDF 2024) pp. 17–18: casos especiales del modo menor al enlazar acordes.
// En construcción.
export const lesson: LessonConfig = {
  id: "10-leccion-9",
  slug: "10-leccion-9",
  order: 10,
  lessonNumber: 9,
  module: "triadas-satb",
  status: "construction",
  title: {
    es: "Lección 9 — Enlaces en el modo menor",
    en: "Lesson 9 — Chord Connections in the Minor Mode",
  },
  description: {
    es: "El material armónico del modo menor y sus casos especiales de enlace: la sensible, la subtónica, el IV melódico y la tercera de Picardía.",
    en: "The harmonic material of the minor mode and its special connection cases: the leading tone, the subtonic, the melodic IV and the Picardy third.",
  },
  prerequisites: ["09-leccion-8"],
  videos: [],
  activeRules: [],
  tags: ["cuarteto vocal", "SATB", "modo menor", "enlaces", "tercera de Picardía"],
};
