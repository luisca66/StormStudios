export type Clef = "treble" | "bass";

export type NoteName = "C" | "D" | "E" | "F" | "G" | "A" | "B";

export type NotationMode = "latin" | "english";

export interface Pitch {
  note: NoteName;
  octave: number;
}

export interface ExerciseNote {
  pitch: Pitch;
  answer: NoteName;
}

export interface Exercise {
  id: string;
  levelId: number;
  clef: Clef;
  notes: ExerciseNote[];
}

export interface NotesPerExerciseRange {
  min: number;
  max: number;
}

export type NotesPerExercise = number | NotesPerExerciseRange;

export interface MusicReadingLevel {
  id: number;
  title: string;
  description: string;
  clefs: Clef[];
  allowedNotes: NoteName[];
  pitchesByClef?: Partial<Record<Clef, Pitch[]>>;
  notesPerExercise: NotesPerExercise;
  roundLength: number;
  passingAccuracy: number;
  maxAverageResponseMs?: number;
}

export interface SessionStats {
  correct: number;
  incorrect: number;
  currentStreak: number;
  bestStreak: number;
  totalResponseMs: number;
  answeredNotes: number;
}

export interface RoundSummary {
  levelId: number;
  levelTitle: string;
  correct: number;
  incorrect: number;
  accuracy: number;
  averageResponseMs: number;
  bestStreak: number;
  passed: boolean;
  nextLevelId: number;
}

export interface ClefProgress {
  attempted: number;
  correct: number;
}

export interface MusicReadingProgress {
  currentLevelId: number;
  bestLevelId: number;
  totalCorrect: number;
  totalIncorrect: number;
  bestStreak: number;
  completedRounds: number;
  notationMode: NotationMode;
  clefs: Record<Clef, ClefProgress>;
  updatedAt: string;
}
