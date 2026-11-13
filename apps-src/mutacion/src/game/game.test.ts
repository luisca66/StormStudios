import { describe, expect, it } from "vitest";
import {
  ALL_MUTATION_TYPES,
  ALL_SHAPES,
  applyMutations,
  BEGINNER_COLORS,
  CellData,
  cellsEqual,
  GAME_COLORS,
  GameController,
  generateGrid,
  getLevelConfig,
  InMemoryScoreRepository,
  isDistinguishableFromNeighbors,
  LevelConfig,
  MAX_DISPLAY_LEVEL,
  MutationType,
  ROTATABLE_SHAPES,
  SUBTLE_COLOR_VARIANTS,
  WORLDS,
} from "./index";

// Generador pseudoaleatorio determinista para pruebas reproducibles
function createSeededRng(seed = 42): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe("Configuración de los 48 niveles y mundos (paridad con Kotlin)", () => {
  it("define exactamente 8 mundos que cubren los 48 niveles", () => {
    expect(MAX_DISPLAY_LEVEL).toBe(48);
    expect(WORLDS).toHaveLength(8);
    expect(WORLDS[0]).toMatchObject({ worldNumber: 1, gridLabel: "2×2", levelRange: [1, 6], subtitle: "" });
    expect(WORLDS[1]).toMatchObject({ worldNumber: 2, gridLabel: "2×3", levelRange: [7, 12], subtitle: "" });
    expect(WORLDS[2]).toMatchObject({ worldNumber: 3, gridLabel: "3×3", levelRange: [13, 18], subtitle: "" });
    expect(WORLDS[3]).toMatchObject({ worldNumber: 4, gridLabel: "3×4", levelRange: [19, 24], subtitle: "" });
    expect(WORLDS[4]).toMatchObject({ worldNumber: 5, gridLabel: "4×4", levelRange: [25, 30], subtitle: "" });
    expect(WORLDS[5]).toMatchObject({ worldNumber: 6, gridLabel: "5×5", levelRange: [31, 36], subtitle: "" });
    expect(WORLDS[6]).toMatchObject({ worldNumber: 7, gridLabel: "6×6", levelRange: [37, 42], subtitle: "" });
    expect(WORLDS[7]).toMatchObject({
      worldNumber: 8,
      gridLabel: "6×6",
      levelRange: [43, 48],
      subtitle: "Modo maestro",
    });
  });

  it("configura el nivel 1 como tutorial con círculos, 3 colores y pista activa", () => {
    const lvl1 = getLevelConfig(1);
    expect(lvl1).toEqual({
      gridColumns: 2,
      gridRows: 2,
      mutationCount: 1,
      memorizationTimeMs: 8000,
      availableMutations: ["COLOR"],
      availableShapes: ["CIRCLE"],
      availableColors: BEGINNER_COLORS,
      showHint: true,
    });
  });

  it("verifica la configuración exacta de los 48 niveles igual que en GameModels.kt", () => {
    const worldSpecs: Array<{
      levels: [number, number];
      cols: number;
      rows: number;
      mutations: number;
      times: [number, number, number, number, number, number];
    }> = [
      { levels: [1, 6], cols: 2, rows: 2, mutations: 1, times: [8000, 8000, 7000, 7000, 6000, 6000] },
      { levels: [7, 12], cols: 2, rows: 3, mutations: 1, times: [7000, 7000, 6000, 6000, 5000, 5000] },
      { levels: [13, 18], cols: 3, rows: 3, mutations: 2, times: [7000, 7000, 6000, 6000, 5000, 5000] },
      { levels: [19, 24], cols: 3, rows: 4, mutations: 2, times: [6000, 6000, 5000, 5000, 4000, 4000] },
      { levels: [25, 30], cols: 4, rows: 4, mutations: 3, times: [6000, 6000, 5000, 5000, 4000, 4000] },
      { levels: [31, 36], cols: 5, rows: 5, mutations: 3, times: [5000, 5000, 4000, 4000, 3000, 3000] },
      { levels: [37, 42], cols: 6, rows: 6, mutations: 4, times: [5000, 5000, 4000, 4000, 3000, 3000] },
      { levels: [43, 48], cols: 6, rows: 6, mutations: 5, times: [4000, 4000, 3000, 3000, 2500, 2500] },
    ];

    const expectedMutationsByOffset: ReadonlyArray<readonly MutationType[]> = [
      ["COLOR"],
      ["SHAPE"],
      ["SWAP"],
      ["ROTATION"],
      ["SUBTLE_COLOR"],
      ALL_MUTATION_TYPES,
    ];

    for (const spec of worldSpecs) {
      const [start, end] = spec.levels;
      for (let level = start; level <= end; level++) {
        const offset = (level - 1) % 6;
        const cfg = getLevelConfig(level);

        expect(cfg.gridColumns).toBe(spec.cols);
        expect(cfg.gridRows).toBe(spec.rows);
        expect(cfg.mutationCount).toBe(spec.mutations);
        expect(cfg.memorizationTimeMs).toBe(spec.times[offset]);
        expect(cfg.availableMutations).toEqual(expectedMutationsByOffset[offset]);

        if (level === 1) {
          expect(cfg.availableShapes).toEqual(["CIRCLE"]);
          expect(cfg.availableColors).toEqual(BEGINNER_COLORS);
          expect(cfg.showHint).toBe(true);
        } else {
          expect(cfg.availableShapes).toEqual(ALL_SHAPES);
          expect(cfg.availableColors).toEqual(GAME_COLORS);
          expect(cfg.showHint).toBe(false);
        }
      }
    }
  });
});

