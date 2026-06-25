import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "04-leccion-3",
  slug: "04-leccion-3",
  order: 4,
  lessonNumber: 3,
  module: "triadas-satb",

  title: {
    es: "Lección 3 — Escalas Menores",
    en: "Lesson 3 — Minor Scales",
  },
  description: {
    es: "Las 15 tonalidades menores: natural, armónica y melódica, en el orden del círculo de quintas.",
    en: "The 15 minor keys: natural, harmonic and melodic, in circle-of-fifths order.",
  },
  estimatedMinutes: 60,

  prerequisites: ["03-leccion-2"],

  videos: [
    {
      youtubeId: "FLfiLZGu7iY",
      embedUrl: "https://www.youtube.com/embed/FLfiLZGu7iY?si=IT5yCUbE93W5J13x",
      youtubeIdEn: "pibtQZk1rvM",
      embedUrlEn: "https://www.youtube.com/embed/pibtQZk1rvM?si=V1hnYkbf8_5YNEbZ",
      title: {
        es: "Escalas Menores — natural, armónica y melódica",
        en: "Minor Scales — natural, harmonic and melodic",
      },
    },
  ],

  activeRules: [],

  // Validado por minor-scale-validator (enrutado en lesson-configs como 'minor-scales').
  exercise: {
    type: "major-scales", // reusing type slot — validado por minor-scale-validator
    voiceCount: 1,
    voices: ["soprano"],
    keySignatures: [
      "Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "A#m",
      "Dm", "Gm", "Cm", "Fm", "Bbm", "Ebm", "Abm",
    ],
    chordTypes: [],
    inversions: [],
    minChords: 15,
    maxChords: 15,
    description: {
      es: "Toca las 15 tonalidades menores: por cada una, natural (8) + armónica (8) + melódica↑ (8) + melódica↓ (7) = 31 notas.",
      en: "Play all 15 minor keys: for each, natural (8) + harmonic (8) + melodic↑ (8) + melodic↓ (7) = 31 notes.",
    },
  },

  feedback: {
    "MINOR_COUNT": { es: "Se esperan exactamente 15 tonalidades menores.", en: "Exactly 15 minor keys are expected." },
    "MINOR_ORDER": { es: "Las tonalidades deben ir en el orden del círculo de quintas. Posición {measure}.", en: "Keys must follow circle-of-fifths order. Position {measure}." },
    "MINOR_NOTE_COUNT": { es: "Cada tonalidad debe tener 31 notas. Tonalidad {measure}.", en: "Each key must have 31 notes. Key {measure}." },
    "MINOR_WRONG_NOTE": { es: "Nota incorrecta en la tonalidad {measure}.", en: "Wrong note in key {measure}." },
    "MINOR_ENHARMONIC": { es: "Grafía enarmónica incorrecta en la tonalidad {measure}. Cada grado usa su propia letra.", en: "Wrong enharmonic spelling in key {measure}. Each degree uses its own letter." },
    "MINOR_DIRECTION": { es: "Dirección incorrecta en la tonalidad {measure}.", en: "Wrong direction in key {measure}." },
  },

  tags: ["escalas", "menores", "natural", "armónica", "melódica", "círculo de quintas"],
};
