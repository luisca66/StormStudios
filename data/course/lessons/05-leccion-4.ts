import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "05-leccion-4",
  slug: "05-leccion-4",
  order: 5,
  module: "triadas-satb",

  title: {
    es: "Lección 4 — Primera Inversión",
    en: "Lesson 4 — First Inversion",
  },
  description: {
    es: "Acordes en primera inversión (acorde de sexta): duplicación, usos idiomáticos y cadencia ⁶₄ de dominante.",
    en: "Chords in first inversion (sixth chord): doubling, idiomatic uses, and the dominant ⁶₄ cadence.",
  },
  estimatedMinutes: 75,

  prerequisites: ["04-leccion-3"],

  videos: [
    // TODO: agregar youtubeId
  ],

  activeRules: [
    "voice-range-satb",
    "voice-crossing",
    "voice-overlap",
    "no-parallel-fifths",
    "no-parallel-octaves",
    "no-hidden-fifths",
    "contrary-motion-preferred",
    "stepwise-motion-preference",
    "root-position-doubling",
    "common-tone-retention",
    "leading-tone-resolution",
    "first-inversion-doubling", // NUEVA
    "cadence-satb",             // NUEVA
  ],

  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    keySignatures: ["C", "G", "F", "D"],
    chordTypes: ["major", "minor"],
    inversions: ["root", "first"],
    minChords: 4,
    maxChords: 8,
    description: {
      es: "Escribe progresiones que incluyan acordes en primera inversión. Termina con cadencia auténtica perfecta.",
      en: "Write progressions that include first inversion chords. End with a perfect authentic cadence.",
    },
  },

  feedback: {
    "first-inversion-doubling": {
      es: "En primera inversión evita duplicar la tercera del acorde (salvo que sea la sensible). Compás {measure}.",
      en: "In first inversion, avoid doubling the third of the chord (unless it is the leading tone). Measure {measure}.",
    },
    "cadence-satb": {
      es: "La cadencia auténtica perfecta requiere V→I con fundamental en soprano y bajo. Revisa el final.",
      en: "The perfect authentic cadence requires V→I with the root in soprano and bass. Check the ending.",
    },
  },

  tags: ["primera inversión", "acorde de sexta", "cadencia"],
};