describe("Reglas de mutación: cada tipo cambia realmente la celda", () => {
  const baseGrid: CellData[] = [
    { shape: "TRIANGLE", color: "#E53935", rotation: 0 },
    { shape: "SQUARE", color: "#1E88E5", rotation: 0 },
    { shape: "STAR", color: "#43A047", rotation: 0 },
    { shape: "DIAMOND", color: "#FDD835", rotation: 0 },
    { shape: "HEXAGON", color: "#FB8C00", rotation: 0 },
    { shape: "CIRCLE", color: "#8E24AA", rotation: 0 },
    { shape: "TRIANGLE", color: "#D81B60", rotation: 0 },
    { shape: "STAR", color: "#00ACC1", rotation: 0 },
    { shape: "SQUARE", color: "#E53935", rotation: 0 },
  ];

  function makeSingleTypeConfig(type: MutationType, mutationCount = 2): LevelConfig {
    return {
      gridColumns: 3,
      gridRows: 3,
      mutationCount,
      memorizationTimeMs: 5000,
      availableMutations: [type],
      availableShapes: [...ALL_SHAPES],
      availableColors: [...GAME_COLORS],
      showHint: false,
    };
  }

  it("COLOR cambia el color de la celda manteniendo su forma y rotación", () => {
    const rng = createSeededRng(101);
    const config = makeSingleTypeConfig("COLOR", 2);
    const { mutatedGrid, mutatedIndices } = applyMutations(baseGrid, config, rng);

    expect(mutatedIndices.size).toBe(2);
    for (const idx of mutatedIndices) {
      expect(cellsEqual(mutatedGrid[idx], baseGrid[idx])).toBe(false);
      expect(mutatedGrid[idx].color).not.toBe(baseGrid[idx].color);
      expect(mutatedGrid[idx].shape).toBe(baseGrid[idx].shape);
      expect(mutatedGrid[idx].rotation).toBe(baseGrid[idx].rotation);
      expect(isDistinguishableFromNeighbors(mutatedGrid, idx, 3, 3, baseGrid[idx])).toBe(true);
    }
  });

  it("SHAPE cambia la forma de la celda y reinicia su rotación a 0", () => {
    const rng = createSeededRng(202);
    const config = makeSingleTypeConfig("SHAPE", 2);
    const { mutatedGrid, mutatedIndices } = applyMutations(baseGrid, config, rng);

    expect(mutatedIndices.size).toBe(2);
    for (const idx of mutatedIndices) {
      expect(cellsEqual(mutatedGrid[idx], baseGrid[idx])).toBe(false);
      expect(mutatedGrid[idx].shape).not.toBe(baseGrid[idx].shape);
      expect(mutatedGrid[idx].color).toBe(baseGrid[idx].color);
      expect(mutatedGrid[idx].rotation).toBe(0);
      expect(isDistinguishableFromNeighbors(mutatedGrid, idx, 3, 3, baseGrid[idx])).toBe(true);
    }
  });

  it("SWAP intercambia dos celdas distintas y marca ambos índices como mutados", () => {
    const rng = createSeededRng(303);
    const config = makeSingleTypeConfig("SWAP", 1);
    const { mutatedGrid, mutatedIndices } = applyMutations(baseGrid, config, rng);

    // 1 operación SWAP muta 2 celdas
    expect(mutatedIndices.size).toBe(2);
    const [idx1, idx2] = Array.from(mutatedIndices);
    expect(cellsEqual(mutatedGrid[idx1], baseGrid[idx1])).toBe(false);
    expect(cellsEqual(mutatedGrid[idx2], baseGrid[idx2])).toBe(false);
    expect(cellsEqual(mutatedGrid[idx1], baseGrid[idx2])).toBe(true);
    expect(cellsEqual(mutatedGrid[idx2], baseGrid[idx1])).toBe(true);
  });

  it("ROTATION rota únicamente figuras rotables (TRIANGLE, DIAMOND, STAR) a 90, 180 o 270 grados", () => {
    const rng = createSeededRng(404);
    const config = makeSingleTypeConfig("ROTATION", 2);
    const { mutatedGrid, mutatedIndices } = applyMutations(baseGrid, config, rng);

    expect(mutatedIndices.size).toBe(2);
    for (const idx of mutatedIndices) {
      expect(ROTATABLE_SHAPES.has(baseGrid[idx].shape)).toBe(true);
      expect(cellsEqual(mutatedGrid[idx], baseGrid[idx])).toBe(false);
      expect([90, 180, 270]).toContain(mutatedGrid[idx].rotation);
      expect(mutatedGrid[idx].shape).toBe(baseGrid[idx].shape);
      expect(mutatedGrid[idx].color).toBe(baseGrid[idx].color);
      expect(isDistinguishableFromNeighbors(mutatedGrid, idx, 3, 3, baseGrid[idx])).toBe(true);
    }
  });

  it("SUBTLE_COLOR aplica la variante de tono sutil correspondiente al color original", () => {
    const rng = createSeededRng(505);
    const config = makeSingleTypeConfig("SUBTLE_COLOR", 2);
    const { mutatedGrid, mutatedIndices } = applyMutations(baseGrid, config, rng);

    expect(mutatedIndices.size).toBe(2);
    for (const idx of mutatedIndices) {
      const originalColor = baseGrid[idx].color;
      expect(cellsEqual(mutatedGrid[idx], baseGrid[idx])).toBe(false);
      expect(mutatedGrid[idx].color).toBe(SUBTLE_COLOR_VARIANTS[originalColor]);
      expect(mutatedGrid[idx].shape).toBe(baseGrid[idx].shape);
      expect(isDistinguishableFromNeighbors(mutatedGrid, idx, 3, 3, baseGrid[idx])).toBe(true);
    }
  });

  it("en todos los 48 niveles las celdas marcadas en mutatedIndices son distintas a las originales", () => {
    const rng = createSeededRng(999);
    for (let level = 1; level <= 48; level++) {
      const config = getLevelConfig(level);
      const grid = generateGrid(config, rng);
      const { mutatedGrid, mutatedIndices } = applyMutations(grid, config, rng);

      expect(mutatedIndices.size).toBeGreaterThan(0);
      for (const idx of mutatedIndices) {
        expect(cellsEqual(mutatedGrid[idx], grid[idx])).toBe(false);
      }
      // Y las celdas fuera de mutatedIndices permanecen intactas
      for (let i = 0; i < grid.length; i++) {
        if (!mutatedIndices.has(i)) {
          expect(cellsEqual(mutatedGrid[i], grid[i])).toBe(true);
        }
      }
    }
  });
});

