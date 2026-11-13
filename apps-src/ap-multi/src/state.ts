import { QuestionGenerator, TIMBRES, currentLevel, getLevel, getLevels, loadProgress, saveProgress, recordAnswer, errorDistance, type KeyValueStore, type SequenceId, type Accidentals, type Question } from '../../ap-core/progression';
import { AttemptStore, createAttempt, createSessionId, sessionComparison } from '../../ap-core/stats';

export type Screen = 'menu' | 'levels' | 'warmup' | 'training' | 'victory' | 'statistics';
export const browserStore: KeyValueStore = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { localStorage.setItem(key, value); },
};

export class AppState {
  screen: Screen = 'menu';
  sequence: SequenceId;
  level;
  progress;
  accidentals: Accidentals;
  loopNote: boolean;
  volume: number;
  selectedWorld = 1;
  question: Question | null = null;
  feedback: { question: Question; correct: boolean; distance: ReturnType<typeof errorDistance> } | null = null;
  answeredAt: number | null = null;
  sessionId: number | null = null;
  statsLevel: number | null = null;
  statsReturn: 'menu' | 'levels' = 'menu';
  storageWarning = false;
  private generator = new QuestionGenerator();
  private attempts: AttemptStore;
  constructor(private store: KeyValueStore = browserStore) {
    this.sequence = this.read('sequence') === 'Mujer' ? 'Mujer' : 'Hombre';
    this.progress = loadProgress(store, this.sequence);
    this.level = getLevel(this.sequence, Number(this.read(`last-level:${this.sequence}`))) ?? getLevels(this.sequence)[0];
    this.accidentals = this.read('accidentals') === 'flats' ? 'flats' : 'sharps';
    this.loopNote = this.read('loopNote') !== 'false';
    const volume = this.read('volume');
    this.volume = volume !== null && Number.isFinite(Number(volume)) ? Math.max(0, Math.min(1, Number(volume))) : 0.9;
    this.attempts = new AttemptStore(store);
  }
  private read(key: string) { try { return this.store.getItem(`walking-ap:${key}`); } catch { return null; } }
  private write(key: string, value: string) { try { this.store.setItem(`walking-ap:${key}`, value); } catch { this.storageWarning = true; } }
  continueLevel() { return currentLevel(this.progress, getLevels(this.sequence)).number; }
  get streak() { return this.progress.streaks[this.level.number] ?? 0; }
  get sessionSummary() { return this.sessionId === null ? null : sessionComparison(this.getAttempts(), this.sequence, this.level.number, this.sessionId).current; }
  selectSequence(sequence: SequenceId) {
    this.sequence = sequence;
    this.progress = loadProgress(this.store, sequence);
    this.sessionId = null;
    this.level = getLevel(sequence, Number(this.read(`last-level:${sequence}`))) ?? getLevels(sequence)[0];
    this.write('sequence', sequence);
    this.navigate('menu');
  }
  navigate(screen: Screen) {
    this.question = null; this.feedback = null; this.answeredAt = null;
    this.screen = screen;
  }
  selectWorld(world: number) { if (world < 1 || world > 5) return; this.selectedWorld = world; this.navigate('levels'); }
  selectLevel(number: number) {
    const level = getLevel(this.sequence, number); if (!level) return;
    this.level = level; this.selectedWorld = level.world; this.sessionId = null;
    this.generator.reset(); this.navigate('warmup');
    this.write(`last-level:${this.sequence}`, String(number));
  }
  startTraining() {
    if (this.screen !== 'warmup') return;
    this.navigate('training'); this.sessionId = createSessionId();
    this.write(`last-played-level:${this.sequence}`, String(this.level.number));
  }
  newQuestion() {
    if (this.screen !== 'training' || this.question) return null;
    this.question = this.generator.next(this.level); this.feedback = null; this.answeredAt = null;
    return this.question;
  }
  answer(answeredPitchClass: number, now = Date.now()) {
    const question = this.question;
    if (this.screen !== 'training' || !question || this.sessionId === null || !this.level.answerClasses.includes(answeredPitchClass)) return false;
    const attempt = createAttempt({ sessionId: this.sessionId, sequence: this.sequence, level: this.level.number,
      scenario: this.level.world, playedMidi: question.pitch.midi, answeredPitchClass, timbre: question.timbre, timestamp: now });
    if (!this.attempts.record(attempt).saved) this.storageWarning = true;
    this.progress = recordAnswer(this.progress, this.level, attempt.correct).progress;
    // saveProgress intentionally swallows storage errors; track failure through this adapter.
    saveProgress({ getItem: key => this.store.getItem(key), setItem: (key, value) => {
      try { this.store.setItem(key, value); } catch { this.storageWarning = true; }
    } }, this.sequence, this.progress);
    this.feedback = { question, correct: attempt.correct, distance: errorDistance(answeredPitchClass, question.pitch.pitchClass) };
    this.question = null; this.answeredAt = now;
    if (this.streak >= this.level.requiredStreak) this.screen = 'victory';
    return true;
  }
  nextLevel() { return getLevel(this.sequence, this.level.number + 1); }
  advanceLevel() { if (this.screen === 'victory' && this.nextLevel()) this.selectLevel(this.level.number + 1); }
  toggleAccidentals() { this.accidentals = this.accidentals === 'sharps' ? 'flats' : 'sharps'; this.write('accidentals', this.accidentals); }
  toggleLoop() { this.loopNote = !this.loopNote; this.write('loopNote', String(this.loopNote)); }
  setVolume(value: number) { if (!Number.isFinite(value)) return; this.volume = Math.max(0, Math.min(1, value)); this.write('volume', String(this.volume)); }
  warmupQuestion(index: number): Question | null {
    const pitch = this.level.pitches[index];
    return this.screen === 'warmup' && pitch ? { pitch, timbre: TIMBRES[Math.floor(Math.random() * TIMBRES.length)] } : null;
  }
  openStatistics() {
    this.statsReturn = this.screen === 'levels' ? 'levels' : 'menu';
    this.statsLevel = getLevel(this.sequence, Number(this.read(`last-played-level:${this.sequence}`)))?.number ?? this.level.number;
    this.navigate('statistics');
  }
  getAttempts() { return this.attempts.getAll(); }
  clearStatistics() {
    if (!this.attempts.replaceAll(this.getAttempts().filter(a => a.sequence !== this.sequence))) this.storageWarning = true;
    this.sessionId = null;
  }
  refreshSharedData() {
    // Other tabs can update the same domain. Refresh outside active training only.
    if (this.screen === 'training' || this.screen === 'victory') return;
    this.progress = loadProgress(this.store, this.sequence); this.attempts = new AttemptStore(this.store);
  }
}

export function restProgress(answeredAt: number | null, now = Date.now()) {
  return answeredAt === null ? 0 : Math.min(1, Math.max(0, (now - answeredAt) / 60000));
}
