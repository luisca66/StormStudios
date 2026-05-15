import type { MusicReadingLevel, Pitch } from "./types";

const TREBLE_ANCHOR_PITCHES: Pitch[] = [
  { note: "C", octave: 4 },
  { note: "G", octave: 4 },
  { note: "C", octave: 5 },
  { note: "G", octave: 5 },
];

const BASS_ANCHOR_PITCHES: Pitch[] = [
  { note: "F", octave: 2 },
  { note: "C", octave: 3 },
  { note: "F", octave: 3 },
  { note: "C", octave: 4 },
];

const TREBLE_NEARBY_PITCHES: Pitch[] = [
  { note: "B", octave: 3 },
  { note: "C", octave: 4 },
  { note: "D", octave: 4 },
  { note: "F", octave: 4 },
  { note: "G", octave: 4 },
  { note: "A", octave: 4 },
  { note: "B", octave: 4 },
  { note: "C", octave: 5 },
  { note: "D", octave: 5 },
  { note: "F", octave: 5 },
  { note: "G", octave: 5 },
  { note: "A", octave: 5 },
];

const BASS_NEARBY_PITCHES: Pitch[] = [
  { note: "E", octave: 2 },
  { note: "F", octave: 2 },
  { note: "G", octave: 2 },
  { note: "B", octave: 2 },
  { note: "C", octave: 3 },
  { note: "D", octave: 3 },
  { note: "E", octave: 3 },
  { note: "F", octave: 3 },
  { note: "G", octave: 3 },
  { note: "B", octave: 3 },
  { note: "C", octave: 4 },
  { note: "D", octave: 4 },
];

const TREBLE_THIRD_PITCHES: Pitch[] = [
  { note: "A", octave: 3 },
  { note: "C", octave: 4 },
  { note: "E", octave: 4 },
  { note: "G", octave: 4 },
  { note: "B", octave: 4 },
  { note: "A", octave: 4 },
  { note: "C", octave: 5 },
  { note: "E", octave: 5 },
  { note: "G", octave: 5 },
  { note: "B", octave: 5 },
];

const BASS_THIRD_PITCHES: Pitch[] = [
  { note: "D", octave: 2 },
  { note: "F", octave: 2 },
  { note: "A", octave: 2 },
  { note: "C", octave: 3 },
  { note: "E", octave: 3 },
  { note: "D", octave: 3 },
  { note: "F", octave: 3 },
  { note: "A", octave: 3 },
  { note: "C", octave: 4 },
  { note: "E", octave: 4 },
];

const TREBLE_FULL_RANGE_PITCHES: Pitch[] = [
  { note: "G", octave: 3 },
  { note: "G", octave: 4 },
  { note: "A", octave: 4 },
  { note: "B", octave: 4 },
  { note: "C", octave: 5 },
  { note: "D", octave: 5 },
  { note: "E", octave: 5 },
  { note: "F", octave: 5 },
  { note: "C", octave: 6 },
];

const BASS_FULL_RANGE_PITCHES: Pitch[] = [
  { note: "C", octave: 2 },
  { note: "B", octave: 2 },
  { note: "C", octave: 3 },
  { note: "D", octave: 3 },
  { note: "E", octave: 3 },
  { note: "F", octave: 3 },
  { note: "G", octave: 3 },
  { note: "A", octave: 3 },
  { note: "F", octave: 4 },
];

