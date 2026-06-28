import type { NoteStat } from "./types";

const statsKey = "ap_guitar_note_accuracy_stats";

export class StatsRepository {
  loadStats(): Map<string, NoteStat> {
    try {
      const raw = window.localStorage.getItem(statsKey);
      if (!raw) return new Map();
      const parsed = JSON.parse(raw) as Record<string, NoteStat>;
      return new Map(
        Object.entries(parsed).map(([note, stat]) => [
          note,
          {
            correct: Number.isFinite(stat.correct) ? stat.correct : 0,
            total: Number.isFinite(stat.total) ? stat.total : 0,
          },
        ]),
      );
    } catch {
      return new Map();
    }
  }

  saveStats(stats: Map<string, NoteStat>) {
    const serializable = Object.fromEntries(stats.entries());
    window.localStorage.setItem(statsKey, JSON.stringify(serializable));
  }

  recordAnswer(noteName: string, wasCorrect: boolean) {
    const stats = this.loadStats();
    const previous = stats.get(noteName) ?? { correct: 0, total: 0 };
    stats.set(noteName, {
      correct: previous.correct + (wasCorrect ? 1 : 0),
      total: previous.total + 1,
    });
    this.saveStats(stats);
    return stats;
  }

  clearStats() {
    window.localStorage.removeItem(statsKey);
  }
}
