export type GamePhase = "MEMORIZING" | "HIDDEN" | "FINDING" | "RESULT";

export type ShapeType =
  | "CIRCLE"
  | "SQUARE"
  | "TRIANGLE"
  | "DIAMOND"
  | "STAR"
  | "HEXAGON";

export const ALL_SHAPES: readonly ShapeType[] = [
  "CIRCLE",
  "SQUARE",
  "TRIANGLE",
  "DIAMOND",
  "STAR",
  "HEXAGON",
] as const;

export type MutationType =
  | "COLOR"
  | "SHAPE"
  | "SWAP"
  | "ROTATION"
  | "SUBTLE_COLOR";

export const ALL_MUTATION_TYPES: readonly MutationType[] = [
  "COLOR",
  "SHAPE",
  "SWAP",
  "ROTATION",
  "SUBTLE_COLOR",
] as const;

export interface CellData {
  readonly shape: ShapeType;
  readonly color: string;
  readonly rotation: number;
}

export interface GameState {
  readonly level: number;
  readonly lives: number;
  readonly score: number;
  readonly phase: GamePhase;
  readonly gridColumns: number;
  readonly gridRows: number;
  readonly originalGrid: readonly CellData[];
  readonly mutatedGrid: readonly CellData[];
  readonly mutatedIndices: ReadonlySet<number>;
  readonly playerSelections: ReadonlySet<number>;
  readonly maxTouches: number;
  readonly remainingTouches: number;
  readonly memorizationTimeMs: number;
  readonly timeRemainingMs: number;
  readonly highScore: number;
  readonly unlockedLevel: number;
  readonly isPaused: boolean;
  readonly isGameOver: boolean;
  readonly showHint: boolean;
}

export const MAX_DISPLAY_LEVEL = 48;

export interface LevelConfig {
  readonly gridColumns: number;
  readonly gridRows: number;
  readonly mutationCount: number;
  readonly memorizationTimeMs: number;
  readonly availableMutations: readonly MutationType[];
  readonly availableShapes: readonly ShapeType[];
  readonly availableColors: readonly string[];
  readonly showHint: boolean;
}

export interface WorldInfo {
  readonly worldNumber: number;
  readonly gridLabel: string;
  readonly levelRange: readonly [number, number];
  readonly levels: readonly number[];
  readonly subtitle: string;
}

function makeRange(start: number, end: number): readonly number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) {
    arr.push(i);
  }
  return arr;
}

export const WORLDS: readonly WorldInfo[] = [
  { worldNumber: 1, gridLabel: "2×2", levelRange: [1, 6], levels: makeRange(1, 6), subtitle: "" },
  { worldNumber: 2, gridLabel: "2×3", levelRange: [7, 12], levels: makeRange(7, 12), subtitle: "" },
  { worldNumber: 3, gridLabel: "3×3", levelRange: [13, 18], levels: makeRange(13, 18), subtitle: "" },
  { worldNumber: 4, gridLabel: "3×4", levelRange: [19, 24], levels: makeRange(19, 24), subtitle: "" },
  { worldNumber: 5, gridLabel: "4×4", levelRange: [25, 30], levels: makeRange(25, 30), subtitle: "" },
  { worldNumber: 6, gridLabel: "5×5", levelRange: [31, 36], levels: makeRange(31, 36), subtitle: "" },
  { worldNumber: 7, gridLabel: "6×6", levelRange: [37, 42], levels: makeRange(37, 42), subtitle: "" },
  { worldNumber: 8, gridLabel: "6×6", levelRange: [43, 48], levels: makeRange(43, 48), subtitle: "Modo maestro" },
] as const;

export const GAME_COLORS: readonly string[] = [
  "#E53935", // Rojo
  "#1E88E5", // Azul
  "#43A047", // Verde
  "#FDD835", // Amarillo
  "#FB8C00", // Naranja
  "#8E24AA", // Morado
  "#D81B60", // Rosa
  "#00ACC1", // Cian
] as const;

export const SUBTLE_COLOR_VARIANTS: Readonly<Record<string, string>> = {
  "#E53935": "#C62828",
  "#1E88E5": "#1565C0",
  "#43A047": "#2E7D32",
  "#FDD835": "#F9A825",
  "#FB8C00": "#EF6C00",
  "#8E24AA": "#6A1B9A",
  "#D81B60": "#AD1457",
  "#00ACC1": "#00838F",
};

export const ROTATABLE_SHAPES: ReadonlySet<ShapeType> = new Set<ShapeType>([
  "TRIANGLE",
  "DIAMOND",
  "STAR",
]);

