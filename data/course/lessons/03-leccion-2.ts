import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "03-leccion-2",
  slug: "03-leccion-2",
  order: 3,
  lessonNumber: 2,
  module: "triadas-satb",

  title: {
    es: "Lección 2 — Modos",
    en: "Lesson 2 — Modes",
  },
  description: {
    es: "Los 7 modos de la escala mayor (jónico, dórico, frigio, lidio, mixolidio, eólico y locrio) presentados como modos paralelos desde una misma tónica.",
    en: "The 7 modes of the major scale (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian and Locrian) presented as parallel modes from a single tonic.",
  },
  estimatedMinutes: 50,

  prerequisites: ["02-leccion-1"],

  videos: [
    {
      youtubeId: "2tCzUjsRiJU",
      embedUrl: "https://www.youtube.com/embed/2tCzUjsRiJU?si=Tl31ax2-4K8krcnu",
      youtubeIdEn: "aiNZlkNWL1w",
      embedUrlEn: "https://www.youtube.com/embed/aiNZlkNWL1w?si=4JV5r626Bi_XLWKN",
      title: { es: "Modos — los 7 modos de la escala mayor", en: "Modes — the 7 modes of the major scale" },
    },
  ],

  activeRules: [],

  exercise: {
    type: "modes",
    voiceCount: 1,
    voices: ["soprano"],
    keySignatures: [], // tónica libre: el alumno elige cualquier nota
    chordTypes: [],
    inversions: [],
    minChords: 7,
    maxChords: 7,
    description: {
      es: "Elige una tónica (cualquier nota) y toca los 7 modos paralelos desde ella, en orden: jónico · dórico · frigio · lidio · mixolidio · eólico · locrio. Cada modo va de tónica a tónica, ascendente (8 notas). 56 notas en total, 1 canal (Soprano). Exporta el MIDI y súbelo aquí.",
      en: "Pick a tonic (any note) and play the 7 parallel modes from it, in order: Ionian · Dorian · Phrygian · Lydian · Mixolydian · Aeolian · Locrian. Each mode goes tonic to tonic, ascending (8 notes). 56 notes total, 1 channel (Soprano). Export the MIDI and upload it here.",
    },
  },

  feedback: {
    "MODE_COUNT": {
      es: "Se esperan 56 notas: 7 modos de 8 notas cada uno.",
      en: "Exactly 56 notes are expected: 7 modes of 8 notes each.",
    },
    "MODE_WRONG_TONIC": {
      es: "Todos los modos parten de la misma tónica. Modo {measure}.",
      en: "All modes start from the same tonic. Mode {measure}.",
    },
    "MODE_ORDER": {
      es: "Los modos deben ir en orden: jónico · dórico · frigio · lidio · mixolidio · eólico · locrio. Posición {measure}.",
      en: "Modes must follow the order: Ionian · Dorian · Phrygian · Lydian · Mixolydian · Aeolian · Locrian. Position {measure}.",
    },
    "MODE_WRONG_NOTE": {
      es: "Nota incorrecta en el modo {measure}. Revisa las alteraciones del modo.",
      en: "Wrong note in mode {measure}. Check the mode's accidentals.",
    },
    "MODE_ENHARMONIC": {
      es: "Grafía enarmónica incorrecta en el modo {measure}. Cada grado usa su propia letra.",
      en: "Wrong enharmonic spelling in mode {measure}. Each degree uses its own letter.",
    },
    "MODE_DIRECTION": {
      es: "Cada modo debe tocarse ascendente. Modo {measure}.",
      en: "Each mode must be played ascending. Mode {measure}.",
    },
    "MODE_TONIC_CLOSURE": {
      es: "Cada modo debe cerrar en la tónica una octava arriba. Modo {measure}.",
      en: "Each mode must close on the tonic one octave higher. Mode {measure}.",
    },
  },

  tags: ["modos", "jónico", "dórico", "frigio", "lidio", "mixolidio", "eólico", "locrio"],
};
