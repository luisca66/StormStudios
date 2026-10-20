import type { UserProgress, WordStateMap } from "./types";

const PROGRESS_STORAGE_KEY = "storm_etimologica_user_progress_v1";
const WORDS_STATE_STORAGE_KEY = "storm_etimologica_words_state_v1";

export function createInitialProgress(): UserProgress {
  return {
    id: 1,
    totalScore: 0,
    currentStreak: 0,
    maxStreak: 0,
    wordsAttempted: 0,
    wordsCorrect: 0,
    lastPlayedDate: null,
  };
}

export interface StorageAdapter {
  loadProgress(): UserProgress;
  saveProgress(progress: UserProgress): void;
  loadWordStates(): WordStateMap;
  saveWordStates(states: WordStateMap): void;
  clear(): void;
}

export function createBrowserStorage(): StorageAdapter {
  let memoryProgress: UserProgress = createInitialProgress();
  let memoryWordStates: WordStateMap = {};

  return {
    loadProgress(): UserProgress {
      try {
        if (typeof window === "undefined" || !window.localStorage) {
          return { ...memoryProgress };
        }
        const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!raw) return { ...memoryProgress };
        const parsed = JSON.parse(raw) as Partial<UserProgress>;
        const progress: UserProgress = {
          id: 1,
          totalScore: typeof parsed.totalScore === "number" ? parsed.totalScore : 0,
          currentStreak: typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
          maxStreak: typeof parsed.maxStreak === "number" ? parsed.maxStreak : 0,
          wordsAttempted: typeof parsed.wordsAttempted === "number" ? parsed.wordsAttempted : 0,
          wordsCorrect: typeof parsed.wordsCorrect === "number" ? parsed.wordsCorrect : 0,
          lastPlayedDate: typeof parsed.lastPlayedDate === "string" ? parsed.lastPlayedDate : null,
        };
        memoryProgress = progress;
        return { ...progress };
      } catch {
        return { ...memoryProgress };
      }
    },

    saveProgress(progress: UserProgress): void {
      memoryProgress = { ...progress };
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
        }
      } catch {
        // Ignore storage errors (private mode / quota / sandboxed iframe)
      }
    },

    loadWordStates(): WordStateMap {
      try {
        if (typeof window === "undefined" || !window.localStorage) {
          return { ...memoryWordStates };
        }
        const raw = window.localStorage.getItem(WORDS_STATE_STORAGE_KEY);
        if (!raw) return { ...memoryWordStates };
        const parsed = JSON.parse(raw) as Record<string, { unlocked?: boolean; answeredCorrectly?: boolean | null }>;
        const map: WordStateMap = {};
        for (const [key, val] of Object.entries(parsed)) {
          const id = Number(key);
          if (!Number.isNaN(id) && val && typeof val === "object") {
            map[id] = {
              unlocked: Boolean(val.unlocked),
              answeredCorrectly:
                typeof val.answeredCorrectly === "boolean" ? val.answeredCorrectly : null,
            };
          }
        }
        memoryWordStates = map;
        return { ...map };
      } catch {
        return { ...memoryWordStates };
      }
    },

    saveWordStates(states: WordStateMap): void {
      memoryWordStates = { ...states };
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(WORDS_STATE_STORAGE_KEY, JSON.stringify(states));
        }
      } catch {
        // Ignore storage errors
      }
    },

    clear(): void {
      memoryProgress = createInitialProgress();
      memoryWordStates = {};
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.removeItem(PROGRESS_STORAGE_KEY);
          window.localStorage.removeItem(WORDS_STATE_STORAGE_KEY);
        }
      } catch {
        // Ignore storage errors
      }
    },
  };
}

export function createMemoryStorage(): StorageAdapter {
  let memoryProgress: UserProgress = createInitialProgress();
  let memoryWordStates: WordStateMap = {};

  return {
    loadProgress: () => ({ ...memoryProgress }),
    saveProgress: (progress) => {
      memoryProgress = { ...progress };
    },
    loadWordStates: () => ({ ...memoryWordStates }),
    saveWordStates: (states) => {
      memoryWordStates = { ...states };
    },
    clear: () => {
      memoryProgress = createInitialProgress();
      memoryWordStates = {};
    },
  };
}
