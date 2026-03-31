import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "p02-ritmica",
  slug: "p02-ritmica",
  order: 1.2,
  module: "propedeutico",

  title: {
    es: "P02 – Escritura de la Rítmica Musical",
    en: "P02 – Writing Musical Rhythm",
  },
  description: {
    es: "Aprende a escribir y leer figuras rítmicas, compases y duraciones.",
    en: "Learn to write and read rhythmic figures, time signatures, and durations.",
  },
  estimatedMinutes: 15,

  prerequisites: ["p01-notas"],

  activeRules: [],

  tags: ["rítmica", "figuras", "compás", "propedéutico"],
};
