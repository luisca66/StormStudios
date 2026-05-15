import type {
  Clef,
  MusicReadingProgress,
  NotationMode,
  SessionStats,
} from "./types";
import { MAX_LEVEL_ID } from "./levels";

export const PROGRESS_STORAGE_KEY = "music-reading-progress-v1";
export const PROGRESS_STORAGE_EVENT = "music-reading-progress-change";

let cachedRawProgress: string | null = null;
let cachedProgress: MusicReadingProgress | null = null;

const INITIAL_CLEF_PROGRESS = {
  attempted: 0,
  correct: 0,
};

export function createInitialProgress(
  notationMode: NotationMode = "latin",
): MusicReadingProgress {
  return {
    currentLevelId: 1,
    bestLevelId: 1,
    totalCorrect: 0,
    totalIncorrect: 0,
    bestStreak: 0,
    completedRounds: 0,
    notationMode,
    clefs: {
      treble: { ...INITIAL_CLEF_PROGRESS },
      bass: { ...INITIAL_CLEF_PROGRESS },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function readProgress(): MusicReadingProgress {
  if (typeof window === "undefined") {
    return createInitialProgress();
  }

  const rawProgress = window.localStorage.getItem(PROGRESS_STORAGE_KEY);

  if (!rawProgress) {
    if (cachedRawProgress === null && cachedProgress) {
      return cachedProgress;
    }

    cachedRawProgress = null;
    cachedProgress = createInitialProgress();
    return cachedProgress;
  }

  if (rawProgress === cachedRawProgress && cachedProgress) {
    return cachedProgress;
  }

  try {
    const parsedProgress = JSON.parse(rawProgress) as unknown;
    cachedRawProgress = rawProgress;
    cachedProgress = normalizeProgress(parsedProgress);
    return cachedProgress;
  } catch {
    const initialProgress = createInitialProgress();
    writeProgress(initialProgress);
    return cachedProgress ?? initialProgress;
  }
}

export function writeProgress(progress: MusicReadingProgress): void {
  if (typeof window === "undefined") {
    return;
  }

  const nextProgress = {
    ...progress,
    updatedAt: new Date().toISOString(),
  };
  const rawProgress = JSON.stringify(nextProgress);

  cachedRawProgress = rawProgress;
  cachedProgress = nextProgress;

  window.localStorage.setItem(PROGRESS_STORAGE_KEY, rawProgress);
  window.dispatchEvent(new Event(PROGRESS_STORAGE_EVENT));
}

export function resetProgress(
  notationMode: NotationMode,
): MusicReadingProgress {
  const initialProgress = createInitialProgress(notationMode);
  writeProgress(initialProgress);
  return initialProgress;
}

export function recordProgressAnswer({
  clef,
  isCorrect,
  progress,
  stats,
}: {
  clef: Clef;
  isCorrect: boolean;
  progress: MusicReadingProgress;
  stats: SessionStats;
}): MusicReadingProgress {
  const clefProgress = progress.clefs[clef];

  return {
    ...progress,
    totalCorrect: progress.totalCorrect + (isCorrect ? 1 : 0),
    totalIncorrect: progress.totalIncorrect + (isCorrect ? 0 : 1),
    bestStreak: Math.max(progress.bestStreak, stats.bestStreak),
    clefs: {
      ...progress.clefs,
      [clef]: {
        attempted: clefProgress.attempted + 1,
        correct: clefProgress.correct + (isCorrect ? 1 : 0),
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function completeProgressRound({
  currentLevelId,
  nextLevelId,
  progress,
}: {
  currentLevelId: number;
  nextLevelId: number;
  progress: MusicReadingProgress;
}): MusicReadingProgress {
  return {
    ...progress,
    currentLevelId: nextLevelId,
    bestLevelId: Math.max(progress.bestLevelId, currentLevelId, nextLevelId),
    completedRounds: progress.completedRounds + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function updateProgressNotationMode(
  progress: MusicReadingProgress,
  notationMode: NotationMode,
): MusicReadingProgress {
  return {
    ...progress,
    notationMode,
    updatedAt: new Date().toISOString(),
  };
}

export function updateProgressLevel(
  progress: MusicReadingProgress,
  currentLevelId: number,
): MusicReadingProgress {
  return {
    ...progress,
    currentLevelId: clampLevelId(currentLevelId),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProgress(value: unknown): MusicReadingProgress {
  if (!isProgressLike(value)) {
    const initialProgress = createInitialProgress();
    writeProgress(initialProgress);
    return initialProgress;
  }

  return {
    currentLevelId: clampLevelId(value.currentLevelId),
    bestLevelId: clampLevelId(value.bestLevelId),
    totalCorrect: safeNumber(value.totalCorrect),
    totalIncorrect: safeNumber(value.totalIncorrect),
    bestStreak: safeNumber(value.bestStreak),
    completedRounds: safeNumber(value.completedRounds),
    notationMode:
      value.notationMode === "english" || value.notationMode === "latin"
        ? value.notationMode
        : "latin",
    clefs: {
      treble: normalizeClefProgress(value.clefs?.treble),
      bass: normalizeClefProgress(value.clefs?.bass),
    },
    updatedAt:
      typeof value.updatedAt === "string"
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function isProgressLike(
  value: unknown,
): value is Partial<MusicReadingProgress> {
  return typeof value === "object" && value !== null;
}

function normalizeClefProgress(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return { ...INITIAL_CLEF_PROGRESS };
  }

  const candidate = value as { attempted?: unknown; correct?: unknown };

  return {
    attempted: safeNumber(candidate.attempted),
    correct: safeNumber(candidate.correct),
  };
}

function safeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function clampLevelId(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return Math.min(MAX_LEVEL_ID, Math.max(1, Math.floor(value)));
}
