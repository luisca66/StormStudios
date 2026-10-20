import {
  CellData,
  createInitialGameState,
  GameState,
  getLevelConfig,
  LevelConfig,
  MutationType,
  ROTATABLE_SHAPES,
  ROTATABLE_SHAPES_LIST,
  SUBTLE_COLOR_VARIANTS,
} from "./models";
import { InMemoryScoreRepository, ProgressRepository } from "./storage";

export type RandomFn = () => number;

export const HIDDEN_DURATION_MS = 1000;
export const RESULT_DURATION_MS = 2500;
export const TIMER_TICK_MS = 50;

const ROTATION_ANGLES = [90, 180, 270] as const;

export function pickRandom<T>(items: readonly T[], rng: RandomFn = Math.random): T {
  if (items.length === 0) {
    throw new Error("Cannot pick random item from empty array");
  }
  const index = Math.min(items.length - 1, Math.floor(rng() * items.length));
  return items[index];
}

export function cellsEqual(a: CellData, b: CellData): boolean {
  return a.shape === b.shape && a.color === b.color && a.rotation === b.rotation;
}

/**
 * Generates a grid of cells for a level configuration.
 * Matches GameViewModel.generateGrid(config).
 */
export function generateGrid(
  config: LevelConfig,
  rng: RandomFn = Math.random
): CellData[] {
  const totalCells = config.gridColumns * config.gridRows;
  const shapes = config.availableShapes;
  const colors = config.availableColors;

  const grid: CellData[] = [];
  for (let i = 0; i < totalCells; i++) {
    grid.push({
      shape: pickRandom(shapes, rng),
      color: pickRandom(colors, rng),
      rotation: 0,
    });
  }

  // Si el nivel es exclusivamente de ROTATION y por azar ninguna celda tiene figura rotable,
  // garantizamos que haya suficientes figuras rotables entre las disponibles.
  const onlyRotation =
    config.availableMutations.length > 0 &&
    config.availableMutations.every((m) => m === "ROTATION");
  if (onlyRotation) {
    const allowedRotatable = shapes.filter((s) => ROTATABLE_SHAPES.has(s));
    const pool = allowedRotatable.length > 0 ? allowedRotatable : ROTATABLE_SHAPES_LIST;
    let rotatableCount = grid.filter((c) => ROTATABLE_SHAPES.has(c.shape)).length;
    for (let i = 0; i < grid.length && rotatableCount < config.mutationCount; i++) {
      if (!ROTATABLE_SHAPES.has(grid[i].shape)) {
        grid[i] = {
          ...grid[i],
          shape: pickRandom(pool, rng),
        };
        rotatableCount++;
      }
    }
  }

  return grid;
}

/**
 * Checks that a mutated cell differs from the original cell AND does not match
 * any orthogonal neighbor in shape, color, and rotation.
 * Matches GameViewModel.isDistinguishableFromNeighbors.
 */
export function isDistinguishableFromNeighbors(
  grid: readonly CellData[],
  index: number,
  gridColumns: number,
  gridRows: number,
  originalCell: CellData
): boolean {
  const cell = grid[index];
  if (!cell || cellsEqual(cell, originalCell)) {
    return false;
  }

  const row = Math.floor(index / gridColumns);
  const col = index % gridColumns;
  const neighbors: CellData[] = [];

  if (row > 0) {
    neighbors.push(grid[(row - 1) * gridColumns + col]);
  }
  if (row < gridRows - 1) {
    neighbors.push(grid[(row + 1) * gridColumns + col]);
  }
  if (col > 0) {
    neighbors.push(grid[row * gridColumns + col - 1]);
  }
  if (col < gridColumns - 1) {
    neighbors.push(grid[row * gridColumns + col + 1]);
  }

  return neighbors.every(
    (neighbor) =>
      !(
        neighbor.shape === cell.shape &&
        neighbor.color === cell.color &&
        neighbor.rotation === cell.rotation
      )
  );
}

export interface MutationResult {
  readonly mutatedGrid: CellData[];
  readonly mutatedIndices: Set<number>;
}

/**
 * Applies mutations to the grid according to LevelConfig.
 * Faithful port of GameViewModel.applyMutations(grid, config).
 */
