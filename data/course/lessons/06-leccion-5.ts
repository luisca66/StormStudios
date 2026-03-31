import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "06-leccion-5",
  slug: "06-leccion-5",
  order: 6,
  module: "triadas-satb",

  title: {
    es: "Lección 5 — Segunda Inversión y Cadencia ⁶₄",
    en: "Lesson 5 — Second Inversion and the ⁶₄ Cadence",
  },
  description: {
    es: "Acordes en segunda inversión: usos restringidos (cadencial, de paso, de bordadura). La cadencia ⁶₄ de dominante como clímax armónico.",
    en: "Chords in second inversion: restricted uses (cadential, passing, pedal). The dominant ⁶₄ cadence as harmonic climax.",
  },
  estimatedMinutes: 90,

  prerequisites: ["05-leccion-4"],

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
    "first-inversion-doubling",
    "cadence-satb",
    // Nota: segunda inversión se valida contextualmente — se agrega en Fase 5
  ],

  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    keySignatures: ["C", "G", "F", "D", "Bb"],
    chordTypes: ["major", "minor"],
    inversions: ["root", "first", "second"],
    minChords: 6,
    maxChords: 10,
    description: {
      es: "Escribe un coral que incluya la cadencia I⁶₄-V-I al final. Puede incluir acordes en todas las posiciones.",
      en: "Write a chorale that includes the I⁶₄-V-I cadence at the end. May include chords in all positions.",
    },
  },

  feedback: {
    "cadence-satb": {
      es: "Asegúrate de incluir la cadencia I⁶₄-V-I al final del ejercicio.",
      en: "Make sure to include the I⁶₄-V-I cadence at the end of the exercise.",
    },
  },

  tags: ["segunda inversión", "cadencia ⁶₄", "coral completo"],
};
