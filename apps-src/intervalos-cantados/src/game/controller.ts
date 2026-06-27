import { AudioEngine } from "@/audio/engine";
import { MicPitchDetector, MicUnsupportedError } from "@/audio/pitch";
import { INSTRUMENTS, LISTEN_WINDOW_MS, TUNING_TOLERANCE, type Instrument } from "@/config";
import { type Lang, strings } from "@/i18n";
import {
  INTERVALS,
  INTERVAL_BY_ID,
  createQuestion,
  gradePitch,
  normalizeName,
  randomItem,
  shuffle,
  startNotesFor,
  type Direction,
  type IntervalDef,
  type Question,
} from "@/music/core";
import { StatsRepository, type StatsMap } from "@/stats/repository";

export type Screen = "menu" | "setup" | "training" | "stats";
export type GameMode = "classic" | "time" | "survival";
export type TrainingType = "HYBRID" | "NOMENCLATURE_ONLY";
export type ResultKind = "" | "ok" | "warn" | "bad";
export type FlashState = "none" | "correct" | "wrong";

export interface SessionState {
  mode: GameMode;
  remainingTime: number;
  lives: number;
  timeScore: number;
  survivalScore: number;
  classicQuestions: number;
  classicErrors: number;
  ended: boolean;
  endReason: "timeout" | "lives" | null;
}

export interface AppState {
  lang: Lang;
  screen: Screen;
  selectedMode: GameMode;
  selectedDuration: number;
  trainingType: TrainingType;
  selectedInstrument: Instrument;
  selectedIntervalId: IntervalDef["id"] | null;
  session: SessionState | null;
  current: Question | null;
  answer: string;
  result: string;
  resultKind: ResultKind;
  flash: FlashState;
  processing: boolean;
  recording: boolean;
  confirmClear: boolean;
  stats: StatsMap;
}

type Listener = (state: AppState) => void;

export class GameController {
  readonly intervals = INTERVALS;
  readonly instruments = INSTRUMENTS;
  private readonly t: ReturnType<typeof strings>;
  private readonly statsRepository = new StatsRepository();
  private readonly listeners = new Set<Listener>();
  private questionPools: Partial<Record<string, string[]>> = {};
  private askedSet = new Set<string>();
  private timerId: number | null = null;
  private autoNextTimer: number | null = null;
  private state: AppState;

  constructor(
    readonly lang: Lang,
    private readonly audio: AudioEngine,
    private readonly mic: MicPitchDetector,
  ) {
    this.t = strings(lang);
    this.state = {
      lang,
      screen: "menu",
      selectedMode: "classic",
      selectedDuration: 60,
      trainingType: "HYBRID",
      selectedInstrument: "Piano",
      selectedIntervalId: null,
      session: null,
      current: null,
      answer: "",
      result: "",
      resultKind: "",
      flash: "none",
      processing: false,
      recording: false,
      confirmClear: false,
      stats: this.statsRepository.getStats(),
    };
  }

  getState(): AppState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  modeLabel(mode: GameMode): string {
    if (mode === "classic") return this.t.classicShort;
    if (mode === "time") return this.t.timeShort;
    return this.t.survivalShort;
  }

  intervalLabel(interval: IntervalDef): string {
    return interval[this.lang];
  }

  instrumentLabel(instrument: Instrument): string {
    if (instrument === "random") return this.t.randomInstrument;
    if (this.lang === "en") {
      const labels: Record<Exclude<Instrument, "random">, string> = {
        Piano: "Piano",
        Corno: "Horn",
        Coro: "Choir",
        Fagot: "Bassoon",
        Cello: "Cello",
      };
      return labels[instrument];
    }
    return instrument;
  }

  setDuration(duration: number): void {
    this.patch({ selectedDuration: duration });
  }

  openMode(mode: GameMode): void {
    this.clearTimers();
    this.audio.stopAll();
    this.patch({ screen: "setup", selectedMode: mode, session: null, current: null });
  }

  openMenu(): void {
    this.clearTimers();
    this.audio.stopAll();
    this.patch({ screen: "menu", session: null, current: null, confirmClear: false });
  }

  openSetup(): void {
    this.clearTimers();
    this.audio.stopAll();
    this.patch({ screen: "setup", session: null, current: null });
  }

  openStats(): void {
    this.clearTimers();
    this.audio.stopAll();
    this.patch({ screen: "stats", session: null, current: null, stats: this.statsRepository.getStats() });
  }

  setTrainingType(trainingType: TrainingType): void {
    this.patch({ trainingType });
  }

  setInstrument(selectedInstrument: Instrument): void {
    this.patch({ selectedInstrument });
  }