export const MUSIC_READING_LEVELS: MusicReadingLevel[] = [
  {
    id: 1,
    title: "Anclas en clave de sol",
    description: "Do y Sol como referencias iniciales.",
    clefs: ["treble"],
    allowedNotes: ["C", "G"],
    pitchesByClef: {
      treble: TREBLE_ANCHOR_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.8,
  },
  {
    id: 2,
    title: "Anclas en clave de fa",
    description: "Fa y Do como referencias iniciales.",
    clefs: ["bass"],
    allowedNotes: ["F", "C"],
    pitchesByClef: {
      bass: BASS_ANCHOR_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.8,
  },
  {
    id: 3,
    title: "Anclas mixtas",
    description: "Do-Sol y Fa-Do alternando clave de sol y clave de fa.",
    clefs: ["treble", "bass"],
    allowedNotes: ["C", "F", "G"],
    pitchesByClef: {
      treble: TREBLE_ANCHOR_PITCHES,
      bass: BASS_ANCHOR_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.8,
  },
  {
    id: 4,
    title: "Vecinas cercanas en clave de sol",
    description: "Segundas ascendentes y descendentes de Do y Sol.",
    clefs: ["treble"],
    allowedNotes: ["B", "C", "D", "F", "G", "A"],
    pitchesByClef: {
      treble: TREBLE_NEARBY_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.8,
  },
  {
    id: 5,
    title: "Vecinas cercanas en clave de fa",
    description: "Segundas ascendentes y descendentes de Fa y Do.",
    clefs: ["bass"],
    allowedNotes: ["E", "F", "G", "B", "C", "D"],
    pitchesByClef: {
      bass: BASS_NEARBY_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.8,
  },
  {
    id: 6,
    title: "Terceras en clave de sol",
    description: "Terceras ascendentes y descendentes de Do y Sol.",
    clefs: ["treble"],
    allowedNotes: ["A", "C", "E", "G", "B"],
    pitchesByClef: {
      treble: TREBLE_THIRD_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.85,
  },
  {
    id: 7,
    title: "Terceras en clave de fa",
    description: "Terceras ascendentes y descendentes de Fa y Do.",
    clefs: ["bass"],
    allowedNotes: ["D", "F", "A", "C", "E"],
    pitchesByClef: {
      bass: BASS_THIRD_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.85,
  },
  {
    id: 8,
    title: "Rango natural completo",
    description: "Do a Si en ambas claves.",
    clefs: ["treble", "bass"],
    allowedNotes: ["C", "D", "E", "F", "G", "A", "B"],
    pitchesByClef: {
      treble: TREBLE_FULL_RANGE_PITCHES,
      bass: BASS_FULL_RANGE_PITCHES,
    },
    notesPerExercise: 1,
    roundLength: 20,
    passingAccuracy: 0.85,
  },
  {
    id: 9,
    title: "Dos notas por ejercicio",
    description: "Secuencias de dos notas naturales.",
    clefs: ["treble", "bass"],
    allowedNotes: ["C", "D", "E", "F", "G", "A", "B"],
    notesPerExercise: 2,
    roundLength: 20,
    passingAccuracy: 0.85,
  },
  {
    id: 10,
    title: "Tres notas por ejercicio",
    description: "Secuencias de tres notas naturales.",
    clefs: ["treble", "bass"],
    allowedNotes: ["C", "D", "E", "F", "G", "A", "B"],
    notesPerExercise: 3,
    roundLength: 20,
    passingAccuracy: 0.85,
  },
  {
    id: 11,
    title: "Cuatro notas por ejercicio",
    description: "Secuencias de cuatro notas naturales.",
    clefs: ["treble", "bass"],
    allowedNotes: ["C", "D", "E", "F", "G", "A", "B"],
    notesPerExercise: 4,
    roundLength: 20,
    passingAccuracy: 0.85,
  },
  {
    id: 12,
    title: "Aleatorio natural",
    description: "Práctica general con una a cuatro notas naturales.",
    clefs: ["treble", "bass"],
    allowedNotes: ["C", "D", "E", "F", "G", "A", "B"],
    notesPerExercise: { min: 1, max: 4 },
    roundLength: 20,
    passingAccuracy: 0.9,
  },
];

export const MAX_LEVEL_ID =
  MUSIC_READING_LEVELS[MUSIC_READING_LEVELS.length - 1].id;

export function getLevelById(levelId: number): MusicReadingLevel {
  const level = MUSIC_READING_LEVELS.find((item) => item.id === levelId);

  if (!level) {
    throw new Error(`Music reading level ${levelId} does not exist.`);
  }

  return level;
}
