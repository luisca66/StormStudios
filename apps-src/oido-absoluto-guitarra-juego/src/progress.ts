import type { GuitarSample, Pitch, StringId } from "./catalog";

export interface AnswerTally {
  correct: number;
  total: number;
}

export interface LevelRecord extends AnswerTally {
  sessions: number;
  completions: number;
  bestStreak: number;
  lastCompletedAt?: string;
}

export interface TrainingProgress extends AnswerTally {
  version: 1;
  sessions: number;
  bestStreak: number;
  levels: Record<string, LevelRecord>;
  pitches: Partial<Record<Pitch, AnswerTally>>;
  strings: Partial<Record<StringId, AnswerTally>>;
}

const emptyTally = (): AnswerTally => ({ correct: 0, total: 0 });
const emptyLevel = (): LevelRecord => ({ ...emptyTally(), sessions: 0, completions: 0, bestStreak: 0 });

export function createEmptyProgress(): TrainingProgress {
  return {
    version: 1,
    ...emptyTally(),
    sessions: 0,
    bestStreak: 0,
    levels: {},
    pitches: {},
    strings: {},
  };
}

export class ProgressRepository {
  private data: TrainingProgress;

  constructor(private storageKey: string) {
    this.data = this.read();
  }

  get() {
    return this.data;
  }

  startSession(levelId: number) {
    const level = this.level(levelId);
    this.data.sessions += 1;
    level.sessions += 1;
    this.write();
    return this.data;
  }

  recordAnswer(sample: GuitarSample, correct: boolean, levelId: number, currentStreak: number) {
    const level = this.level(levelId);
    const pitch = this.data.pitches[sample.pitch] ?? emptyTally();
    const string = this.data.strings[sample.stringId] ?? emptyTally();

    this.increment(this.data, correct);
    this.increment(level, correct);
    this.increment(pitch, correct);
    this.increment(string, correct);
    this.data.pitches[sample.pitch] = pitch;
    this.data.strings[sample.stringId] = string;

    this.data.bestStreak = Math.max(this.data.bestStreak, currentStreak);
    level.bestStreak = Math.max(level.bestStreak, currentStreak);
    this.write();
    return this.data;
  }

  completeLevel(levelId: number) {
    const level = this.level(levelId);
    level.completions += 1;
    level.lastCompletedAt = new Date().toISOString();
    this.write();
    return this.data;
  }

  private increment(tally: AnswerTally, correct: boolean) {
    tally.total += 1;
    if (correct) tally.correct += 1;
  }

  private level(levelId: number) {
    const key = String(levelId);
    this.data.levels[key] ??= emptyLevel();
    return this.data.levels[key];
  }

  private read(): TrainingProgress {
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return createEmptyProgress();
      const parsed = JSON.parse(raw) as Partial<TrainingProgress>;
      if (parsed.version !== 1) return createEmptyProgress();
      return {
        ...createEmptyProgress(),
        ...parsed,
        levels: parsed.levels ?? {},
        pitches: parsed.pitches ?? {},
        strings: parsed.strings ?? {},
      };
    } catch {
      return createEmptyProgress();
    }
  }

  private write() {
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch {
      // Training still works when storage is unavailable or full.
    }
  }
}
