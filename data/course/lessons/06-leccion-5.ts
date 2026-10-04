import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "06-leccion-5",
  slug: "06-leccion-5",
  order: 6,
  lessonNumber: 5,
  module: "triadas-satb",
  status: "construction",
  title: {
    es: "Lección 5 — Grados, acordes y tonalidad",
    en: "Lesson 5 — Degrees, Chords and Tonality",
  },
  description: {
    es: "Nombres y funciones de los grados, acordes por terceras, las armonías y la serie de armónicos, regiones tonales y el círculo de quintas.",
    en: "Degree names and functions, chords in stacked thirds, the harmonies and the harmonic series, tonal regions and the circle of fifths.",
  },
  estimatedMinutes: 30,
  prerequisites: ["05-leccion-4"],
  videos: [],
  activeRules: [],
  tags: ["grados", "acordes por terceras", "armonías", "serie de armónicos", "regiones tonales", "tonalidad", "círculo de quintas"],
};
