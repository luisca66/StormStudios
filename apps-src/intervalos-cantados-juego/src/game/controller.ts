import { Challenge, LEVEL_INTERVALS, getChallengesForInterval, noteSpellingMatches, shuffle } from "@/music/core";
import { AudioEngine } from "@/audio/engine";
import { MicPitchDetector } from "@/audio/pitch";

export type ScreenType = "menu" | "setup" | "game";

export interface GameState {
  screen: ScreenType;
  selectedLevel: number;
  selectedInstrument: string;
  difficulty: string;
  score: number;
  streak: number;
  strikes: number;
  maxStrikes: number;
  challenges: Challenge[];
  currentIdx: number;
  currentChallenge: Challenge | null;
  pitchHoldTime: number; // 0.0 to 1.0
  missileCharged: boolean;
  missileInFlight: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
  isLoadingMic: boolean;
  micError: string | null;
  feedbackMessage: string | null;
  feedbackKind: "correct" | "wrong" | "info" | null;
}

type Listener = (state: GameState) => void;

export class GameController {
  private state: GameState;
  private listeners: Set<Listener> = new Set();
  private pitchIntervalId: any = null;
  // Concrete timbre per challenge (resolved once so "Aleatorio" replays the same sample)
  private challengeInstruments: string[] = [];
  private currentNoteUrl: string | null = null;
  // Invalidates async work (sample loads, timers) from previous games/challenges
  private gameEpoch = 0;
  private lastReplayAt = 0;

