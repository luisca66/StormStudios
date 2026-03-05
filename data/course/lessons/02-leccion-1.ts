import type { LessonConfig } from "@/types/course";

export const lesson: LessonConfig = {
  id: "02-leccion-1",
  slug: "02-leccion-1",
  order: 2,
  lessonNumber: 1,
  module: "triadas-satb",

  title: {
    es: "Lección 1 — Escalas Mayores",
    en: "Lesson 1 — Major Scales",
  },
  description: {
    es: "Las 15 escalas mayores en el orden del círculo de quintas: sostenidos ascendentes (Do→Do#) y bemoles descendentes (Fa→Dob).",
    en: "The 15 major scales in circle-of-fifths order: ascending sharps (C→C#) and descending flats (F→Cb).",
  },
  estimatedMinutes: 45,

  prerequisites: ["01-propedeutico"],

  videos: [
    {
      youtubeId: "QZ_D8zNQ3Nk",
      youtubeIdEn: "qoufWT7UCiI",
      title: { es: "Escala mayor y círculo de quintas", en: "Major scale and circle of fifths" },
    },
  ],

  activeRules: [],

  exercise: {
    type: "major-scales",
    voiceCount: 1,
    voices: ["soprano"],
    keySignatures: [
      "C","G","D","A","E","B","F#","C#",
      "F","Bb","Eb","Ab","Db","Gb","Cb",
    ],
    chordTypes: [],
    inversions: [],
    minChords: 15,
    maxChords: 15,
    description: {
      es: "Toca las 15 escalas mayores en el secuenciador: primero sostenidos (Do·Sol·Re·La·Mi·Si·Fa#·Do#) y luego bemoles (Fa·Sib·Mib·Lab·Reb·Solb·Dob). Cada escala de tónica a tónica (8 notas). Exporta el MIDI y súbelo aquí.",
      en: "Play all 15 major scales in the sequencer: sharps first (C·G·D·A·E·B·F#·C#) then flats (F·Bb·Eb·Ab·Db·Gb·Cb). Each scale tonic to tonic (8 notes). Export the MIDI and upload it here.",
    },
  },

  feedback: {
    "SCALE_MISSING_KEYSIG": {
      es: "El archivo MIDI no contiene información de tonalidad. Exporta desde el secuenciador Storm Studios.",
      en: "The MIDI file contains no key signature info. Export from the Storm Studios sequencer.",
    },
    "SCALE_COUNT": {
      es: "Se esperan exactamente 15 escalas (una por tonalidad).",
      en: "Exactly 15 scales are expected (one per key).",
    },
    "SCALE_ORDER": {
      es: "Las escalas deben ir en el orden del círculo de quintas. Posición {measure}.",
      en: "Scales must follow circle-of-fifths order. Position {measure}.",
    },
    "SCALE_NOTE_COUNT": {
      es: "Cada escala debe tener exactamente 8 notas (I→I′). Escala {measure}.",
      en: "Each scale must have exactly 8 notes (I→I′). Scale {measure}.",
    },
    "SCALE_WRONG_NOTE": {
      es: "Nota incorrecta en la escala {measure}. Revisa la armadura.",
      en: "Wrong note in scale {measure}. Check the key signature.",
    },
    "SCALE_DIRECTION": {
      es: "La escala debe tocarse de forma ascendente. Escala {measure}.",
      en: "The scale must be played ascending. Scale {measure}.",
    },
    "SCALE_TONIC_CLOSURE": {
      es: "La escala no termina en la tónica correcta. Escala {measure}.",
      en: "The scale does not close on the correct tonic. Scale {measure}.",
    },
  },

  tags: ["escalas", "mayores", "círculo de quintas", "sostenidos", "bemoles"],
};