export function applyMutations(
  grid: readonly CellData[],
  config: LevelConfig,
  rng: RandomFn = Math.random
): MutationResult {
  const mutated: CellData[] = grid.map((c) => ({ ...c }));
  const mutatedIndices = new Set<number>();
  const availableIndices: number[] = grid.map((_, idx) => idx);
  const { gridColumns, gridRows } = config;

  let remaining = config.mutationCount;
  let attempts = 0;
  const maxAttempts = config.mutationCount * 10;

  const removeAvailable = (idx: number) => {
    const pos = availableIndices.indexOf(idx);
    if (pos !== -1) {
      availableIndices.splice(pos, 1);
    }
  };

  while (
    remaining > 0 &&
    attempts < maxAttempts &&
    availableIndices.length > 0
  ) {
    attempts++;
    const type: MutationType = pickRandom(config.availableMutations, rng);

    switch (type) {
      case "SWAP": {
        if (availableIndices.length < 2) continue;
        const idx1 = pickRandom(availableIndices, rng);
        const remaining1 = availableIndices.filter((i) => i !== idx1);
        const idx2 = pickRandom(remaining1, rng);

        if (cellsEqual(mutated[idx1], mutated[idx2])) continue;

        const temp = mutated[idx1];
        mutated[idx1] = mutated[idx2];
        mutated[idx2] = temp;
        mutatedIndices.add(idx1);
        mutatedIndices.add(idx2);
        removeAvailable(idx1);
        removeAvailable(idx2);
        remaining--;
        break;
      }

      case "ROTATION": {
        const candidates = availableIndices.filter((it) =>
          ROTATABLE_SHAPES.has(mutated[it].shape)
        );
        if (candidates.length === 0) continue;
        const idx = pickRandom(candidates, rng);
        const currentRotation = mutated[idx].rotation;
        const angleOptions = ROTATION_ANGLES.filter(
          (a) => a !== currentRotation
        );
        const newRotation = pickRandom(angleOptions, rng);
        mutated[idx] = { ...mutated[idx], rotation: newRotation };

        if (
          !isDistinguishableFromNeighbors(
            mutated,
            idx,
            gridColumns,
            gridRows,
            grid[idx]
          )
        ) {
          mutated[idx] = { ...grid[idx] };
          continue;
        }

        mutatedIndices.add(idx);
        removeAvailable(idx);
        remaining--;
        break;
      }

      case "COLOR": {
        const idx = pickRandom(availableIndices, rng);
        const currentColor = mutated[idx].color;
        const colorCandidates = config.availableColors.filter(
          (c) => c !== currentColor
        );
        if (colorCandidates.length === 0) continue;
        const newColor = pickRandom(colorCandidates, rng);
        mutated[idx] = { ...mutated[idx], color: newColor };

        if (
          !isDistinguishableFromNeighbors(
            mutated,
            idx,
            gridColumns,
            gridRows,
            grid[idx]
          )
        ) {
          mutated[idx] = { ...grid[idx] };
          continue;
        }

        mutatedIndices.add(idx);
        removeAvailable(idx);
        remaining--;
        break;
      }

      case "SHAPE": {
        const idx = pickRandom(availableIndices, rng);
        const currentShape = mutated[idx].shape;
        const candidates = config.availableShapes.filter(
          (s) => s !== currentShape
        );
        if (candidates.length === 0) continue;
        const newShape = pickRandom(candidates, rng);
        mutated[idx] = { ...mutated[idx], shape: newShape, rotation: 0 };

        if (
          !isDistinguishableFromNeighbors(
            mutated,
            idx,
            gridColumns,
            gridRows,
            grid[idx]
          )
        ) {
          mutated[idx] = { ...grid[idx] };
          continue;
        }

        mutatedIndices.add(idx);
        removeAvailable(idx);
        remaining--;
        break;
      }

      case "SUBTLE_COLOR": {
        const idx = pickRandom(availableIndices, rng);
        const currentColor = mutated[idx].color;
        const subtleVariant = SUBTLE_COLOR_VARIANTS[currentColor];
        if (!subtleVariant || subtleVariant === currentColor) continue;

        mutated[idx] = { ...mutated[idx], color: subtleVariant };

        if (
          !isDistinguishableFromNeighbors(
            mutated,
            idx,
            gridColumns,
            gridRows,
            grid[idx]
          )
        ) {
          mutated[idx] = { ...grid[idx] };
          continue;
        }

        mutatedIndices.add(idx);
        removeAvailable(idx);
        remaining--;
        break;
      }
    }
  }

  return { mutatedGrid: mutated, mutatedIndices };
}

export interface RoundEvaluation {
  readonly state: GameState;
  readonly correctSelections: Set<number>;
  readonly wrongSelections: Set<number>;
  readonly missedMutations: Set<number>;
  readonly livesLost: number;
  readonly scoreGained: number;
  readonly allFound: boolean;
  readonly nextLevelUnlocked: number | null;
  readonly isNewHighScore: boolean;
}

/**
 * Pure evaluation of the current round in FINDING phase.
 * Matches GameViewModel.evaluateRound().
 */
