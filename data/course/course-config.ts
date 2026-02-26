import type { CourseConfig } from "@/types/course";

/**
 * Configuración global del Curso de Armonía Tradicional.
 * Los slugs en `lessons` deben coincidir exactamente con los slugs
 * definidos en cada archivo de data/course/lessons/.
 */
export const COURSE_CONFIG: CourseConfig = {
  id: "armonia-tradicional",
  title: {
    es: "Curso de Armonía Tradicional",
    en: "Traditional Harmony Course",
  },
  description: {
    es: "Domina la Armonía en el nuevo mundo de la IA: El Legado Shostakovich-Hernández Medrano, ahora accesible en línea gratis.",
    en: "Master Harmony in the new world of AI: The Shostakovich-Hernández Medrano Legacy, now accessible online for free.",
  },
  totalLessons: 60, // meta final; actualmente 7 publicadas
  instructorName: "Luis Cárdenas",
  modules: [
    {
      id: "introduccion",
      slug: "introduccion",
      order: 0,
      title: { es: "Introducción", en: "Introduction" },
      description: {
        es: "Bienvenida al curso y presentación del método.",
        en: "Welcome to the course and introduction to the method.",
      },
      lessons: ["00-introduccion"],
    },
    {
      id: "propedeutico",
      slug: "propedeutico",
      order: 1,
      title: { es: "Módulo Propedéutico", en: "Preparatory Module" },
      description: {
        es: "Notación musical, claves, escalas y fundamentos para el curso.",
        en: "Music notation, clefs, scales and fundamentals for the course.",
      },
      lessons: ["01-propedeutico"],
    },
    {
      id: "triadas-satb",
      slug: "triadas-satb",
      order: 2,
      title: { es: "Tríadas en SATB", en: "Triads in SATB" },
      description: {
        es: "Escritura coral a 4 voces con tríadas en estado fundamental e inversiones.",
        en: "Four-voice chorale writing with triads in root position and inversions.",
      },
      lessons: [
        "02-leccion-1",
        "03-leccion-2",
        "04-leccion-3",
        "05-leccion-4",
        "06-leccion-5",
      ],
    },
  ],
};
