// GameStateManager (PLAN §7.1): máquina de estados de la cuerda amarrada,
// score/racha y temporizador de viento. Lógica pura con eventos (observer):
// 3d/ y ui/ se suscriben — este módulo NO los importa (regla §11).

import { GAMEPLAY, LAYER_BONUS, MODES, type GameMode } from "@/config";
import type { ChordType } from "@/music/chords";

export interface ActiveString {
  stringId: number;
  type: ChordType;
  rootMidi: number;
  noteMidis: number[]; // octava literal r+i, sin plegado (§3.4)
  litCount: number; // linternas encendidas; la activa es noteMidis[litCount]
  timer: number; // segundos restantes de viento
  timerMax: number;
  multiplier: number; // Ballena Celeste ×2 (§7.5)
}

export interface StateEvents {
  docked: (s: ActiveString) => void;
  lantern: (index: number, midi: number, s: ActiveString) => void;
  completed: (s: ActiveString) => void;
  expired: (s: ActiveString) => void;
  released: (s: ActiveString) => void;
  score: (score: number, streak: number) => void;
  timer: (frac: number) => void;
  quota: (done: number, quota: number) => void;
  layerCleared: (layer: number) => void; // cuota cumplida: la esclusa se abre
  gas: (seconds: number) => void; // Contrarreloj (§7.4)
  fabric: (left: number) => void; // Supervivencia: integridad de la tela
  gameOver: (reason: "gas" | "fabric") => void;
}

export class GameState {
  score = 0;
  streak = 0;
  bestStreak = 0;
  totalCompleted = 0;
  paused = false;
  active: ActiveString | null = null;
  mode: GameMode = "EXPEDITION";
  currentLayer = 1;
  completedInLayer = 0;
  gas = 0; // segundos (solo Contrarreloj)
  fabric = 0; // integridad restante (solo Supervivencia)
  private clearedLayers = new Set<number>();

  private listeners = new Map<keyof StateEvents, ((...args: unknown[]) => void)[]>();

  on<K extends keyof StateEvents>(event: K, cb: StateEvents[K]): void {
    const arr = this.listeners.get(event) ?? [];
    arr.push(cb as (...args: unknown[]) => void);
    this.listeners.set(event, arr);
  }

  private emit<K extends keyof StateEvents>(
    event: K,
    ...args: Parameters<StateEvents[K]>
  ): void {
    for (const cb of this.listeners.get(event) ?? []) cb(...args);
  }

  reset(): void {
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.totalCompleted = 0;
    this.active = null;
    this.paused = false;
    this.completedInLayer = 0;
    this.clearedLayers.clear();
    this.emit("score", 0, 0);
  }

  /** Arranque de partida (F7/F8): fija modo, capa inicial y recursos. */
  startRun(mode: GameMode, layer: number): void {
    this.reset();
    this.mode = mode;
    this.currentLayer = layer;
    this.emit("quota", 0, this.quota());
    if (mode === "TIME_ATTACK") {
      this.gas = MODES.TIME_ATTACK.gasStart;
      this.emit("gas", this.gas);
    } else if (mode === "SURVIVAL") {
      this.fabric = MODES.SURVIVAL.fabric;
      this.emit("fabric", this.fabric);
    }
  }

  quota(): number {
    return MODES[this.mode].quota;
  }

  isLayerCleared(layer: number): boolean {
    return this.clearedLayers.has(layer);
  }

  /** El jugador cruzó a otra capa (la esclusa estaba abierta). */
  enterLayer(layer: number): void {
    this.currentLayer = layer;
    this.completedInLayer = this.clearedLayers.has(layer) ? this.quota() : 0;
    this.emit("quota", this.completedInLayer, this.quota());
  }