describe("Conteo de toques, vidas, puntuación y desbloqueo de niveles", () => {
  it("asigna maxTouches = mutatedIndices.size + 1 y permite seleccionar y deseleccionar celdas", () => {
    const repo = new InMemoryScoreRepository();
    const controller = new GameController({
      repository: repo,
      rng: createSeededRng(1234),
      autoTimers: false,
    });

    controller.startLevel(13); // Mundo 3 (3x3, 2 mutaciones)
    expect(controller.state.phase).toBe("MEMORIZING");
    const mutatedCount = controller.state.mutatedIndices.size;
    expect(controller.state.maxTouches).toBe(mutatedCount + 1);
    expect(controller.state.remainingTouches).toBe(mutatedCount + 1);

    // Transición a FINDING
    controller.tickMemorization(controller.state.memorizationTimeMs);
    expect(controller.state.phase).toBe("HIDDEN");
    controller.transitionToFinding();
    expect(controller.state.phase).toBe("FINDING");

    // Tocar celda 0 la selecciona y reduce remainingTouches
    controller.onCellTapped(0);
    expect(controller.state.playerSelections.has(0)).toBe(true);
    expect(controller.state.remainingTouches).toBe(mutatedCount);

    // Tocar de nuevo la celda 0 la deselecciona y devuelve el toque
    controller.onCellTapped(0);
    expect(controller.state.playerSelections.has(0)).toBe(false);
    expect(controller.state.remainingTouches).toBe(mutatedCount + 1);
  });

  it("otorga 100 * nivel por acierto + 50 * nivel de bono perfecto y desbloquea el siguiente nivel", () => {
    const repo = new InMemoryScoreRepository();
    const controller = new GameController({
      repository: repo,
      rng: createSeededRng(77),
      autoTimers: false,
    });

    controller.startLevel(3); // Nivel 3
    controller.transitionToHidden();
    controller.transitionToFinding();

    const mutated = Array.from(controller.state.mutatedIndices);
    for (const idx of mutated) {
      controller.onCellTapped(idx);
    }

    // Presionar LISTO al haber encontrado todas las mutaciones sin errores
    controller.onDonePressed();

    expect(controller.state.phase).toBe("RESULT");
    const expectedScore = mutated.length * 100 * 3 + 50 * 3;
    expect(controller.state.score).toBe(expectedScore);
    expect(controller.state.highScore).toBe(expectedScore);
    expect(controller.state.lives).toBe(3);
    expect(controller.state.unlockedLevel).toBe(4);
    expect(repo.getUnlockedLevel()).toBe(4);
    expect(repo.getHighScore()).toBe(expectedScore);

    // Al finalizar la fase RESULT avanza al nivel 4
    controller.finishResultPhase();
    expect(controller.state.level).toBe(4);
    expect(controller.state.phase).toBe("MEMORIZING");
  });

  it("descuenta 1 vida por cada selección incorrecta y evalúa automáticamente al agotar los toques", () => {
    const repo = new InMemoryScoreRepository();
    const controller = new GameController({
      repository: repo,
      rng: createSeededRng(88),
      autoTimers: false,
    });

    controller.startLevel(1); // 2x2, 1 mutación -> maxTouches = 2
    controller.transitionToHidden();
    controller.transitionToFinding();

    const mutatedIdx = Array.from(controller.state.mutatedIndices)[0];
    const wrongIndices = [0, 1, 2, 3].filter((i) => i !== mutatedIdx);

    // Tocamos 2 celdas incorrectas: se agotan los 2 toques y se evalúa la ronda automáticamente
    controller.onCellTapped(wrongIndices[0]);
    expect(controller.state.phase).toBe("FINDING");
    controller.onCellTapped(wrongIndices[1]);

    expect(controller.state.phase).toBe("RESULT");
    expect(controller.state.lives).toBe(1); // Perdió 2 vidas por 2 selecciones erróneas
    expect(controller.state.score).toBe(0);
    expect(controller.state.unlockedLevel).toBe(1); // No desbloquea nivel 2

    // Al terminar RESULT repite el mismo nivel 1 porque faltó encontrar la mutación
    controller.finishResultPhase();
    expect(controller.state.level).toBe(1);
    expect(controller.state.lives).toBe(1);
    expect(controller.state.isGameOver).toBe(false);

    // Si vuelve a fallar una celda más, llega a 0 vidas y entra en Game Over
    controller.transitionToHidden();
    controller.transitionToFinding();
    const newMutatedIdx = Array.from(controller.state.mutatedIndices)[0];
    const newWrongIdx = [0, 1, 2, 3].filter((i) => i !== newMutatedIdx)[0];

    controller.onCellTapped(newWrongIdx);
    controller.onDonePressed();

    expect(controller.state.lives).toBe(0);
    controller.finishResultPhase();
    expect(controller.state.isGameOver).toBe(true);
  });

  it("permite pausar, reanudar y reiniciar el progreso guardado", () => {
    const repo = new InMemoryScoreRepository(500, 10);
    const controller = new GameController({
      repository: repo,
      rng: createSeededRng(55),
      autoTimers: false,
    });

    expect(controller.state.highScore).toBe(500);
    expect(controller.state.unlockedLevel).toBe(10);

    controller.startLevel(2);
    const initialTime = controller.state.timeRemainingMs;

    controller.pause();
    expect(controller.state.isPaused).toBe(true);
    controller.tickMemorization(1000);
    expect(controller.state.timeRemainingMs).toBe(initialTime);

    controller.resume();
    expect(controller.state.isPaused).toBe(false);
    controller.tickMemorization(1000);
    expect(controller.state.timeRemainingMs).toBe(initialTime - 1000);

    controller.resetProgress();
    expect(controller.state.highScore).toBe(0);
    expect(controller.state.unlockedLevel).toBe(1);
    expect(repo.getHighScore()).toBe(0);
    expect(repo.getUnlockedLevel()).toBe(1);
  });
});
