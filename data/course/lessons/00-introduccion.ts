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
    es: "Bienvenida, bienvenido. El método Shostakovich-Hernández Medrano-Cárdenas y lo que aprenderás en el curso.",
    en: "Welcome, introduction to the Shostakovich-Hernández Medrano method and what you will learn in the course.",
  },
  estimatedMinutes: 15,

  prerequisites: [],

  videos: [
    {
      youtubeId: "Myzo9sN_Yys",
      title: {
        es: "Presentación del Maestro Hernández Medrano",
        en: "Introduction by Maestro Hernández Medrano",
      },
      description: {
        es: "El maestro Humberto Hernández Medrano presenta el método y lo que aprenderás en este curso.",
        en: "Maestro Humberto Hernández Medrano introduces the method and what you will learn in this course.",
      },
    },
  ],

  // Esta lección es introductoria, no tiene ejercicio ni reglas activas
  activeRules: [],

  tags: ["introducción", "bienvenida", "metodología"],
};