  startTraining(intervalId: IntervalDef["id"] | ""): void {
    this.clearTimers();
    this.resetQuestionMemory();
    this.patch({
      screen: "training",
      selectedIntervalId: intervalId === "" ? null : intervalId,
      session: this.createSession(this.state.selectedMode),
      current: null,
      answer: "",
      result: "",
      resultKind: "",
      flash: "none",
      processing: false,
      recording: false,
    });
    void this.audio.unlock().catch(() => undefined);
    this.newQuestion();
  }

  newQuestion(): void {
    const session = this.state.session;
    if (!session || session.ended || this.state.processing || this.state.recording) return;
    this.clearAutoNext();

    const current = this.generateQuestion();
    const nextSession =
      session.mode === "classic"
        ? { ...session, classicQuestions: session.classicQuestions + 1 }
        : session;

    this.patch({
      session: nextSession,
      current,
      answer: "",
      result: "",
      resultKind: "",
      flash: "none",
    });
    this.startTimerIfNeeded();

    if (this.state.trainingType === "HYBRID") {
      void this.audio.playNote(current.startNote, this.state.selectedInstrument).catch(() => undefined);
    }
  }

  repeatStartNote(): void {
    if (!this.state.current || this.state.trainingType !== "HYBRID") return;
    if (this.state.processing || this.state.recording) return;
    void this.audio.playNote(this.state.current.startNote, this.state.selectedInstrument).catch(() => undefined);
  }

  inputNoteKey(key: string): void {
    if (this.state.processing || this.state.recording || this.state.session?.ended) return;
    if (/^[A-G]$/.test(key)) {
      const accidental = this.state.answer.replace(/[A-G]/gi, "");
      this.patch({ answer: `${key}${accidental}`.slice(0, 3), result: "", resultKind: "" });
      return;
    }
    if (this.state.answer.match(/[A-G]/i)) {
      const letter = this.state.answer.match(/[A-G]/i)?.[0].toUpperCase() ?? "";
      this.patch({ answer: `${letter}${key}`, result: "", resultKind: "" });
    }
  }

  deleteNoteKey(): void {
    if (this.state.processing || this.state.recording || this.state.session?.ended) return;
    this.patch({ answer: this.state.answer.slice(0, -1) });
  }

  async submitAnswer(): Promise<void> {
    if (this.state.processing || this.state.recording || this.state.session?.ended) return;
    if (!this.state.current) {
      this.patch({ result: this.t.makeQuestionFirst, resultKind: "warn" });
      return;
    }
    if (!this.state.answer) {
      this.patch({ result: this.t.writeFirst, resultKind: "warn" });
      return;
    }

    this.patch({ processing: true });

    if (this.state.trainingType === "NOMENCLATURE_ONLY") {
      this.evaluateAnswer(null);
      return;
    }

    try {
      await this.audio.unlock();
      this.patch({ recording: true, result: this.t.singing, resultKind: "" });
      const frequencies = await this.mic.listen(LISTEN_WINDOW_MS);
      if (!this.state.session || this.state.session.ended) return;
      this.patch({ recording: false });
      this.evaluateAnswer(frequencies);
    } catch (error) {
      this.patch({
        processing: false,
        recording: false,
        result: error instanceof MicUnsupportedError ? this.t.micUnsupported : this.t.micBlocked,
        resultKind: "bad",
      });
    }
  }

  askClearStats(): void {
    this.patch({ confirmClear: true });
  }

  cancelClearStats(): void {
    this.patch({ confirmClear: false });
  }

  clearStats(): void {
    this.statsRepository.clear();
    this.patch({ stats: {}, confirmClear: false });
  }

  dispose(): void {
    this.clearTimers();
    this.mic.dispose();
    this.audio.stopAll();
  }

  private evaluateAnswer(frequencies: number[] | null): void {
    const current = this.state.current;
    if (!current || !this.state.session || this.state.session.ended) return;

    const isNameCorrect = normalizeName(current.expected) === normalizeName(this.state.answer);
    const detectedNothing: string = this.t.nothing;
    let isPitchCorrect = false;
    let isNoteClassCorrect = false;
    let detectedName = detectedNothing;

    if (this.state.trainingType !== "NOMENCLATURE_ONLY") {
      const pitch = gradePitch(frequencies ?? [], current.expected, TUNING_TOLERANCE);
      isPitchCorrect = pitch.pitchCorrect;
      isNoteClassCorrect = pitch.noteClassCorrect;
      detectedName = pitch.detectedName ?? detectedNothing;
    }

    const success =
      this.state.trainingType === "NOMENCLATURE_ONLY"
        ? isNameCorrect
        : isNameCorrect && isPitchCorrect;
    const result = this.resultMessage(success, isNameCorrect, isNoteClassCorrect, detectedName, current.expected);
    const resultKind = success ? "ok" : isNameCorrect && this.state.trainingType === "HYBRID" ? "warn" : "bad";

    this.statsRepository.record(current.statKey, success);
    const session = this.applyScore(success);
    this.patch({
      session,
      stats: this.statsRepository.getStats(),
      result,
      resultKind,
      flash: success ? "correct" : "wrong",
      processing: false,
      recording: false,
    });
    void this.audio.playFeedback(success).catch(() => undefined);

    if (!session || session.ended) return;
    if (session.mode === "survival" && session.lives <= 0) {
      this.autoNextTimer = window.setTimeout(() => this.endSession("lives"), 1400);
    } else if (session.mode !== "classic") {
      this.autoNextTimer = window.setTimeout(() => {
        this.autoNextTimer = null;
        this.newQuestion();
      }, 1800);
    }
  }

