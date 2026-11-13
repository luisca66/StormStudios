import wordsJson from "./data/words.json";
import categoriesJson from "./data/categories.json";
import type {
  Category,
  CategoryState,
  GameState,
  StatsState,
  UserProgress,
  Word,
  WordStateMap,
} from "./types";
import { createBrowserStorage, type StorageAdapter } from "./storage";

export const ALL_WORDS: readonly Word[] = wordsJson as Word[];
export const ALL_CATEGORIES: readonly Category[] = [...(categoriesJson as Category[])].sort(
  (a, b) => a.order - b.order
);

export const UNLOCK_REQUIRED_CORRECT = 7;

export function shuffleArray<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function shuffleWordOptions(word: Word, rng: () => number = Math.random): string[] {
  return shuffleArray(
    [word.definition, word.distractor1, word.distractor2, word.distractor3],
    rng
  );
}

export function calculatePointsForAnswer(
  correct: boolean,
  previousStreak: number,
  bonusPoints = 0
): { pointsEarned: number; newStreak: number } {
  if (!correct) {
    return { pointsEarned: bonusPoints, newStreak: 0 };
  }
  const newStreak = previousStreak + 1;
  const basePoints = newStreak >= 3 ? 15 : 10;
  return {
    pointsEarned: basePoints + bonusPoints,
    newStreak,
  };
}

export function hydrateWords(
  baseWords: readonly Word[],
  stateMap: WordStateMap
): Word[] {
  return baseWords.map((w) => {
    const state = stateMap[w.id];
    if (!state) return { ...w };
    return {
      ...w,
      unlocked: state.unlocked,
      answeredCorrectly: state.answeredCorrectly,
    };
  });
}

export class GameEngine {
  private storage: StorageAdapter;
  private rng: () => number;
  private baseWords: readonly Word[];
  private categories: readonly Category[];
  private pendingWords: Word[] = [];
  private gameState: GameState = {
    currentCategoryId: null,
    currentWord: null,
    options: [],
    selectedOption: null,
    isCorrect: null,
    pointsEarned: 0,
    showingResult: false,
    sessionStreak: 0,
    sessionScore: 0,
    wordsRemaining: 0,
    categoryComplete: false,
  };

  constructor(
    storage: StorageAdapter = createBrowserStorage(),
    rng: () => number = Math.random,
    baseWords: readonly Word[] = ALL_WORDS,
    categories: readonly Category[] = ALL_CATEGORIES
  ) {
    this.storage = storage;
    this.rng = rng;
    this.baseWords = baseWords;
    this.categories = [...categories].sort((a, b) => a.order - b.order);
  }

  getAllWords(): Word[] {
    return hydrateWords(this.baseWords, this.storage.loadWordStates());
  }

  getOrderedCategories(): Category[] {
    return [...this.categories];
  }

  getCategoryById(id: string): Category | undefined {
    return this.categories.find((c) => c.id === id);
  }

  getWordById(id: number): Word | undefined {
    return this.getAllWords().find((w) => w.id === id);
  }

  getWordsByCategory(categoryId: string): Word[] {
    return this.getAllWords()
      .filter((w) => w.category === categoryId)
      .sort((a, b) => a.id - b.id);
  }

  getUnlockedWords(): Word[] {
    return this.getAllWords()
      .filter((w) => w.unlocked)
      .sort((a, b) => a.category.localeCompare(b.category) || a.id - b.id);
  }

  getUnansweredWords(categoryId: string): Word[] {
    return this.getWordsByCategory(categoryId).filter(
      (w) => w.answeredCorrectly === null
    );
  }

  getIncorrectWords(categoryId: string): Word[] {
    return this.getWordsByCategory(categoryId).filter(
      (w) => w.answeredCorrectly === false
    );
  }

  getCorrectCount(categoryId: string): number {
    return this.getWordsByCategory(categoryId).filter(
      (w) => w.answeredCorrectly === true
    ).length;
  }

  getAttemptedCount(categoryId: string): number {
    return this.getWordsByCategory(categoryId).filter(
      (w) => w.answeredCorrectly !== null
    ).length;
  }

  getTotalCount(categoryId: string): number {
    return this.getWordsByCategory(categoryId).length;
  }

  isCategoryUnlocked(category: Category): boolean {
    if (category.order === 0) return true;
    const prevCategory = this.categories.find((c) => c.order === category.order - 1);
    if (!prevCategory) return true;
    return this.getCorrectCount(prevCategory.id) >= UNLOCK_REQUIRED_CORRECT;
  }

  getCategoryStates(): CategoryState[] {
    return this.categories.map((cat) => ({
      category: cat,
      correctCount: this.getCorrectCount(cat.id),
      totalCount: this.getTotalCount(cat.id),
      attemptedCount: this.getAttemptedCount(cat.id),
      isUnlocked: this.isCategoryUnlocked(cat),
    }));
  }

  getUserProgress(): UserProgress {
    return this.storage.loadProgress();
  }

