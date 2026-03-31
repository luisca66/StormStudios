import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "04-leccion-3",
  slug: "04-leccion-3",
  order: 4,
  module: "triadas-satb",

  title: {
    es: "Lección 3 — Tríadas en Estado Fundamental",
    en: "Lesson 3 — Root Position Triads",
  },
  description: {
    es: "Enlace de acordes en estado fundamental: duplicación de la fundamental, retención de nota común, resolución de la sensible.",
    en: "Linking chords in root position: root doubling, common tone retention, leading tone resolution.",
  },
  estimatedMinutes: 75,

  prerequisites: ["03-leccion-2"],

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
    "root-position-doubling",   // NUEVA
    "common-tone-retention",    // NUEVA
    "leading-tone-resolution",  // NUEVA
  ],

  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    keySignatures: ["C", "G", "F"],
    chordTypes: ["major", "minor"],
    inversions: ["root"],
    minChords: 4,
    maxChords: 8,
    description: {
      es: "Realiza progresiones I-IV-V-I en estado fundamental en 3 tonalidades diferentes.",
      en: "Write I-IV-V-I progressions in root position in 3 different keys.",
    },
  },

  feedback: {
    "root-position-doubling": {
      es: "En estado fundamental, duplica la fundamental del acorde. Revisa el compás {measure}.",
      en: "In root position, double the root of the chord. Check measure {measure}.",
    },
    "common-tone-retention": {
      es: "Cuando dos acordes comparten una nota, mantenla en la misma voz. Compás {measure}.",
      en: "When two chords share a note, keep it in the same voice. Measure {measure}.",
    },
    "leading-tone-resolution": {
      es: "La sensible debe resolver hacia la tónica en la cadencia. Compás {measure}.",
      en: "The leading tone must resolve to the tonic at the cadence. Measure {measure}.",
    },
  },

  tags: ["estado fundamental", "duplicación", "nota común", "sensible"],
};