  constructor(
    readonly audio: AudioEngine,
    readonly mic: MicPitchDetector
  ) {
    this.state = {
      screen: "menu",
      selectedLevel: 1,
      selectedInstrument: "Piano",
      difficulty: "Normal",
      score: 0,
      streak: 0,
      strikes: 0,
      maxStrikes: 3,
      challenges: [],
      currentIdx: 0,
      currentChallenge: null,
      pitchHoldTime: 0.0,
      missileCharged: false,
      missileInFlight: false,
      isGameOver: false,
      isLevelComplete: false,
      isLoadingMic: false,
      micError: null,
      feedbackMessage: null,
      feedbackKind: null
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

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  private patch(update: Partial<GameState>): void {
    this.state = { ...this.state, ...update };
    this.emit();
  }

  setScreen(screen: ScreenType): void {
    if (screen === "menu") {
      this.gameEpoch++;
      this.stopPitchMonitoring();
      this.mic.stopListening();
      this.audio.stopAllSFX();
      this.audio.stopNote();
    }
    this.patch({ screen });
  }

  selectLevel(level: number): void {
    this.patch({ selectedLevel: level });
  }

  selectInstrument(inst: string): void {
    this.patch({ selectedInstrument: inst });
  }

  selectDifficulty(diff: string): void {
    this.patch({ difficulty: diff });
  }

  async initMic(): Promise<boolean> {
    this.patch({ isLoadingMic: true, micError: null });
    try {
      await this.audio.resume();
      await this.mic.ensureReady();
      this.patch({ isLoadingMic: false });
      return true;
    } catch (err: any) {
      console.error(err);
      let errMsg = "No se pudo acceder al micrófono. Revisa los permisos.";
      if (err.message === "microphone-unsupported") {
        errMsg = "El micrófono requiere conexión segura HTTPS o localhost.";
      }
      this.patch({ isLoadingMic: false, micError: errMsg });
      return false;
    }
  }

  startGame(): void {
    const levelKey = LEVEL_INTERVALS[this.state.selectedLevel] || "5J";
    let list = getChallengesForInterval(levelKey);
    if (list.length === 0) {
      // Fallback
      list = getChallengesForInterval("5J");
    }
    list = shuffle(list);

    this.gameEpoch++;
    this.challengeInstruments = list.map(() =>
      this.audio.resolveInstrument(this.state.selectedInstrument)
    );

    this.patch({
      screen: "game",
      score: 0,
      streak: 0,
      strikes: 0,
      challenges: list,
      currentIdx: 0,
      currentChallenge: null,
      pitchHoldTime: 0.0,
      missileCharged: false,
      missileInFlight: false,
      isGameOver: false,
      isLevelComplete: false,
      feedbackMessage: "Prepárate...",
      feedbackKind: "info"
    });

    this.audio.stopAllSFX();
    this.startChallenge();
  }

  private async startChallenge(): Promise<void> {
    const { challenges, currentIdx } = this.state;
    const epoch = this.gameEpoch;

    if (currentIdx >= challenges.length) {
      this.patch({
        isLevelComplete: true,
        feedbackMessage: "¡NIVEL COMPLETADO!",
        feedbackKind: "correct"
      });
      this.stopPitchMonitoring();
      this.mic.stopListening();
      return;
    }

    const ch = challenges[currentIdx];
    this.patch({
      currentChallenge: null,
      pitchHoldTime: 0.0,
      missileCharged: false,
      missileInFlight: false,
      feedbackMessage: "Escucha la nota...",
      feedbackKind: "info"
    });

    this.stopPitchMonitoring();
    this.mic.stopListening();

    // 1. Make sure the root note sample is in memory BEFORE the challenge goes
    // live: both the enemy movement (engine) and the 3s mic timer key off the
    // moment currentChallenge is published, so the note is always heard first.
    // If the network stalls (>6s) we proceed anyway rather than hang the game.
    const instrument = this.challengeInstruments[currentIdx]
      ?? this.audio.resolveInstrument(this.state.selectedInstrument);
    const noteUrl = this.audio.noteUrl(instrument, ch.rootMidi);
    await Promise.race([
      this.audio.loadNote(noteUrl).catch(() => {}),
      new Promise(resolve => setTimeout(resolve, 6000))
    ]);
    if (this.gameEpoch !== epoch || this.state.screen !== "game" || this.state.currentIdx !== currentIdx || this.state.isGameOver) return;

    // 2. Publish the challenge and play the root note
    this.currentNoteUrl = noteUrl;
    this.patch({ currentChallenge: ch });
    this.audio.playNoteUrl(noteUrl);

    // Prefetch the next challenge's sample in the background
    const next = challenges[currentIdx + 1];
    if (next) {
      const nextInstrument = this.challengeInstruments[currentIdx + 1] ?? instrument;
      this.audio.loadNote(this.audio.noteUrl(nextInstrument, next.rootMidi)).catch(() => {});
    }

    // 3. Wait 3 seconds (GameManager.ROOT_SAMPLE_SECONDS) before starting movement and mic listening
    setTimeout(() => {
      if (this.gameEpoch !== epoch || this.state.screen !== "game" || this.state.currentIdx !== currentIdx || this.state.isGameOver) return;

      this.patch({
        feedbackMessage: "¡Canta el intervalo!",
        feedbackKind: null
      });

      // Start looping enemy sound
      this.audio.playSFX("enemy", true, 0.45, this.state.selectedLevel);

      // Start listening
      const targetFreq = this.getTargetFrequency();
      this.mic.startListening(targetFreq);
      this.startPitchMonitoring();
    }, 3000);
  }

  // Replays the current challenge's root note (same sample/timbre). Wired to
  // the 🔊 button and to clicking/tapping the enemy on the canvas.
  replayNote(): void {
    const s = this.state;
    if (s.screen !== "game" || !s.currentChallenge || s.isGameOver || s.isLevelComplete) return;
    if (!this.currentNoteUrl) return;

    const now = performance.now();
    if (now - this.lastReplayAt < 350) return; // throttle spam clicks
    this.lastReplayAt = now;

    this.audio.playNoteUrl(this.currentNoteUrl);
  }

  private getTargetFrequency(): number {
    const { currentChallenge } = this.state;
    if (!currentChallenge) return 0;
    
    // In Godot: get_sung_target_midi(root_midi, semitones, direction)
    // which adds sample midi offset (-12) and semitones * direction.
    // sample_midi = root_midi + (-12)
    // target_midi = sample_midi + semitones * direction
    const levelKey = LEVEL_INTERVALS[this.state.selectedLevel] || "5J";
    // Prefer the challenge's own interval tag (essential for "ALL" mixed mode)
    const key = currentChallenge.intervalKey ?? (levelKey === "ALL" ? "5J" : levelKey);
    const semitones = getIntervalSemitones(key);

    const sampleMidi = currentChallenge.rootMidi - 12;
    const targetMidi = sampleMidi + semitones * currentChallenge.direction;
    
    // Convert target MIDI number to frequency
    return 440.0 * Math.pow(2.0, (targetMidi - 69.0) / 12.0);
  }

  private startPitchMonitoring(): void {
    this.stopPitchMonitoring();

    // The hold logic lives in MicPitchDetector (sustained-singing state machine
    // timed by the audio clock); this interval only mirrors its progress into
    // the game state and fires the charge event.
    this.pitchIntervalId = setInterval(() => {
      if (this.state.missileCharged || this.state.missileInFlight || this.state.isGameOver) return;

      const micState = this.mic.getCurrentState();
      const pitchHoldTime = micState.holdProgress;

      if (pitchHoldTime >= 1.0) {
        this.patch({ pitchHoldTime: 1.0, missileCharged: true, feedbackMessage: "¡Misil cargado! Escribe la nota" });
        this.audio.playSFX("clank", false, 0.9, this.state.selectedLevel);
        return;
      }

      if (pitchHoldTime !== this.state.pitchHoldTime) {
        this.patch({ pitchHoldTime });
      }
    }, 50);
  }

  private stopPitchMonitoring(): void {
    if (this.pitchIntervalId) {
      clearInterval(this.pitchIntervalId);
      this.pitchIntervalId = null;
    }
  }

  submitAnswer(noteSpelling: string): void {
    if (!this.state.missileCharged || this.state.missileInFlight || this.state.isGameOver || this.state.isLevelComplete) return;

    const { currentChallenge } = this.state;
    if (!currentChallenge) return;

    if (noteSpellingMatches(noteSpelling, currentChallenge.answer)) {
      this.patch({
        missileInFlight: true,
        feedbackMessage: "¡Objetivo fijado! Fuego",
        feedbackKind: "correct"
      });
      // This will be called from game engine when missile hits enemy
    } else {
      this.patch({
        feedbackMessage: "Respuesta incorrecta. ¡Intenta de nuevo!",
        feedbackKind: "wrong"
      });
    }
  }

  triggerMissileFire(): void {
    this.audio.playSFX("shot", false, 0.8, this.state.selectedLevel);
  }

  onEnemyDestroyed(): void {
    // Enemy was shot and destroyed
    this.audio.stopSFX("enemy", this.state.selectedLevel);
    this.audio.playSFX("muere-enemigo", false, 0.85, this.state.selectedLevel);

    const nextIdx = this.state.currentIdx + 1;
    this.patch({
      score: this.state.score + 100 + this.state.streak * 10,
      streak: this.state.streak + 1,
      currentIdx: nextIdx,
      currentChallenge: null,
      pitchHoldTime: 0.0,
      missileCharged: false,
      missileInFlight: false,
      feedbackMessage: "¡Excelente!",
      feedbackKind: "correct"
    });

    this.stopPitchMonitoring();
    this.mic.stopListening();

    setTimeout(() => {
      if (this.state.screen === "game" && !this.state.isGameOver) {
        this.startChallenge();
      }
    }, 2000);
  }

  onMissileMissed(): void {
    this.patch({
      missileInFlight: false,
      missileCharged: true,
      feedbackMessage: "¡Apuntado fallido! Intenta de nuevo",
      feedbackKind: "info"
    });
  }

  onEnemyReached(): void {
    // Enemy reached the player (strike!)
    this.audio.stopSFX("enemy", this.state.selectedLevel);
    this.audio.playSFX("muere-enemigo", false, 0.7, this.state.selectedLevel); // Crash sound

    const strikes = this.state.strikes + 1;
    const isGameOver = strikes >= this.state.maxStrikes;
    const nextIdx = this.state.currentIdx + 1;

    this.patch({
      streak: 0,
      strikes,
      isGameOver,
      currentIdx: nextIdx,
      currentChallenge: null,
      pitchHoldTime: 0.0,
      missileCharged: false,
      missileInFlight: false,
      feedbackMessage: isGameOver ? "¡FIN DEL JUEGO!" : "¡Impacto recibido!",
      feedbackKind: "wrong"
    });

    this.stopPitchMonitoring();
    this.mic.stopListening();

    if (isGameOver) {
      return;
    }

    setTimeout(() => {
      if (this.state.screen === "game" && !this.state.isGameOver) {
        this.startChallenge();
      }
    }, 2000);
  }
}

function getIntervalSemitones(intervalKey: string): number {
  const map: Record<string, number> = {
    "2m": 1, "2M": 2, "3m": 3, "3M": 4, "4J": 5, "5J": 7, "6m": 8, "6M": 9, "7m": 10, "7M": 11, "9m": 13, "9M": 14
  };
  return map[intervalKey] ?? 7;
}