export const ROTATABLE_SHAPES_LIST: readonly ShapeType[] = [
  "TRIANGLE",
  "DIAMOND",
  "STAR",
] as const;

// 4 colores muy contrastantes para niveles 1-5
export const HIGH_CONTRAST_COLORS: readonly string[] = [
  "#E53935", // Rojo
  "#1E88E5", // Azul
  "#43A047", // Verde
  "#FDD835", // Amarillo
] as const;

// Solo 3 colores para niveles 1-2 (menor carga cognitiva)
export const BEGINNER_COLORS: readonly string[] = [
  "#E53935", // Rojo
  "#1E88E5", // Azul
  "#43A047", // Verde
] as const;

function worldConfig(
  level: number,
  cols: number,
  rows: number,
  mutations: number,
  times: readonly [number, number, number, number, number, number]
): LevelConfig {
  const worldOffset = (((level - 1) % 6) + 6) % 6;
  const time = times[worldOffset];
  let mutationTypes: readonly MutationType[];
  switch (worldOffset) {
    case 0:
      mutationTypes = ["COLOR"];
      break;
    case 1:
      mutationTypes = ["SHAPE"];
      break;
    case 2:
      mutationTypes = ["SWAP"];
      break;
    case 3:
      mutationTypes = ["ROTATION"];
      break;
    case 4:
      mutationTypes = ["SUBTLE_COLOR"];
      break;
    default:
      mutationTypes = [...ALL_MUTATION_TYPES]; // Mezcla
      break;
  }

  return {
    gridColumns: cols,
    gridRows: rows,
    mutationCount: mutations,
    memorizationTimeMs: time,
    availableMutations: mutationTypes,
    availableShapes: [...ALL_SHAPES],
    availableColors: [...GAME_COLORS],
    showHint: false,
  };
}

export function getLevelConfig(level: number): LevelConfig {
  // Mundo 1 — 2x2, 1 mutación
  if (level === 1) {
    return {
      gridColumns: 2,
      gridRows: 2,
      mutationCount: 1,
      memorizationTimeMs: 8000,
      availableMutations: ["COLOR"],
      availableShapes: ["CIRCLE"],
      availableColors: [...BEGINNER_COLORS],
      showHint: true,
    };
  }
  if (level >= 2 && level <= 6) {
    return worldConfig(level, 2, 2, 1, [8000, 8000, 7000, 7000, 6000, 6000]);
  }
  // Mundo 2 — 2x3, 1 mutación
  if (level >= 7 && level <= 12) {
    return worldConfig(level, 2, 3, 1, [7000, 7000, 6000, 6000, 5000, 5000]);
  }
  // Mundo 3 — 3x3, 2 mutaciones
  if (level >= 13 && level <= 18) {
    return worldConfig(level, 3, 3, 2, [7000, 7000, 6000, 6000, 5000, 5000]);
  }
  // Mundo 4 — 3x4, 2 mutaciones
  if (level >= 19 && level <= 24) {
    return worldConfig(level, 3, 4, 2, [6000, 6000, 5000, 5000, 4000, 4000]);
  }
  // Mundo 5 — 4x4, 3 mutaciones
  if (level >= 25 && level <= 30) {
    return worldConfig(level, 4, 4, 3, [6000, 6000, 5000, 5000, 4000, 4000]);
  }
  // Mundo 6 — 5x5, 3 mutaciones
  if (level >= 31 && level <= 36) {
    return worldConfig(level, 5, 5, 3, [5000, 5000, 4000, 4000, 3000, 3000]);
  }
  // Mundo 7 — 6x6, 4 mutaciones
  if (level >= 37 && level <= 42) {
    return worldConfig(level, 6, 6, 4, [5000, 5000, 4000, 4000, 3000, 3000]);
  }
  // Mundo 8 — 6x6, 5 mutaciones (modo maestro)
  return worldConfig(level, 6, 6, 5, [4000, 4000, 3000, 3000, 2500, 2500]);
}

export function createInitialGameState(
  overrides: Partial<GameState> = {}
): GameState {
  return {
    level: 1,
    lives: 3,
    score: 0,
    phase: "MEMORIZING",
    gridColumns: 3,
    gridRows: 3,
    originalGrid: [],
    mutatedGrid: [],
    mutatedIndices: new Set<number>(),
    playerSelections: new Set<number>(),
    maxTouches: 0,
    remainingTouches: 0,
    memorizationTimeMs: 5000,
    timeRemainingMs: 5000,
    highScore: 0,
    unlockedLevel: 1,
    isPaused: false,
    isGameOver: false,
    showHint: false,
    ...overrides,
  };
}