export function evaluateRoundState(current: GameState): RoundEvaluation {
  const correctSelections = new Set<number>();
  const wrongSelections = new Set<number>();
  const missedMutations = new Set<number>();

  for (const sel of current.playerSelections) {
    if (current.mutatedIndices.has(sel)) {
      correctSelections.add(sel);
    } else {
      wrongSelections.add(sel);
    }
  }

  for (const mut of current.mutatedIndices) {
    if (!current.playerSelections.has(mut)) {
      missedMutations.add(mut);
    }
  }

  const livesLost = wrongSelections.size;
  const newLives = Math.max(0, current.lives - livesLost);
  const perfectBonus =
    missedMutations.size === 0 && wrongSelections.size === 0
      ? 50 * current.level
      : 0;
  const scoreGained =
    correctSelections.size * 100 * current.level + perfectBonus;
  const newScore = current.score + scoreGained;

  const allFound = missedMutations.size === 0;
  const isNewHighScore = newScore > current.highScore;
  const newHighScore = isNewHighScore ? newScore : current.highScore;
  const nextLevelUnlocked = allFound ? current.level + 1 : null;
  const newUnlockedLevel =
    nextLevelUnlocked !== null
      ? Math.max(current.unlockedLevel, nextLevelUnlocked)
      : current.unlockedLevel;

  const nextState: GameState = {
    ...current,
    phase: "RESULT",
    lives: newLives,
    score: newScore,
    highScore: newHighScore,
    unlockedLevel: newUnlockedLevel,
  };

  return {
    state: nextState,
    correctSelections,
    wrongSelections,
    missedMutations,
    livesLost,
    scoreGained,
    allFound,
    nextLevelUnlocked,
    isNewHighScore,
  };
}

export type StateListener = (state: GameState) => void;

export interface GameControllerOptions {
  readonly repository?: ProgressRepository;
  readonly rng?: RandomFn;
  readonly autoTimers?: boolean;
}

/**
 * Stateful controller equivalent to Kotlin's GameViewModel, written in pure TypeScript.
 */
export class GameController {
  private _state: GameState;
  private readonly repository: ProgressRepository;
  private readonly rng: RandomFn;
  private readonly autoTimers: boolean;
  private readonly listeners = new Set<StateListener>();

  private memorizationTimerId: ReturnType<typeof setInterval> | null = null;
  private phaseTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(options: GameControllerOptions = {}) {
    this.repository = options.repository ?? new InMemoryScoreRepository();
    this.rng = options.rng ?? Math.random;
    this.autoTimers = options.autoTimers ?? true;

    this._state = createInitialGameState({
      highScore: this.repository.getHighScore(),
      unlockedLevel: this.repository.getUnlockedLevel(),
    });
  }

