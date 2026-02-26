import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "03-leccion-2",
  slug: "03-leccion-2",
  order: 3,
  module: "triadas-satb",

  title: {
    es: "Lección 2 — Conducción de Voces",
    en: "Lesson 2 — Voice Leading",
  },
  description: {
    es: "Movimiento contrario, paralelo y oblicuo. Superposición de voces. Introducción a la conducción melódica de las voces internas.",
    en: "Contrary, parallel and oblique motion. Voice overlap. Introduction to melodic voice leading of inner voices.",
  },
  estimatedMinutes: 60,

  prerequisites: ["02-leccion-1"],

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
  ],

  exercise: {
    type: "four-voice-chorale",
    voiceCount: 4,
    voices: ["soprano", "alto", "tenor", "bass"],
    keySignatures: ["C", "G"],
    chordTypes: ["major", "minor"],
    inversions: ["root"],
    minChords: 4,
    maxChords: 6,
    description: {
      es: "Escribe un coral a 4 voces en Do Mayor o Sol Mayor aplicando conducción de voces correcta.",
      en: "Write a 4-voice chorale in C Major or G Major applying correct voice leading.",
    },
  },

  feedback: {
    "voice-overlap": {
      es: "Superposición de voces en el compás {measure}. Una voz sobrepasó la nota que tenía la voz superior en el acorde anterior.",
      en: "Voice overlap in measure {measure}. A voice exceeded the note the upper voice had in the previous chord.",
    },
    "no-hidden-fifths": {
      es: "Quintas ocultas en soprano y bajo, compás {measure}. El soprano y el bajo no deben alcanzar una quinta por movimiento directo.",
      en: "Hidden fifths in soprano and bass, measure {measure}. Soprano and bass should not reach a fifth by direct motion.",
    },
    "contrary-motion-preferred": {
      es: "Las voces se mueven casi siempre en paralelo, compás {measure}. Busca más movimiento contrario u oblicuo.",
      en: "Voices move almost always in parallel, measure {measure}. Look for more contrary or oblique motion.",
    },
  },

  tags: ["conducción de voces", "movimiento contrario", "superposición"],
};
