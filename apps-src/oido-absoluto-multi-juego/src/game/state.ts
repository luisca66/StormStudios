import { AttemptStore, createAttempt, createSessionId, sessionComparison, type SessionSummary, type Attempt } from "./stats";
import { AudioEngine } from "@/audio/engine";
import { Accidentals, Level, Question, SequenceId, SequenceProgress, KeyValueStore,
  QuestionGenerator, TIMBRES, getLevel, getLevels, currentLevel,
  loadProgress, saveProgress, recordAnswer, errorDistance, ErrorDistance } from "./progression";

// Accessing localStorage itself can throw (for example, when storage is disabled).
const store: KeyValueStore = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  // Let the domain detect failed saves and keep its in-memory fallback.
  setItem(key, value) { try { localStorage.setItem(key, value); } catch (error) { throw error; } },
};
const read = (key: string) => store.getItem(`walking-ap:${key}`);
const write = (key: string, value: string): void => {
  try { store.setItem(`walking-ap:${key}`, value); } catch { /* Preferences remain usable for this session. */ }
};
export const ARENA_SIZES: Record<number, number> = { 1: 300, 2: 300, 3: 700, 4: 280, 5: 400 };
const isScenario = (value: number): boolean => Number.isInteger(value) && value >= 1 && value <= 5;
const scenarioFor = (sequence: SequenceId, level: Level, fallback = level.world): number => {
  const saved = Number(read(`scenario:${sequence}:${level.number}`));
  return isScenario(saved) ? saved : fallback;
};
export interface AnswerFeedback {
  question: Question;
  correct: boolean;
  distance: ErrorDistance;
}
export interface GameState {
  sequence: SequenceId;
  levelNumber: number;
  scenario: number;
  level: Level;
  progress: SequenceProgress;
  selectedWorld: number;
  accidentals: Accidentals;
  loopNote: boolean;
  streak: number;
  isPlaying: boolean;
  isGateUnlocked: boolean;
  activeScreen: "menu" | "level-selection" | "warmup" | "gameplay" | "victory" | "statistics";
  currentChallenge: Question | null;
  feedback: AnswerFeedback | null;
  methodCompleted: boolean;
  volume: number;
  sessionId: number | null;
  sessionSummary: SessionSummary | null;
  statsLevel: number | null;
  statsReturnScreen: "menu" | "level-selection";
  storageWarning: boolean;
}
export class GameStateManager {
  private state: GameState;
  private attempts = new AttemptStore(store);
  private warnedAboutStorage = false;
  private generator = new QuestionGenerator();
  private subscribers: ((state: GameState) => void)[] = [];
  constructor(public readonly audio: AudioEngine) {
    const sequence: SequenceId = read("sequence") === "Mujer" ? "Mujer" : "Hombre";
    const savedNumber = Number(read(`last-level:${sequence}`));
    const level = getLevel(sequence, savedNumber) ?? getLevel(sequence, 1)!;
    const progress = loadProgress(store, sequence);
    const savedVolume = read("volume");
    const volume = savedVolume !== null && Number.isFinite(Number(savedVolume))
      ? Math.max(0, Math.min(1, Number(savedVolume))) : audio.getVolume();
    this.state = { sequence, levelNumber: level.number, scenario: scenarioFor(sequence, level), level, progress, selectedWorld: level.world,
      accidentals: read("accidentals") === "flats" ? "flats" : "sharps",
      loopNote: read("loopNote") !== "false", streak: progress.streaks[level.number] ?? 0,
      isPlaying: false, isGateUnlocked: false, activeScreen: "menu", currentChallenge: null,
      feedback: null, methodCompleted: false, volume, sessionId: null, sessionSummary: null,
      statsLevel: level.number, statsReturnScreen: "menu", storageWarning: false };
    audio.setVolume(volume);
  }
  getState(): GameState { return this.state; }
  subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.push(callback); callback(this.state);
    return () => { this.subscribers = this.subscribers.filter(cb => cb !== callback); };
  }
  private notify(): void { for (const cb of this.subscribers) cb(this.state); }
  continueLevel(): number { return currentLevel(this.state.progress, getLevels(this.state.sequence)).number; }
  updateVolume(value: number): void {
    this.state.volume = Math.max(0, Math.min(1, value));
    this.audio.setVolume(this.state.volume); write("volume", String(this.state.volume));
    // Do not replace the slider DOM while it is being dragged.
  }
  selectSequence(sequence: SequenceId): void {
    if (sequence !== "Hombre" && sequence !== "Mujer") return;
    this.backToMenu();
    const progress = loadProgress(store, sequence);
    const level = getLevel(sequence, Number(read(`last-level:${sequence}`))) ?? getLevel(sequence, 1)!;
    Object.assign(this.state, { sequence, progress, level, levelNumber: level.number,
      scenario: scenarioFor(sequence, level), sessionId: null, sessionSummary: null,
      selectedWorld: level.world, streak: progress.streaks[level.number] ?? 0, methodCompleted: false });
    write("sequence", sequence); this.generator.reset(); this.notify();
  }
  toggleAccidentals(): void {
    this.state.accidentals = this.state.accidentals === "sharps" ? "flats" : "sharps";
    write("accidentals", this.state.accidentals); this.notify();
  }
  toggleLoop(): void {
    this.state.loopNote = !this.state.loopNote;
    write("loopNote", String(this.state.loopNote));
    if (this.state.currentChallenge) this.replay();
    this.notify();
  }
  private stopSession(): void {
    this.state.isPlaying = false; this.state.currentChallenge = null; this.state.feedback = null;
    this.audio.stopAllNotes(); this.audio.stopMusic(); this.audio.stopAllLoops();
  }
  selectWorld(world: number): void {
    if (!ARENA_SIZES[world]) return;
    this.stopSession(); this.state.selectedWorld = world;
    this.state.activeScreen = "level-selection"; this.notify();
  }
  selectScenario(scenario: number): void {
    if (this.state.activeScreen !== "warmup" || !isScenario(scenario)) return;
    this.state.scenario = scenario;
    write(`scenario:${this.state.sequence}:${this.state.levelNumber}`, String(scenario));
    this.notify();
  }
  selectLevel(number: number, fallbackScenario?: number): void {
    const level = getLevel(this.state.sequence, number); if (!level) return;
    this.stopSession(); this.generator.reset();
    Object.assign(this.state, { level, levelNumber: number, selectedWorld: level.world,
      scenario: scenarioFor(this.state.sequence, level,
        fallbackScenario !== undefined && isScenario(fallbackScenario) ? fallbackScenario : level.world),
      streak: this.state.progress.streaks[number] ?? 0, isGateUnlocked: false,
      activeScreen: "warmup", methodCompleted: false });
    write(`last-level:${this.state.sequence}`, String(number));
    this.audio.preloadNotes(level.pitches); this.notify();
  }
  warmupNote(index: number): void {
    const pitch = this.state.level.pitches[index];
    if (pitch && this.state.activeScreen === "warmup")
      this.audio.playNote(TIMBRES[Math.floor(Math.random() * TIMBRES.length)], pitch);
  }
  confirmWarmup(): void {
    if (this.state.activeScreen !== "warmup") return;
    this.audio.stopAllNotes();
    this.state.sessionId = createSessionId(); this.state.sessionSummary = null;
    this.state.activeScreen = "gameplay"; this.state.isPlaying = true;
    write(`last-played-level:${this.state.sequence}`, String(this.state.levelNumber));
    this.state.isGateUnlocked = this.state.streak >= this.state.level.requiredStreak;
    // Remember the scenario actually played, including an inherited preselection.
    write(`scenario:${this.state.sequence}:${this.state.levelNumber}`, String(this.state.scenario));
    this.audio.startMusic(this.state.scenario); this.notify();
  }
  nextQuestion(): Question { return this.generator.next(this.state.level); }
  setChallenge(question: Question): void {
    if (!this.state.isPlaying || this.state.feedback || this.state.isGateUnlocked) return;
    this.state.currentChallenge = question; this.replay(); this.notify();
  }
  replay(): void {
    const q = this.state.currentChallenge;
    if (q) this.audio.playNote(q.timbre, q.pitch, this.state.loopNote);
  }
  hearAnswer(): void {
    const q = this.state.feedback?.question;
    if (q) this.audio.playNote(q.timbre, q.pitch);
  }
  checkAnswer(answeredClass: number): boolean {
    const q = this.state.currentChallenge;
    if (!q || this.state.feedback || !this.state.isPlaying || this.state.sessionId === null) return false;
    this.audio.stopAllNotes();
    const attempt = createAttempt({ sessionId: this.state.sessionId!, sequence: this.state.sequence,
      level: this.state.levelNumber, scenario: this.state.scenario, playedMidi: q.pitch.midi,
      answeredPitchClass: answeredClass, timbre: q.timbre });
    const { saved } = this.attempts.record(attempt);
    if (!saved) this.warnStorageOnce();
    this.state.sessionSummary = sessionComparison(this.attempts.getAll(), this.state.sequence,
      this.state.levelNumber, this.state.sessionId!).current;
    const correct = attempt.correct;
    const result = recordAnswer(this.state.progress, this.state.level, correct);
    this.state.progress = result.progress;
    saveProgress(store, this.state.sequence, this.state.progress);
    this.state.streak = this.state.progress.streaks[this.state.levelNumber] ?? 0;
    this.state.isGateUnlocked = this.state.streak >= this.state.level.requiredStreak;
    this.state.feedback = { question: q, correct, distance: errorDistance(answeredClass, q.pitch.pitchClass) };
    this.state.currentChallenge = null;
    this.audio.nextTrack();
    if (correct) this.audio.playCorrect(); else this.audio.playWrong();
    this.notify(); return correct;
  }
  dismissFeedback(): void {
    this.audio.stopAllNotes(); this.state.feedback = null; this.notify();
  }
  completeLevel(): void {
    if (!this.state.isGateUnlocked || this.state.feedback) return;
    this.stopSession(); this.state.activeScreen = "victory"; this.notify();
  }
  backToMenu(): void {
    this.stopSession(); this.state.activeScreen = "menu";
    this.state.isGateUnlocked = false; this.notify();
  }
  getAttempts(): Attempt[] { return this.attempts.getAll(); }
  private warnStorageOnce(): void {
    if (this.warnedAboutStorage) return;
    this.warnedAboutStorage = true; this.state.storageWarning = true;
  }
  dismissStorageWarning(): void { this.state.storageWarning = false; this.notify(); }
  openStatistics(): void {
    this.state.statsReturnScreen = this.state.activeScreen === "level-selection" ? "level-selection" : "menu";
    this.stopSession();
    const lastPlayed = Number(read(`last-played-level:${this.state.sequence}`));
    this.state.statsLevel = getLevel(this.state.sequence, lastPlayed)?.number ?? this.state.levelNumber;
    this.state.activeScreen = "statistics"; this.notify();
  }
  setStatsLevel(level: number | null): void {
    if (level !== null && !getLevel(this.state.sequence, level)) return;
    this.state.statsLevel = level; this.notify();
  }
  closeStatistics(): void {
    this.state.activeScreen = this.state.statsReturnScreen; this.notify();
  }
  clearStatistics(): void {
    // Clearing the current sequence leaves its level progress and the other sequence intact.
    const saved = this.attempts.replaceAll(this.attempts.getAll().filter(a => a.sequence !== this.state.sequence));
    if (!saved) this.warnStorageOnce();
    this.state.sessionId = null; this.state.sessionSummary = null; this.notify();
  }
  advanceLevel(): void {
    if (this.state.levelNumber < 147) this.selectLevel(this.state.levelNumber + 1, this.state.scenario);
    else { this.state.methodCompleted = true; this.backToMenu(); }
  }
}
