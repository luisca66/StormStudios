import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "02-leccion-1",
  slug: "02-leccion-1",
  order: 2,
  module: "triadas-satb",

  title: {
    es: "Lección 1 — Escritura Coral a 4 Voces",
    en: "Lesson 1 — Four-Voice Chorale Writing",
  },
  description: {
    es: "Introducción al coral SATB: rangos vocales, cruzamiento de voces y disposición de acordes.",
    en: "Introduction to SATB chorale: voice ranges, voice crossing, and chord voicing.",
  },
  estimatedMinutes: 60,

  prerequisites: ["01-propedeutico"],

  videos: [
    {
      youtubeId: "QZ_D8zNQ3Nk",
      title: { es: "Escala mayor y círculo de quintas", en: "Major scale and circle of fifths" },
    },
  ],

  activeRules: [
    "voice-range-satb",
    "voice-crossing",
    "no-parallel-fifths",
    "no-parallel-octaves",
  ],

  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    keySignatures: ["C"],
    chordTypes: ["major", "minor"],
    inversions: ["root"],
    minChords: 4,
    maxChords: 4,
    description: {
      es: "Escribe un coral a 4 voces en Do Mayor con 4 acordes en estado fundamental.",
      en: "Write a 4-voice chorale in C Major with 4 chords in root position.",
    },
  },

  feedback: {
    "voice-range-satb": {
      es: "Una o más voces están fuera de rango. Soprano: Do4-Sol5 / Alto: Sol3-Do5 / Tenor: Do3-Sol4 / Bajo: Mi2-Do4. Compás {measure}.",
      en: "One or more voices are out of range. Soprano: C4-G5 / Alto: G3-C5 / Tenor: C3-G4 / Bass: E2-C4. Measure {measure}.",
    },
    "voice-crossing": {
      es: "Las voces no deben cruzarse. Verifica que soprano > alto > tenor > bajo en el compás {measure}.",
      en: "Voices must not cross. Verify that soprano > alto > tenor > bass in measure {measure}.",
    },
    "no-parallel-fifths": {
      es: "Quintas paralelas entre {voices} en el compás {measure}. Evita que dos voces se muevan en quintas justas paralelas.",
      en: "Parallel fifths between {voices} in measure {measure}. Avoid two voices moving in parallel perfect fifths.",
    },
    "no-parallel-octaves": {
      es: "Octavas paralelas entre {voices} en el compás {measure}.",
      en: "Parallel octaves between {voices} in measure {measure}.",
    },
  },

  tags: ["SATB", "coral", "rangos vocales", "quintas paralelas"],
};
