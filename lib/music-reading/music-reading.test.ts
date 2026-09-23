import { describe, expect, it } from "vitest";
import { generateExercise } from "./exercise-generator";
import { MUSIC_READING_LEVELS, getLevelById } from "./levels";
import {
  EMPTY_SESSION_STATS,
  createRoundSummary,
  formatAverageMs,
  formatPercent,
  getAccuracy,
  recordAnswer,
} from "./scoring";

describe("music reading scoring", () => {
  it("tracks streaks, accuracy and average response time", () => {
    let stats = recordAnswer(EMPTY_SESSION_STATS, true, 1000);
    stats = recordAnswer(stats, true, 2000);
    stats = recordAnswer(stats, false, -50);
    expect(stats.correct).toBe(2);
    expect(stats.incorrect).toBe(1);
    expect(stats.currentStreak).toBe(0);
    expect(stats.bestStreak).toBe(2);
    expect(stats.totalResponseMs).toBe(3000);
    expect(getAccuracy(stats)).toBeCloseTo(2 / 3);
    expect(formatPercent(getAccuracy(stats))).toBe("67%");
    expect(formatAverageMs(1000)).toBe("1.0 s");
    expect(formatAverageMs(0)).toBe("0.0 s");
  });

  it("passes a round only at the level's accuracy threshold", () => {
    const level = MUSIC_READING_LEVELS[0];
    const answers = Array.from({ length: 10 }, (_, i) => i < Math.ceil(level.passingAccuracy * 10));
    const stats = answers.reduce((acc, ok) => recordAnswer(acc, ok, 500), EMPTY_SESSION_STATS);
    expect(createRoundSummary({ level, nextLevelId: level.id + 1, stats }).passed).toBe(true);
    const failing = recordAnswer(EMPTY_SESSION_STATS, false, 500);
    expect(createRoundSummary({ level, nextLevelId: level.id, stats: failing }).passed).toBe(false);
  });
});

describe("music reading exercises", () => {
  it("only uses each level's clefs and allowed notes", () => {
    for (const level of MUSIC_READING_LEVELS) {
      for (let i = 0; i < 20; i += 1) {
        const exercise = generateExercise(level, { seed: `test-${level.id}`, exerciseIndex: i });
        expect(level.clefs).toContain(exercise.clef);
        for (const note of exercise.notes) {
          expect(level.allowedNotes).toContain(note.pitch.note);
        }
      }
    }
  });

  it("is deterministic for the same seed", () => {
    const level = getLevelById(MUSIC_READING_LEVELS.at(-1)!.id);
    const a = generateExercise(level, { seed: "fixed", exerciseIndex: 3 });
    const b = generateExercise(level, { seed: "fixed", exerciseIndex: 3 });
    expect(a).toEqual(b);
  });
});
