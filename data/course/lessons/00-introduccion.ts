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
      youtubeId: "0I2h_Z6ytiM",
      embedUrl: "https://www.youtube.com/embed/0I2h_Z6ytiM?si=saoa1y9StKrtLn1v",
      youtubeIdEn: "R3vjv_petFI",
      embedUrlEn: "https://www.youtube.com/embed/R3vjv_petFI?si=xUTCxu2DhkKqqvrC",
    },
  ],

  // Esta lección es introductoria, no tiene ejercicio ni reglas activas
  activeRules: [],

  tags: ["introducción", "bienvenida", "metodología"],
};
