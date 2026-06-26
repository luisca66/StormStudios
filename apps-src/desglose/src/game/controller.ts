/**
 * controller.ts — Estado y orquestación del juego.
 *
 * Mantiene la sesión (rango, instrumento, acorde actual, progreso) y coordina
 * el motor de audio, la captura de micrófono y la evaluación (`gradeAttempt`).
 * Notifica a la UI vía suscripción; la UI solo renderiza el estado.
 */
import {
  filterChromaticRange,
  generateChromaticNotes,
  generateRandomChord,
  gradeAttempt,
} from "@/lib/desglose/music";
import { AudioEngine } from "../audio/engine";
import { MicDeniedError, MicPitchDetector } from "../audio/pitch";
import {
  DEFAULT_CHORD_SIZE,
  DEFAULT_END,
  DEFAULT_INSTRUMENT,
  DEFAULT_START,
  DEFAULT_VOLUME,
  LISTEN_WINDOW_MS,
  RANGE_HIGH,
  RANGE_LOW,
  TUNING_TOLERANCE,
  type Instrument,
} from "../config";
import { strings, type Lang } from "../i18n";

export type ResultKind = "ok" | "error" | "info" | "none";

export interface GameState {
  startNote: string;
  endNote: string;
  instrument: Instrument;
  numberOfNotes: number;
  volume: number;
  currentChord: string[];
  correctlyAnswered: Set<string>;
  mutedNotes: Set<number>;
  noteBeingRecorded: string | null;
  questionText: string;
  resultMessage: string;
  resultKind: ResultKind;
  micDenied: boolean;
}

type Listener = (state: GameState) => void;

export class GameController {
  readonly allNotes: string[];
  private readonly engine = new AudioEngine();
  private readonly detector: MicPitchDetector;
  private readonly t: ReturnType<typeof strings>;
  private readonly listeners = new Set<Listener>();
  private state: GameState;

  constructor(lang: Lang) {
    this.t = strings(lang);
    this.allNotes = generateChromaticNotes(RANGE_LOW, RANGE_HIGH);
    this.detector = new MicPitchDetector(this.engine.context());
    this.state = {
      startNote: DEFAULT_START,
      endNote: DEFAULT_END,
      instrument: DEFAULT_INSTRUMENT,
      numberOfNotes: DEFAULT_CHORD_SIZE,
      volume: DEFAULT_VOLUME,
      currentChord: [],
      correctlyAnswered: new Set(),
      mutedNotes: new Set(),
      noteBeingRecorded: null,
      questionText: this.t.promptStart,
      resultMessage: "",
      resultKind: "none",
      micDenied: false,
    };
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private patch(partial: Partial<GameState>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) listener(this.state);
  }

  /** Desbloquea el audio y prepara el micrófono (desde el gesto de inicio). */
  async start(): Promise<void> {
    await this.engine.unlock();
    try {
      await this.detector.ensureReady();
    } catch (err) {
      if (err instanceof MicDeniedError) {
        this.patch({ micDenied: true });
      }
    }
  }

  setInstrument(instrument: Instrument): void {
    this.patch({ instrument });
  }

  setStartNote(startNote: string): void {
    this.patch({ startNote });
  }

  setEndNote(endNote: string): void {
    this.patch({ endNote });
  }

  setNumberOfNotes(numberOfNotes: number): void {
    this.patch({ numberOfNotes });
  }

  setVolume(volume: number): void {
    this.patch({ volume });
  }

  toggleMute(index: number): void {
    const muted = new Set(this.state.mutedNotes);
    if (muted.has(index)) muted.delete(index);
    else muted.add(index);
    this.patch({ mutedNotes: muted });
  }

  newQuestion(): void {
    const available = filterChromaticRange(
      this.allNotes,
      this.state.startNote,
      this.state.endNote,
    );
    const chord = generateRandomChord(available, this.state.numberOfNotes);
    if (chord.length === 0) {
      this.patch({
        currentChord: [],
        resultMessage: this.t.notEnoughNotes,
        resultKind: "error",
      });
      return;
    }
    this.patch({
      currentChord: chord,
      correctlyAnswered: new Set(),
      mutedNotes: new Set(),
      noteBeingRecorded: null,
      questionText: this.t.promptActive,
      resultMessage: "",
      resultKind: "none",
    });
    void this.engine.playChord(chord, this.state.instrument, new Set(), this.state.volume);
  }

  repeat(): void {
    if (this.state.currentChord.length === 0) return;
    void this.engine.playChord(
      this.state.currentChord,
      this.state.instrument,
      this.state.mutedNotes,
      this.state.volume,
    );
  }

  async listenForNote(expectedNote: string, label: string): Promise<void> {
    if (this.state.noteBeingRecorded !== null) return;
    this.patch({
      noteBeingRecorded: expectedNote,
      resultMessage: this.t.listeningFor(label),
      resultKind: "info",
    });

    try {
      const freqs = await this.detector.listen(LISTEN_WINDOW_MS);
      const grade = gradeAttempt(freqs, expectedNote, TUNING_TOLERANCE);
      const solved = new Set(this.state.correctlyAnswered);

      if (grade.correct) {
        solved.add(expectedNote);
        void this.engine.playFeedback(true, this.state.volume);
        this.patch({
          correctlyAnswered: solved,
          resultMessage: this.t.correct(expectedNote),
          resultKind: "ok",
        });
      } else {
        solved.delete(expectedNote);
        void this.engine.playFeedback(false, this.state.volume);
        const message =
          grade.reason === "silence"
            ? this.t.silence
            : grade.reason === "no-clear"
              ? this.t.noClear
              : this.t.incorrect;
        this.patch({
          correctlyAnswered: solved,
          resultMessage: message,
          resultKind: "error",
        });
      }
    } catch (err) {
      this.patch({
        micDenied: err instanceof MicDeniedError,
        resultMessage: err instanceof MicDeniedError ? this.t.micDenied : this.t.micError,
        resultKind: "error",
      });
    } finally {
      this.patch({ noteBeingRecorded: null });
    }
  }
}
