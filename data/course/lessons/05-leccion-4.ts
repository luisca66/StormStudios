import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "05-leccion-4",
  slug: "05-leccion-4",
  order: 5,
  lessonNumber: 4,
  module: "triadas-satb",
  status: "published",

  title: {
    es: "Lección 4 — Acordes de 5a",
    en: "Lesson 4 — Triads (Fifth Chords)",
  },
  description: {
    es: "Las tríadas (acordes de 5a): mayor, menor, disminuida y aumentada, sobre cada grado de las escalas básicas.",
    en: "Triads (fifth chords): major, minor, diminished and augmented, built on each degree of the basic scales.",
  },
  estimatedMinutes: 75,

  prerequisites: ["04-leccion-3"],

  videos: [
    {
      youtubeId: "omBSeuK90e4",
      embedUrl: "https://www.youtube.com/embed/omBSeuK90e4?si=tWB-Kv3ctWQF3Gjg",
      youtubeIdEn: "2RaP6z9cRlE",
      embedUrlEn: "https://www.youtube.com/embed/2RaP6z9cRlE?si=yZCikMhV8qElFqpj",
      title: { es: "Acordes de 5a", en: "Triads (Fifth Chords)" },
    },
  ],

  // Las reglas se aplican en el validador de tríadas, no en el motor SATB.
  activeRules: [],

  exercise: {
    type: "triads",
    voiceCount: 3,
    voices: ["soprano", "alto", "tenor"],
    keySignatures: ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"],
    chordTypes: ["major", "minor", "diminished", "augmented"],
    inversions: ["root"],
    minChords: 564,
    maxChords: 576,
    description: {
      es: "Un solo MIDI con las 12 tónicas y las seis variantes. El Maestro reconoce las series en cualquier orden, señala cuáles faltan y explica los errores. Acordes en estado fundamental, sin inversiones. En modo cuarteto, usa Tenor para la fundamental, Alto para la tercera y Soprano para la quinta; deja Bajo vacío.",
      en: "One MIDI with all 12 tonics and six variants. The Teacher recognizes series in any order, names missing ones and explains errors. Root-position chords only, without inversions. In quartet mode, use Tenor for the root, Alto for the third and Soprano for the fifth; leave Bass empty.",
    },
  },

  tags: ["tríadas", "acordes de quinta", "escalas", "mayor", "menor", "disminuido", "aumentado"],
};
