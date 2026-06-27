import { STATS_KEY } from "@/config";

export interface StatEntry {
  correct: number;
  total: number;
}

export type StatsMap = Record<string, StatEntry>;

export class StatsRepository {
  getStats(): StatsMap {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY) || "{}") as StatsMap;
    } catch {
      return {};
    }
  }

  record(key: string, correct: boolean): void {
    const stats = this.getStats();
    const current = stats[key] ?? { correct: 0, total: 0 };
    stats[key] = {
      correct: current.correct + (correct ? 1 : 0),
      total: current.total + 1,
    };
    this.save(stats);
  }

  clear(): void {
    this.save({});
  }

  private save(stats: StatsMap): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // localStorage may be unavailable in some embedded contexts.
    }
  }
}
