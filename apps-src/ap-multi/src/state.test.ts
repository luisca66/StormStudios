import { describe, expect, it } from 'vitest';
import { AppState, restProgress } from './state';
import { emptyProgress, saveProgress, type KeyValueStore } from '../../ap-core/progression';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
}
function train(state: AppState, level = 1) { state.selectLevel(level); state.startTraining(); }
function correct(state: AppState, now = Date.now()) { const q = state.newQuestion()!; return state.answer(q.pitch.pitchClass, now); }

describe('AP Super 2D state', () => {
  it('opens every level without locking and requires warmup before training', () => {
    const s = new AppState(memoryStore());
    expect(s.newQuestion()).toBeNull(); s.startTraining(); expect(s.screen).toBe('menu');
    s.selectLevel(147); expect(s.screen).toBe('warmup'); expect(s.level.number).toBe(147);
    expect(s.warmupQuestion(0)?.pitch).toEqual(s.level.pitches[0]);
    s.selectLevel(999); expect(s.level.number).toBe(147);
    s.startTraining(); expect(s.screen).toBe('training'); expect(s.sessionId).not.toBeNull();
  });
  it('accepts only one answer per question and records shared statistics with the stage', () => {
    const s = new AppState(memoryStore()); train(s, 37);
    expect(s.answer(0)).toBe(false);
    const q = s.newQuestion()!; expect(s.newQuestion()).toBeNull();
    expect(s.answer(99)).toBe(false);
    expect(s.answer(q.pitch.pitchClass, 1000)).toBe(true);
    expect(s.answer(q.pitch.pitchClass)).toBe(false);
    expect(s.getAttempts()).toHaveLength(1);
    expect(s.getAttempts()[0]).toMatchObject({ scenario: 2, correct: true, timbre: q.timbre, playedMidi: q.pitch.midi });
    expect(s.sessionSummary?.percentage).toBe(100);
  });
  it('saves streaks, resets them on error, and restores the shared settings', () => {
    const store = memoryStore(), s = new AppState(store); train(s);
    correct(s); s.toggleLoop(); s.toggleAccidentals(); s.setVolume(.4);
    const restored = new AppState(store);
    expect(restored.streak).toBe(1); expect(restored.loopNote).toBe(false);
    expect(restored.accidentals).toBe('flats'); expect(restored.volume).toBe(.4);
    const q = s.newQuestion()!;
    const wrong = s.level.answerClasses.find(pc => pc !== q.pitch.pitchClass)!;
    s.answer(wrong); expect(s.streak).toBe(0); expect(s.feedback?.correct).toBe(false);
    expect(s.feedback?.distance.semitones).toBeGreaterThan(0);
    expect(s.progress.bestStreaks[1]).toBe(1);
  });
  it.each([36, 69, 103, 138])('completes level %i and advances into the next stage', level => {
    const store = memoryStore();
    saveProgress(store, 'Hombre', { ...emptyProgress(), streaks: { [level]: 19 } });
    const s = new AppState(store); train(s, level); correct(s);
    expect(s.screen).toBe('victory'); expect(s.progress.completed).toContain(level);
    expect(s.nextLevel()?.world).toBe(s.level.world + 1);
    expect(s.newQuestion()).toBeNull(); s.advanceLevel();
    expect(s.level.number).toBe(level + 1); expect(s.screen).toBe('warmup');
  });
  it('can complete a previously completed level again and finishes at 147', () => {
    const store = memoryStore(); saveProgress(store, 'Hombre', { ...emptyProgress(), completed: [147], streaks: { 147: 19 } });
    const s = new AppState(store); train(s, 147); correct(s);
    expect(s.screen).toBe('victory'); expect(s.nextLevel()).toBeUndefined();
    s.advanceLevel(); expect(s.level.number).toBe(147); expect(s.progress.completed).toEqual([147]);
  });
  it('keeps sequence progress independent and clears only the selected sequence statistics', () => {
    const store = memoryStore(), s = new AppState(store); train(s); correct(s);
    s.selectSequence('Mujer'); expect(s.streak).toBe(0); train(s); correct(s);
    s.clearStatistics(); expect(s.streak).toBe(1);
    expect(s.getAttempts().map(a => a.sequence)).toEqual(['Hombre']);
    s.selectSequence('Hombre'); expect(s.streak).toBe(1);
    expect(new AppState(store).getAttempts()).toHaveLength(1);
  });
  it('resumes at the first unfinished level and remembers the last statistics level', () => {
    const store = memoryStore(); saveProgress(store, 'Hombre', { ...emptyProgress(), completed: [1, 2, 4] });
    const s = new AppState(store); expect(s.continueLevel()).toBe(3);
    train(s, 37); correct(s); s.selectWorld(2); s.openStatistics();
    expect(s.statsLevel).toBe(37); expect(s.statsReturn).toBe('levels');
    expect(s.question).toBeNull();
  });
  it('keeps answers and progress in memory when storage fails', () => {
    const s = new AppState({ getItem: () => null, setItem: () => { throw new Error('quota'); } });
    train(s); correct(s); expect(s.storageWarning).toBe(true);
    expect(s.streak).toBe(1); expect(s.getAttempts()).toHaveLength(1);
  });
  it('ignores the legacy statistics and refreshes shared progress outside training', () => {
    const store = memoryStore(); store.setItem('ap_multi_note_accuracy_stats', '{"C":123}');
    const s = new AppState(store); expect(s.getAttempts()).toEqual([]);
    saveProgress(store, 'Hombre', { ...emptyProgress(), completed: [1] });
    s.refreshSharedData(); expect(s.continueLevel()).toBe(2);
    train(s); saveProgress(store, 'Hombre', emptyProgress());
    s.refreshSharedData(); expect(s.progress.completed).toEqual([1]);
  });
  it('starts a new session on each entry without resetting the saved streak', () => {
    const s = new AppState(memoryStore()); train(s); correct(s); s.selectLevel(1); s.startTraining();
    expect(s.sessionSummary).toBeNull(); expect(s.streak).toBe(1);
  });
});

describe('rest reminder', () => {
  it('fills in one minute and never prevents another question', () => {
    expect(restProgress(null, 0)).toBe(0); expect(restProgress(1000, 0)).toBe(0);
    expect(restProgress(1000, 31000)).toBe(.5); expect(restProgress(1000, 61000)).toBe(1);
    expect(restProgress(1000, 90000)).toBe(1);
    const s = new AppState(memoryStore()); train(s); correct(s, 1000);
    expect(s.answeredAt).toBe(1000); expect(s.newQuestion()).not.toBeNull(); expect(s.answeredAt).toBeNull();
  });
});