  get state(): GameState {
    return this._state;
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this._state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(updater: (prev: GameState) => GameState): void {
    this._state = updater(this._state);
    for (const listener of this.listeners) {
      listener(this._state);
    }
  }

  private clearTimers(): void {
    if (this.memorizationTimerId !== null) {
      clearInterval(this.memorizationTimerId);
      this.memorizationTimerId = null;
    }
    if (this.phaseTimeoutId !== null) {
      clearTimeout(this.phaseTimeoutId);
      this.phaseTimeoutId = null;
    }
  }

  startLevel(level: number): void {
    this.clearTimers();
    this.updateState((prev) =>
      createInitialGameState({
        level,
        highScore: prev.highScore,
        unlockedLevel: prev.unlockedLevel,
      })
    );
    this.startRound();
  }

  startRound(): void {
    this.clearTimers();
    const level = this._state.level;
    const config = getLevelConfig(level);

    // En caso de que una cuadrícula aleatoria muy restrictiva no logre al menos 1 mutación,
    // reintentamos hasta 8 veces para garantizar que siempre haya mutación que encontrar.
    let grid = generateGrid(config, this.rng);
    let { mutatedGrid, mutatedIndices } = applyMutations(grid, config, this.rng);
    let retries = 0;
    while (mutatedIndices.size === 0 && retries < 8) {
      retries++;
      grid = generateGrid(config, this.rng);
      ({ mutatedGrid, mutatedIndices } = applyMutations(grid, config, this.rng));
    }

    const maxTouches = mutatedIndices.size + 1;

    this.updateState((prev) => ({
      ...prev,
      phase: "MEMORIZING",
      gridColumns: config.gridColumns,
      gridRows: config.gridRows,
      originalGrid: grid,
      mutatedGrid,
      mutatedIndices,
      playerSelections: new Set<number>(),
      maxTouches,
      remainingTouches: maxTouches,
      memorizationTimeMs: config.memorizationTimeMs,
      timeRemainingMs: config.memorizationTimeMs,
      isPaused: false,
      isGameOver: false,
      showHint: config.showHint,
    }));

    if (this.autoTimers) {
      this.startMemorizationTimer();
    }
  }

  private startMemorizationTimer(): void {
    this.clearTimers();
    this.memorizationTimerId = setInterval(() => {
      if (this._state.phase !== "MEMORIZING") {
        this.clearTimers();
        return;
      }
      if (this._state.isPaused) {
        return;
      }
      this.tickMemorization(TIMER_TICK_MS);
    }, TIMER_TICK_MS);
  }

  /**
   * Advances memorization timer by deltaMs. Exposed for deterministic testing.
   */
  tickMemorization(deltaMs: number): void {
    if (this._state.phase !== "MEMORIZING" || this._state.isPaused) return;
    const nextRemaining = Math.max(0, this._state.timeRemainingMs - deltaMs);
    this.updateState((prev) => ({
      ...prev,
      timeRemainingMs: nextRemaining,
    }));

    if (nextRemaining <= 0) {
      this.transitionToHidden();
    }
  }

  transitionToHidden(): void {
    this.clearTimers();
    this.updateState((prev) => ({
      ...prev,
      phase: "HIDDEN",
      timeRemainingMs: 0,
    }));

    if (this.autoTimers) {
      this.phaseTimeoutId = setTimeout(() => {
        this.transitionToFinding();
      }, HIDDEN_DURATION_MS);
    }
  }

  transitionToFinding(): void {
    if (this._state.phase === "HIDDEN") {
      this.updateState((prev) => ({
        ...prev,
        phase: "FINDING",
      }));
    }
  }

  onCellTapped(index: number): void {
    const current = this._state;
    if (current.phase !== "FINDING" || current.isPaused) return;
    if (index < 0 || index >= current.mutatedGrid.length) return;

    if (current.playerSelections.has(index)) {
      const nextSelections = new Set(current.playerSelections);
      nextSelections.delete(index);
      this.updateState((prev) => ({
        ...prev,
        playerSelections: nextSelections,
        remainingTouches: prev.remainingTouches + 1,
      }));
      return;
    }

    if (current.remainingTouches <= 0) return;

    const newSelections = new Set(current.playerSelections);
    newSelections.add(index);
    const newRemaining = current.remainingTouches - 1;

    this.updateState((prev) => ({
      ...prev,
      playerSelections: newSelections,
      remainingTouches: newRemaining,
    }));

    if (newRemaining <= 0) {
      this.evaluateRound();
    }
  }

  onDonePressed(): void {
    if (this._state.phase === "FINDING" && !this._state.isPaused) {
      this.evaluateRound();
    }
  }

  evaluateRound(): RoundEvaluation {
    this.clearTimers();
    const evaluation = evaluateRoundState(this._state);

    if (evaluation.isNewHighScore) {
      this.repository.saveHighScore(evaluation.state.score);
    }

    if (evaluation.nextLevelUnlocked !== null) {
      this.repository.unlockLevel(evaluation.nextLevelUnlocked);
    }

    this.updateState(() => evaluation.state);

    if (this.autoTimers) {
      this.phaseTimeoutId = setTimeout(() => {
        this.finishResultPhase(evaluation.allFound);
      }, RESULT_DURATION_MS);
    }

    return evaluation;
  }

  /**
   * Transitions out of RESULT phase after the 2500ms delay (or immediately in tests).
   */
  finishResultPhase(allFound?: boolean): void {
    if (this._state.phase !== "RESULT") return;

    const current = this._state;
    const foundAll =
      allFound ??
      Array.from(current.mutatedIndices).every((idx) =>
        current.playerSelections.has(idx)
      );

    if (current.lives <= 0) {
      this.updateState((prev) => ({
        ...prev,
        isGameOver: true,
      }));
      return;
    }

    const nextLevel = foundAll ? current.level + 1 : current.level;
    this.updateState((prev) => ({
      ...prev,
      level: nextLevel,
    }));
    this.startRound();
  }

  stopGame(): void {
    this.clearTimers();
  }

  resetProgress(): void {
    this.repository.resetProgress();
    this.updateState((prev) => ({
      ...prev,
      highScore: 0,
      unlockedLevel: 1,
    }));
  }

  pause(): void {
    if (!this._state.isPaused) {
      this.updateState((prev) => ({ ...prev, isPaused: true }));
    }
  }

  resume(): void {
    if (this._state.isPaused) {
      this.updateState((prev) => ({ ...prev, isPaused: false }));
    }
  }

  togglePause(): void {
    if (this._state.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }
}
