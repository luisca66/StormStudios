import type { RoundSummary, SessionStats } from "./types";
import type { MusicReadingLevel } from "./types";

export const EMPTY_SESSION_STATS: SessionStats = {
  correct: 0,
  incorrect: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalResponseMs: 0,
  answeredNotes: 0,
};

export function recordAnswer(
  stats: SessionStats,
  isCorrect: boolean,
  responseMs: number,
): SessionStats {
  const currentStreak = isCorrect ? stats.currentStreak + 1 : 0;

  return {
    correct: stats.correct + (isCorrect ? 1 : 0),
    incorrect: stats.incorrect + (isCorrect ? 0 : 1),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    totalResponseMs: stats.totalResponseMs + Math.max(0, responseMs),
    answeredNotes: stats.answeredNotes + 1,
  };
}

export function getAccuracy(stats: SessionStats): number {
  const total = stats.correct + stats.incorrect;
  return total === 0 ? 0 : stats.correct / total;
}

export function getAverageResponseMs(stats: SessionStats): number {
  return stats.answeredNotes === 0
    ? 0
    : stats.totalResponseMs / stats.answeredNotes;
}

export function createRoundSummary({
  level,
  nextLevelId,
  stats,
}: {
  level: MusicReadingLevel;
  nextLevelId: number;
  stats: SessionStats;
}): RoundSummary {
  const accuracy = getAccuracy(stats);

  return {
    levelId: level.id,
    levelTitle: level.title,
    correct: stats.correct,
    incorrect: stats.incorrect,
    accuracy,
    averageResponseMs: getAverageResponseMs(stats),
    bestStreak: stats.bestStreak,
    passed: accuracy >= level.passingAccuracy,
    nextLevelId,
  };
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatAverageMs(value: number): string {
  if (value <= 0) {
    return "0.0 s";
  }

  return `${(value / 1000).toFixed(1)} s`;
}
