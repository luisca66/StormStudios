import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "00-introduccion",
  slug: "00-introduccion",
  order: 0,
  module: "introduccion",

  title: {
    es: "Introducción al Curso",
    en: "Course Introduction",
  },
  description: {
    es: "Bienvenida, presentación del método Shostakovich-Hernández Medrano y lo que aprenderás en el curso.",
    en: "Welcome, introduction to the Shostakovich-Hernández Medrano method and what you will learn in the course.",
  },
  estimatedMinutes: 15,

  prerequisites: [],

  videos: [
    // TODO: agregar youtubeId cuando el video esté publicado
  ],

  // Esta lección es introductoria, no tiene ejercicio ni reglas activas
  activeRules: [],

  tags: ["introducción", "bienvenida", "metodología"],
};