  /** Amarrar. Si había otra cuerda, se suelta ANTES sin penalización (§7.1). */
  dock(stringId: number, type: ChordType, rootMidi: number, multiplier = 1): ActiveString {
    const noteMidis = type.intervals.map((i) => rootMidi + i);
    const timerMax = GAMEPLAY.windTimerBase + GAMEPLAY.windTimerPerNote * noteMidis.length;
    this.active = {
      stringId, type, rootMidi, noteMidis, litCount: 0, timer: timerMax, timerMax, multiplier,
    };
    this.emit("docked", this.active);
    // En Contrarreloj NO hay temporizador de viento: el gas ya presiona (§7.2).
    if (this.mode !== "TIME_ATTACK") this.emit("timer", 1);
    return this.active;
  }

  /** Cambiar de cuerda: la anterior vuelve a intacta, sin racha perdida. */
  undockSoft(): void {
    this.active = null;
  }

  /** La linterna activa completó su hold de 1.5 s. */
  lanternLit(): void {
    const s = this.active;
    if (!s) return;
    const index = s.litCount;
    s.litCount++;
    this.score += 2 * s.multiplier; // +2 por linterna (§7.4; ballena ×2)
    if (this.mode === "TIME_ATTACK") {
      this.gas += MODES.TIME_ATTACK.gasPerLantern; // +6 s por linterna
      this.emit("gas", this.gas);
    }
    this.emit("lantern", index, s.noteMidis[index], s);
    if (s.litCount >= s.noteMidis.length) {
      // Cuerda COMPLETADA: racha += 1; score += 10 + racha×2 (§7.1).
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += (10 + this.streak * 2) * s.multiplier;
      this.totalCompleted++;
      this.active = null;
      // Avance de cuota de la capa (§7.4); bonus al completarla.
      if (!this.clearedLayers.has(this.currentLayer)) {
        this.completedInLayer++;
        this.emit("quota", this.completedInLayer, this.quota());
        if (this.completedInLayer >= this.quota()) {
          this.clearedLayers.add(this.currentLayer);
          this.score += LAYER_BONUS;
          this.emit("layerCleared", this.currentLayer);
        }
      }
      if (this.mode === "TIME_ATTACK") {
        this.gas += MODES.TIME_ATTACK.gasPerString; // +15 s por cuerda completa
        this.emit("gas", this.gas);
      }
      this.emit("completed", s);
    }
    this.emit("score", this.score, this.streak);
  }

  /** S sostenida: abandona sin completar — racha a 0, sin más castigo. */
  release(): void {
    const s = this.active;
    if (!s) return;
    this.streak = 0;
    this.active = null;
    this.emit("released", s);
    this.emit("score", this.score, this.streak);
  }

  setPaused(p: boolean): void {
    this.paused = p;
  }

  /** Bonus externo (medallas de precisión §7.4). */
  addScore(n: number): void {
    if (n === 0) return;
    this.score += n;
    this.emit("score", this.score, this.streak);
  }

  /** Avanza temporizador de viento y gas (congelados en pausa §7.1/§16). */
  update(dt: number): void {
    if (this.paused) return;

    // Gas del quemador (Contrarreloj): corre SIEMPRE, amarrado o no.
    if (this.mode === "TIME_ATTACK" && this.gas > 0) {
      this.gas -= dt;
      this.emit("gas", Math.max(0, this.gas));
      if (this.gas <= 0) {
        this.emit("gameOver", "gas");
        return;
      }
    }

    const s = this.active;
    if (!s || this.mode === "TIME_ATTACK") return;
    s.timer -= dt;
    this.emit("timer", Math.max(0, s.timer / s.timerMax));
    if (s.timer <= 0) {
      this.streak = 0;
      this.active = null;
      this.emit("expired", s);
      this.emit("score", this.score, this.streak);
      // Supervivencia: la cuerda perdida rasga la tela (§7.4).
      if (this.mode === "SURVIVAL") {
        this.fabric--;
        this.emit("fabric", this.fabric);
        if (this.fabric <= 0) this.emit("gameOver", "fabric");
      }
    }
  }
}