  private resultMessage(
    success: boolean,
    isNameCorrect: boolean,
    isNoteClassCorrect: boolean,
    detectedName: string,
    expected: string,
  ): string {
    if (this.state.trainingType === "NOMENCLATURE_ONLY") {
      return success ? this.t.perfectName(expected) : this.t.wrongName(expected);
    }
    if (success) return this.t.perfectHybrid;
    if (isNameCorrect && isNoteClassCorrect) return this.t.nameButLoose;
    if (isNameCorrect && detectedName === this.t.nothing) return this.t.nameButNoPitch;
    if (isNameCorrect) return this.t.nameButOther(detectedName);
    return this.t.tunedButNoName(expected, detectedName);
  }

  private applyScore(success: boolean): SessionState | null {
    const session = this.state.session;
    if (!session) return null;
    if (success && session.mode === "time") return { ...session, timeScore: session.timeScore + 1 };
    if (success && session.mode === "survival") return { ...session, survivalScore: session.survivalScore + 1 };
    if (!success && session.mode === "classic") return { ...session, classicErrors: session.classicErrors + 1 };
    if (!success && session.mode === "survival") return { ...session, lives: session.lives - 1 };
    return session;
  }

  private createSession(mode: GameMode): SessionState {
    return {
      mode,
      remainingTime: this.state.selectedDuration,
      lives: 3,
      timeScore: 0,
      survivalScore: 0,
      classicQuestions: 0,
      classicErrors: 0,
      ended: false,
      endReason: null,
    };
  }

  private generateQuestion(): Question {
    if (this.state.selectedIntervalId) {
      const interval = INTERVAL_BY_ID[this.state.selectedIntervalId];
      const direction: Direction = Math.random() < 0.5 ? "asc" : "desc";
      const startNote = this.nextStartFromPool(interval.id, direction);
      return createQuestion(interval, direction, startNote);
    }

    let candidate: Question | null = null;
    for (let attempt = 0; attempt < 1000 && !candidate; attempt += 1) {
      const interval = randomItem(INTERVALS);
      const direction: Direction = Math.random() < 0.5 ? "asc" : "desc";
      const startNote = randomItem(startNotesFor(direction));
      const key = `${interval.id}:${direction}:${startNote}`;
      if (!this.askedSet.has(key)) {
        this.askedSet.add(key);
        candidate = createQuestion(interval, direction, startNote);
      }
    }
    if (candidate) return candidate;

    this.askedSet.clear();
    const fallback = randomItem(INTERVALS);
    return createQuestion(fallback, "asc", randomItem(startNotesFor("asc")));
  }

  private nextStartFromPool(intervalId: string, direction: Direction): string {
    const key = `${intervalId}:${direction}`;
    if (!this.questionPools[key] || this.questionPools[key]?.length === 0) {
      this.questionPools[key] = shuffle(startNotesFor(direction));
    }
    return this.questionPools[key]?.pop() ?? randomItem(startNotesFor(direction));
  }

  private startTimerIfNeeded(): void {
    const session = this.state.session;
    if (!session || session.mode !== "time" || this.timerId !== null || session.ended) return;
    this.timerId = window.setInterval(() => {
      const current = this.state.session;
      if (!current || current.ended) return;
      const remainingTime = current.remainingTime - 1;
      if (remainingTime <= 0) {
        this.patch({ session: { ...current, remainingTime: 0 } });
        this.endSession("timeout");
      } else {
        this.patch({ session: { ...current, remainingTime } });
      }
    }, 1000);
  }

  private endSession(reason: "timeout" | "lives"): void {
    const session = this.state.session;
    if (!session) return;
    this.clearTimers();
    this.audio.stopAll();
    this.patch({
      session: { ...session, ended: true, endReason: reason },
      processing: false,
      recording: false,
      result: "",
      flash: "none",
    });
  }

  private resetQuestionMemory(): void {
    this.questionPools = {};
    this.askedSet = new Set();
  }

  private clearTimers(): void {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.clearAutoNext();
  }

  private clearAutoNext(): void {
    if (this.autoNextTimer !== null) {
      window.clearTimeout(this.autoNextTimer);
      this.autoNextTimer = null;
    }
  }

  private patch(partial: Partial<AppState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener(this.state);
  }
}
