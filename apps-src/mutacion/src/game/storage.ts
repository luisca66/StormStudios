export interface ProgressRepository {
  getHighScore(): number;
  getUnlockedLevel(): number;
  saveHighScore(score: number): number;
  unlockLevel(level: number): number;
  resetProgress(): void;
}

const HIGH_SCORE_KEY = "mutacion_prefs_high_score";
const UNLOCKED_LEVEL_KEY = "mutacion_prefs_unlocked_level";

export class LocalStorageScoreRepository implements ProgressRepository {
  private memoryHighScore = 0;
  private memoryUnlockedLevel = 1;

  constructor() {
    this.memoryHighScore = this.readInt(HIGH_SCORE_KEY, 0);
    this.memoryUnlockedLevel = Math.max(1, this.readInt(UNLOCKED_LEVEL_KEY, 1));
  }

  private readInt(key: string, fallback: number): number {
    try {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage) {
        const raw = globalThis.localStorage.getItem(key);
        if (raw !== null) {
          const parsed = Number.parseInt(raw, 10);
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      }
    } catch {
      // Ignorar si localStorage está deshabilitado o bloqueado
    }
    return fallback;
  }

  private writeInt(key: string, value: number): void {
    try {
      if (typeof globalThis !== "undefined" && "localStorage" in globalThis && globalThis.localStorage) {
        globalThis.localStorage.setItem(key, String(value));
      }
    } catch {
      // Ignorar si localStorage está deshabilitado o bloqueado
    }
  }

  getHighScore(): number {
    const stored = this.readInt(HIGH_SCORE_KEY, this.memoryHighScore);
    this.memoryHighScore = Math.max(this.memoryHighScore, stored);
    return this.memoryHighScore;
  }

  getUnlockedLevel(): number {
    const stored = this.readInt(UNLOCKED_LEVEL_KEY, this.memoryUnlockedLevel);
    this.memoryUnlockedLevel = Math.max(1, this.memoryUnlockedLevel, stored);
    return this.memoryUnlockedLevel;
  }

  saveHighScore(score: number): number {
    const current = this.getHighScore();
    if (score > current) {
      this.memoryHighScore = score;
      this.writeInt(HIGH_SCORE_KEY, score);
    }
    return this.memoryHighScore;
  }

  unlockLevel(level: number): number {
    const current = this.getUnlockedLevel();
    if (level > current) {
      this.memoryUnlockedLevel = level;
      this.writeInt(UNLOCKED_LEVEL_KEY, level);
    }
    return this.memoryUnlockedLevel;
  }

  resetProgress(): void {
    this.memoryHighScore = 0;
    this.memoryUnlockedLevel = 1;
    this.writeInt(HIGH_SCORE_KEY, 0);
    this.writeInt(UNLOCKED_LEVEL_KEY, 1);
  }
}

export class InMemoryScoreRepository implements ProgressRepository {
  private highScore = 0;
  private unlockedLevel = 1;

  constructor(initialHighScore = 0, initialUnlockedLevel = 1) {
    this.highScore = initialHighScore;
    this.unlockedLevel = Math.max(1, initialUnlockedLevel);
  }

  getHighScore(): number {
    return this.highScore;
  }

  getUnlockedLevel(): number {
    return this.unlockedLevel;
  }

  saveHighScore(score: number): number {
    if (score > this.highScore) {
      this.highScore = score;
    }
    return this.highScore;
  }

  unlockLevel(level: number): number {
    if (level > this.unlockedLevel) {
      this.unlockedLevel = level;
    }
    return this.unlockedLevel;
  }

  resetProgress(): void {
    this.highScore = 0;
    this.unlockedLevel = 1;
  }
}
