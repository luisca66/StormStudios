export type GameMode = "classic" | "timeAttack" | "survival";

export type ScreenName = "menu" | "selection" | "training" | "stats";

export type FeedbackKind = "none" | "info" | "correct" | "incorrect";

export interface InstrumentSpec {
  displayName: string;
  folderName: string;
}

export interface NoteSample {
  instrument: string;
  noteName: string;
  filePath: string;
}

export interface NoteStat {
  correct: number;
  total: number;
}

export interface FeedbackState {
  kind: FeedbackKind;
  text: string;
}