  getStatsState(): StatsState {
    const words = this.getAllWords();
    const progress = this.getUserProgress();
    const totalCorrect = words.filter((w) => w.answeredCorrectly === true).length;
    const attemptedWords = words.filter((w) => w.answeredCorrectly !== null);
    const totalAttempted = attemptedWords.length;

    const countsByCategory = new Map<string, number>();
    for (const w of attemptedWords) {
      countsByCategory.set(w.category, (countsByCategory.get(w.category) ?? 0) + 1);
    }

    let mostPlayedCategory: string | null = null;
    let bestCount = 0;
    for (const [catId, count] of countsByCategory.entries()) {
      if (count > bestCount) {
        bestCount = count;
        mostPlayedCategory = catId;
      }
    }

    const accuracyPercent =
      totalAttempted > 0 ? Math.floor((totalCorrect * 100) / totalAttempted) : 0;

    return {
      totalCorrect,
      totalAttempted,
      maxStreak: progress.maxStreak,
      currentStreak: progress.currentStreak,
      totalScore: progress.totalScore,
      mostPlayedCategory,
      accuracyPercent,
    };
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  startCategory(categoryId: string): GameState {
    const unanswered = this.getUnansweredWords(categoryId);
    this.pendingWords = shuffleArray(unanswered, this.rng);
    const progress = this.getUserProgress();

    this.gameState = {
      currentCategoryId: categoryId,
      currentWord: null,
      options: [],
      selectedOption: null,
      isCorrect: null,
      pointsEarned: 0,
      showingResult: false,
      sessionStreak: progress.currentStreak,
      sessionScore: 0,
      wordsRemaining: this.pendingWords.length,
      categoryComplete: false,
    };

    this.loadNextWord();
    return this.getGameState();
  }

  retryIncorrectInCategory(categoryId: string): GameState {
    const stateMap = this.storage.loadWordStates();
    for (const w of this.getIncorrectWords(categoryId)) {
      if (stateMap[w.id]) {
        stateMap[w.id] = {
          unlocked: true,
          answeredCorrectly: null,
        };
      }
    }
    this.storage.saveWordStates(stateMap);
    return this.startCategory(categoryId);
  }

  replayFullCategory(categoryId: string): GameState {
    const stateMap = this.storage.loadWordStates();
    for (const w of this.getWordsByCategory(categoryId)) {
      if (stateMap[w.id]) {
        stateMap[w.id] = {
          unlocked: true,
          answeredCorrectly: null,
        };
      }
    }
    this.storage.saveWordStates(stateMap);
    return this.startCategory(categoryId);
  }

  private loadNextWord(): void {
    if (this.pendingWords.length === 0) {
      this.gameState = {
        ...this.gameState,
        currentWord: null,
        options: [],
        selectedOption: null,
        isCorrect: null,
        pointsEarned: 0,
        showingResult: false,
        wordsRemaining: 0,
        categoryComplete: true,
      };
      return;
    }

    const next = this.pendingWords.shift()!;
    const options = shuffleWordOptions(next, this.rng);
    this.gameState = {
      ...this.gameState,
      currentWord: next,
      options,
      selectedOption: null,
      isCorrect: null,
      pointsEarned: 0,
      showingResult: false,
      wordsRemaining: this.pendingWords.length + 1,
      categoryComplete: false,
    };
  }

  selectAnswer(option: string, bonusPoints = 0): GameState {
    const word = this.gameState.currentWord;
    if (!word || this.gameState.showingResult) {
      return this.getGameState();
    }

    const correct = option === word.definition;
    const progress = this.getUserProgress();
    const { pointsEarned, newStreak } = calculatePointsForAnswer(
      correct,
      progress.currentStreak,
      bonusPoints
    );

    // Update word state
    const wordStates = this.storage.loadWordStates();
    wordStates[word.id] = {
      unlocked: true,
      answeredCorrectly: correct,
    };
    this.storage.saveWordStates(wordStates);

    // Update user progress
    const today = new Date().toISOString().slice(0, 10);
    const updatedProgress: UserProgress = {
      ...progress,
      totalScore: progress.totalScore + pointsEarned,
      currentStreak: newStreak,
      maxStreak: Math.max(progress.maxStreak, newStreak),
      wordsAttempted: progress.wordsAttempted + 1,
      wordsCorrect: progress.wordsCorrect + (correct ? 1 : 0),
      lastPlayedDate: today,
    };
    this.storage.saveProgress(updatedProgress);

    this.gameState = {
      ...this.gameState,
      currentWord: {
        ...word,
        unlocked: true,
        answeredCorrectly: correct,
      },
      selectedOption: option,
      isCorrect: correct,
      pointsEarned,
      showingResult: true,
      sessionStreak: newStreak,
      sessionScore: this.gameState.sessionScore + pointsEarned,
    };

    return this.getGameState();
  }

  nextWord(): GameState {
    this.loadNextWord();
    return this.getGameState();
  }

  resetAllProgress(): void {
    this.storage.clear();
    this.pendingWords = [];
    this.gameState = {
      currentCategoryId: null,
      currentWord: null,
      options: [],
      selectedOption: null,
      isCorrect: null,
      pointsEarned: 0,
      showingResult: false,
      sessionStreak: 0,
      sessionScore: 0,
      wordsRemaining: 0,
      categoryComplete: false,
    };
  }
}
