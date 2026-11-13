export interface Word {
  id: number;
  word: string;
  category: string;
  definition: string;
  distractor1: string;
  distractor2: string;
  distractor3: string;
  rootsDisplay: string;
  etymologyText: string;
  originNote: string;
  funFact: string;
  unlocked: boolean;
  answeredCorrectly: boolean | null;
}

export interface Category {
  id: string;
  displayName: string;
  description: string;
  order: number;
}

export interface UserProgress {
  id: number;
  totalScore: number;
  currentStreak: number;
  maxStreak: number;
  wordsAttempted: number;
  wordsCorrect: number;
  lastPlayedDate: string | null;
}

export interface WordUserState {
  unlocked: boolean;
  answeredCorrectly: boolean | null;
}

export type WordStateMap = Record<number, WordUserState>;

export interface CategoryState {
  category: Category;
  correctCount: number;
  totalCount: number;
  attemptedCount: number;
  isUnlocked: boolean;
}

export interface GameState {
  currentCategoryId: string | null;
  currentWord: Word | null;
  options: string[];
  selectedOption: string | null;
  isCorrect: boolean | null;
  pointsEarned: number;
  showingResult: boolean;
  sessionStreak: number;
  sessionScore: number;
  wordsRemaining: number;
  categoryComplete: boolean;
}

export interface StatsState {
  totalCorrect: number;
  totalAttempted: number;
  maxStreak: number;
  currentStreak: number;
  totalScore: number;
  mostPlayedCategory: string | null;
  accuracyPercent: number;
}

export type Route =
  | { name: "home" }
  | { name: "categories" }
  | { name: "game"; categoryId: string }
  | { name: "card"; wordId: number }
  | { name: "collection" }
  | { name: "stats" };
