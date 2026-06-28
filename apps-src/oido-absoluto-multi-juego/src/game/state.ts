import { AudioEngine } from "@/audio/engine";

export interface Note {
  note_index: number; // 0-11 for C to B
  octave: number;     // 3 or 4
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  groups: Note[][];
  groupLabels: string[];
  arenaSize: number;
}

export interface GameState {
  currentLevel: number;
  score: number;
  streak: number;
  maxStreakToUnlock: number;
  selectedNotes: Note[];
  selectedInstrument: string;
  isPlaying: boolean;
  isGateUnlocked: boolean;
  isLevelComplete: boolean;
  activeScreen: "menu" | "note-selection" | "warmup" | "gameplay" | "victory";
  currentChallenge: Note | null;
  volume: number;
}

export class GameStateManager {
  private state: GameState;
  private subscribers: ((state: GameState) => void)[] = [];
  
  public readonly levels: Record<number, LevelConfig> = {
    1: {
      id: 1,
      name: "La Pradera",
      subtitle: "Nivel 1 — Cuarta Aumentada (Tritono)",
      arenaSize: 300,
      groups: [
        [{ note_index: 0, octave: 3 }, { note_index: 6, octave: 3 }, { note_index: 0, octave: 4 }],
        [{ note_index: 1, octave: 3 }, { note_index: 7, octave: 3 }, { note_index: 1, octave: 4 }],
        [{ note_index: 2, octave: 3 }, { note_index: 8, octave: 3 }, { note_index: 2, octave: 4 }],
        [{ note_index: 3, octave: 3 }, { note_index: 9, octave: 3 }, { note_index: 3, octave: 4 }],
        [{ note_index: 4, octave: 3 }, { note_index: 10, octave: 3 }, { note_index: 4, octave: 4 }],
        [{ note_index: 5, octave: 3 }, { note_index: 11, octave: 3 }, { note_index: 5, octave: 4 }]
      ],
      groupLabels: [
        "C3 · F#3 · C4",
        "C#3 · G3 · C#4",
        "D3 · G#3 · D4",
        "D#3 · A3 · D#4",
        "E3 · A#3 · E4",
        "F3 · B3 · F4"
      ]
    },
    2: {
      id: 2,
      name: "El Océano",
      subtitle: "Nivel 2 — Tercera Mayor (Acorde Aumentado)",
      arenaSize: 300,
      groups: [
        [{ note_index: 0, octave: 3 }, { note_index: 4, octave: 3 }, { note_index: 8, octave: 3 }, { note_index: 0, octave: 4 }],
        [{ note_index: 1, octave: 3 }, { note_index: 5, octave: 3 }, { note_index: 9, octave: 3 }, { note_index: 1, octave: 4 }],
        [{ note_index: 2, octave: 3 }, { note_index: 6, octave: 3 }, { note_index: 10, octave: 3 }, { note_index: 2, octave: 4 }],
        [{ note_index: 3, octave: 3 }, { note_index: 7, octave: 3 }, { note_index: 11, octave: 3 }, { note_index: 3, octave: 4 }]
      ],
      groupLabels: [
        "C3 · E3 · G#3 · C4",
        "C#3 · F3 · A3 · C#4",
        "D3 · F#3 · A#3 · D4",
        "D#3 · G3 · B3 · D#4"
      ]
    },
    3: {
      id: 3,
      name: "El Cosmos",
      subtitle: "Nivel 3 — Tercera Menor (Acorde Disminuido)",
      arenaSize: 700,
      groups: [
        [{ note_index: 0, octave: 3 }, { note_index: 3, octave: 3 }, { note_index: 6, octave: 3 }, { note_index: 9, octave: 3 }, { note_index: 0, octave: 4 }],
        [{ note_index: 1, octave: 3 }, { note_index: 4, octave: 3 }, { note_index: 7, octave: 3 }, { note_index: 10, octave: 3 }, { note_index: 1, octave: 4 }],
        [{ note_index: 2, octave: 3 }, { note_index: 5, octave: 3 }, { note_index: 8, octave: 3 }, { note_index: 11, octave: 3 }, { note_index: 2, octave: 4 }]
      ],
      groupLabels: [
        "C3 · D#3 · F#3 · A3 · C4",
        "C#3 · E3 · G3 · A#3 · C#4",
        "D3 · F3 · G#3 · B3 · D4"
      ]
    },
    4: {
      id: 4,
      name: "El Pantano",
      subtitle: "Nivel 4 — Segunda Mayor (Escala de Tonos Enteros)",
      arenaSize: 280,
      groups: [
        [
          { note_index: 0, octave: 3 },
          { note_index: 2, octave: 3 },
          { note_index: 4, octave: 3 },
          { note_index: 6, octave: 3 },
          { note_index: 8, octave: 3 },
          { note_index: 10, octave: 3 },
          { note_index: 0, octave: 4 }
        ],
        [
          { note_index: 1, octave: 3 },
          { note_index: 3, octave: 3 },
          { note_index: 5, octave: 3 },
          { note_index: 7, octave: 3 },
          { note_index: 9, octave: 3 },
          { note_index: 11, octave: 3 },
          { note_index: 1, octave: 4 }
        ]
      ],
      groupLabels: [
        "C3 · D3 · E3 · F#3 · G#3 · A#3 · C4",
        "C#3 · D#3 · F3 · G3 · A3 · B3 · C#4"
      ]
    },
    5: {
      id: 5,
      name: "Las Nubes",
      subtitle: "Nivel 5 — Escala Cromática Completa",
      arenaSize: 400,
      groups: [
        [
          { note_index: 0, octave: 3 }, { note_index: 1, octave: 3 },
          { note_index: 2, octave: 3 }, { note_index: 3, octave: 3 },
          { note_index: 4, octave: 3 }, { note_index: 5, octave: 3 },
          { note_index: 6, octave: 3 }, { note_index: 7, octave: 3 },
          { note_index: 8, octave: 3 }, { note_index: 9, octave: 3 },
          { note_index: 10, octave: 3 }, { note_index: 11, octave: 3 },
          { note_index: 0, octave: 4 }
        ]
      ],
      groupLabels: [
        "C3 · C#3 · D3 · D#3 · E3 · F3 · F#3 · G3 · G#3 · A3 · A#3 · B3 · C4"
      ]
    }
  };

