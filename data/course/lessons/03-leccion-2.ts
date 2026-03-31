import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "03-leccion-2",
  slug: "03-leccion-2",
  order: 3,
  lessonNumber: 2,
  module: "triadas-satb",

  title: {
    es: "Lección 2 — Escalas Menores",
    en: "Lesson 2 — Minor Scales",
  },
  description: {
    es: "Las 15 tonalidades menores en el orden del círculo de quintas. Natural, armónica y melódica para cada tonalidad.",
    en: "The 15 minor keys in circle-of-fifths order. Natural, harmonic and melodic for each key.",
  },
  estimatedMinutes: 60,

  prerequisites: ["02-leccion-1"],

  videos: [
    {
      youtubeId: "Yq4CVkp_dzE",
      youtubeIdEn: "UdQt0vl7ftA",
      title: { es: "Escalas menores y círculo de quintas", en: "Minor scales and circle of fifths" },
    },
  ],

  activeRules: [],

  exercise: {
    type: "major-scales", // reusing type slot — validated by minor-scale-validator
    voiceCount: 1,
    voices: ["soprano"],
    keySignatures: [
      "Am","Em","Bm","F#m","C#m","G#m","D#m","A#m",
      "Dm","Gm","Cm","Fm","Bbm","Ebm","Abm",
    ],
    chordTypes: [],
    inversions: [],
    minChords: 15,
    maxChords: 15,
    description: {
      es: "Toca las 15 tonalidades menores en el secuenciador: quintas ascendentes (Am·Em·Bm·F#m·C#m·G#m·D#m·A#m) y quintas descendentes (Dm·Gm·Cm·Fm·Bbm·Ebm·Abm). Por cada tonalidad: natural (8 notas) + armónica (8) + melódica ascendente (8) + melódica descendente (7) = 31 notas. Exporta el MIDI y súbelo aquí.",
      en: "Play all 15 minor keys in the sequencer: ascending fifths (Am·Em·Bm·F#m·C#m·G#m·D#m·A#m) then descending fifths (Dm·Gm·Cm·Fm·Bbm·Ebm·Abm). For each key: natural (8 notes) + harmonic (8) + melodic ascending (8) + melodic descending (7) = 31 notes. Export the MIDI and upload it here.",
    },
  },

  feedback: {
    "MINOR_MISSING_KEYSIG": {
      es: "El archivo MIDI no contiene información de tonalidad. Exporta desde el secuenciador Storm Studios.",
      en: "The MIDI file contains no key signature info. Export from the Storm Studios sequencer.",
    },
    "MINOR_COUNT": {
      es: "Se esperan exactamente 15 tonalidades menores.",
      en: "Exactly 15 minor keys are expected.",
    },
    "MINOR_ORDER": {
      es: "Las tonalidades deben ir en el orden del círculo de quintas. Posición {measure}.",
      en: "Keys must follow circle-of-fifths order. Position {measure}.",
    },
    "MINOR_NOTE_COUNT": {
      es: "Cada tonalidad debe tener 31 notas: natural(8)+armónica(8)+melódica↑(8)+melódica↓(7). Tonalidad {measure}.",
      en: "Each key must have 31 notes: natural(8)+harmonic(8)+melodic↑(8)+melodic↓(7). Key {measure}.",
    },
    "MINOR_WRONG_NOTE": {
      es: "Nota incorrecta en la tonalidad {measure}. Revisa la armadura y las alteraciones.",
      en: "Wrong note in key {measure}. Check the key signature and accidentals.",
    },
    "MINOR_DIRECTION": {
      es: "Dirección incorrecta en la tonalidad {measure}. Natural, armónica y melódica↑ ascienden; melódica↓ desciende.",
      en: "Wrong direction in key {measure}. Natural, harmonic and melodic↑ ascend; melodic↓ descends.",
    },
  },

  tags: ["escalas", "menores", "natural", "armónica", "melódica", "círculo de quintas"],
};