  public readonly noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  
  constructor(private audio: AudioEngine) {
    this.state = {
      currentLevel: 1,
      score: 0,
      streak: 0,
      maxStreakToUnlock: 20,
      selectedNotes: [],
      selectedInstrument: "Piano",
      isPlaying: false,
      isGateUnlocked: false,
      isLevelComplete: false,
      activeScreen: "menu",
      currentChallenge: null,
      volume: audio.getVolume()
    };
  }

  getState(): GameState {
    return this.state;
  }

  subscribe(callback: (state: GameState) => void): () => void {
    this.subscribers.push(callback);
    callback(this.state);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  private notify(): void {
    for (const callback of this.subscribers) {
      callback(this.state);
    }
  }

  updateVolume(val: number): void {
    this.state.volume = val;
    this.audio.setVolume(val);
    this.notify();
  }

  selectLevel(levelId: number): void {
    this.state.currentLevel = levelId;
    this.state.activeScreen = "note-selection";
    this.state.score = 0;
    this.state.streak = 0;
    this.state.isGateUnlocked = false;
    this.state.isLevelComplete = false;
    this.state.currentChallenge = null;
    this.notify();
  }

  selectInstrument(inst: string): void {
    this.state.selectedInstrument = inst;
    this.notify();
  }

  selectNoteGroup(groupIndex: number): void {
    const levelConfig = this.levels[this.state.currentLevel];
    this.state.selectedNotes = levelConfig.groups[groupIndex];
    this.state.activeScreen = "warmup";
    this.audio.preloadNotes(this.state.selectedNotes, this.state.selectedInstrument);
    this.notify();
  }

  confirmWarmup(): void {
    this.state.activeScreen = "gameplay";
    this.state.isPlaying = true;
    this.audio.startMusic(this.state.currentLevel);
    this.notify();
  }

  setChallenge(note: Note): void {
    this.state.currentChallenge = note;
    this.notify();
  }

  checkAnswer(guessedIndex: number, guessedOctave: number): boolean {
    if (!this.state.currentChallenge) return false;

    const isCorrect = guessedIndex === this.state.currentChallenge.note_index &&
                      guessedOctave === this.state.currentChallenge.octave;

    this.audio.nextTrack(); // Godot calls AudioManager.next_track() to clear audio reference memory

    if (isCorrect) {
      this.state.streak++;
      this.state.score++;
      this.audio.playCorrect();
      if (this.state.streak >= this.state.maxStreakToUnlock) {
        this.state.isGateUnlocked = true;
      }
    } else {
      this.state.streak = 0;
      this.state.score = 0;
      this.audio.playWrong();
      this.state.isGateUnlocked = false;
    }

    this.state.currentChallenge = null;
    this.notify();
    return isCorrect;
  }

  completeLevel(): void {
    this.state.isLevelComplete = true;
    this.state.activeScreen = "victory";
    this.state.isPlaying = false;
    this.audio.stopMusic();
    this.audio.stopAllLoops();
    this.notify();
  }

  backToMenu(): void {
    this.state.activeScreen = "menu";
    this.state.isPlaying = false;
    this.state.score = 0;
    this.state.streak = 0;
    this.state.isGateUnlocked = false;
    this.state.isLevelComplete = false;
    this.state.currentChallenge = null;
    this.audio.stopMusic();
    this.audio.stopAllLoops();
    this.notify();
  }

  advanceLevel(): void {
    let nextLvl = this.state.currentLevel + 1;
    if (nextLvl > 5) nextLvl = 1;
    this.selectLevel(nextLvl);
  }
}
