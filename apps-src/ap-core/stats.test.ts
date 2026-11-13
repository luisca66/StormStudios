import { describe, it, expect } from "vitest";
import { getLevel, parsePitch, type KeyValueStore } from "./progression";
import {
  ATTEMPTS_STORAGE_KEY,
  CSV_LABELS_EN,
  CSV_LABELS_ES,
  AttemptStore,
  accuracyByPitch,
  accuracyByPitchClass,
  accuracyByTimbre,
  clearAttempts,
  createAttempt,
  createSessionId,
  dailyErrorDistance,
  decodeAttempts,
  encodeAttempts,
  errorDistanceStats,
  errorDrift,
  escapeCsv,
  exportAttemptsToCsv,
  loadAttempts,
  levelDistances,
  recordAttempt,
  saveAttempts,
  sessionComparison,
  sessionHistory,
  type Attempt,
} from "./stats";

function createMemoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string): void {
      data[key] = value;
    },
  };
}

describe("Sesiones y construcción de Attempt", () => {
  it("createSessionId genera IDs numéricos estrictamente crecientes incluso en el mismo milisegundo", () => {
    const s1 = createSessionId(1_700_000_000_000);
    expect(s1).toBe(1_700_000_000_000);

    const a = createSessionId();
    const b = createSessionId();
    const c = createSessionId();
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
  });

  it("createAttempt calcula acierto, distancia, dirección e infiere scenario del nivel", () => {
    const fSharp3 = parsePitch("F#3")!.midi; // 54, pitchClass = 6
    const e3 = parsePitch("E3")!.midi; // 52, pitchClass = 4
    const c4 = parsePitch("C4")!.midi; // 60, pitchClass = 0

    // Acierto: F#3 respondida como F# (6)
    const hit = createAttempt({
      timestamp: 1000,
      sessionId: 900,
      sequence: "Hombre",
      level: 3, // mundo 1 → scenario 1
      playedMidi: fSharp3,
      answeredPitchClass: 6,
      timbre: "Piano",
    });
    expect(hit).toEqual<Attempt>({
      timestamp: 1000,
      sessionId: 900,
      sequence: "Hombre",
      level: 3,
      scenario: 1,
      playedMidi: 54,
      answeredPitchClass: 6,
      timbre: "Piano",
      correct: true,
      distance: 0,
      direction: 0,
    });

    // Error hacia arriba: E3 (4) respondida como G (7) → +3 semitonos arriba
    const upErr = createAttempt({
      timestamp: 2000,
      sessionId: 900,
      sequence: "Hombre",
      level: 40, // mundo 2 → scenario 2
      playedMidi: e3,
      answeredPitchClass: 7,
      timbre: "Cello",
    });
    expect(upErr.correct).toBe(false);
    expect(upErr.distance).toBe(3);
    expect(upErr.direction).toBe(1);
    expect(upErr.scenario).toBe(2);

    // Error hacia abajo: C4 (0) respondida como B (11) → 1 semitono abajo
    const downErr = createAttempt({
      timestamp: 3000,
      sessionId: 900,
      sequence: "Mujer",
      level: 80,
      scenario: 4,
      playedMidi: c4,
      answeredPitchClass: 11,
      timbre: "Coro",
    });
    expect(downErr.correct).toBe(false);
    expect(downErr.distance).toBe(1);
    expect(downErr.direction).toBe(-1);
    expect(downErr.scenario).toBe(4);

    // Error de tritono: C4 (0) respondida como F# (6) → distancia 6, dirección 0
    const tritoneErr = createAttempt({
      timestamp: 4000,
      sessionId: 900,
      sequence: "Mujer",
      level: 8,
      scenario: 3,
      playedMidi: c4,
      answeredPitchClass: 6,
      timbre: "Corno",
    });
    expect(tritoneErr.correct).toBe(false);
    expect(tritoneErr.distance).toBe(6);
    expect(tritoneErr.direction).toBe(0);
    expect(tritoneErr.scenario).toBe(3);
  });
});

describe("Almacén sobre KeyValueStore: codificación compacta, datos corruptos y cuota llena", () => {
  const sampleAttempts: Attempt[] = [
    createAttempt({
      timestamp: 1_761_424_205_000,
      sessionId: 1_761_424_000_000,
      sequence: "Hombre",
      level: 3,
      scenario: 1,
      playedMidi: 54,
      answeredPitchClass: 6,
      timbre: "Piano",
    }),
    createAttempt({
      timestamp: 1_761_424_215_000,
      sessionId: 1_761_424_000_000,
      sequence: "Mujer",
      level: 140,
      scenario: 5,
      playedMidi: 64,
      answeredPitchClass: 2,
      timbre: "Guitarra",
    }),
  ];

  it("serializa como arreglo de arreglos en la clave walking-ap:attempts:v1 y hace round-trip exacto", () => {
    const store = createMemoryStore();
    const ok = saveAttempts(store, sampleAttempts);
    expect(ok).toBe(true);

    const raw = store.data[ATTEMPTS_STORAGE_KEY];
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(Array.isArray(parsed[0])).toBe(true);
    expect(Array.isArray(parsed[1])).toBe(true);

    const loaded = loadAttempts(store);
    expect(loaded).toEqual(sampleAttempts);
    expect(decodeAttempts(encodeAttempts(sampleAttempts))).toEqual(sampleAttempts);
  });

  it("datos corruptos o ausentes devuelven [] y nunca lanzan", () => {
    const corruptCases = [
      "{json roto",
      "null",
      "123",
      '"texto"',
      "{}",
      "[{}]",
      "[[1, 2, 3]]", // longitud incorrecta
      '[[-1, 100, 0, 1, 1, 60, 0, 0, 1, 0, 0]]', // timestamp negativo
      '[[100, 100, 9, 1, 1, 60, 0, 0, 1, 0, 0]]', // secuencia fuera de rango
      '[[100, 100, 0, 0, 1, 60, 0, 0, 1, 0, 0]]', // nivel 0 inválido
      '[[100, 100, 0, 1, 9, 60, 0, 0, 1, 0, 0]]', // scenario 9 inválido
      '[[100, 100, 0, 1, 1, 60, 12, 0, 1, 0, 0]]', // pitchClass 12 inválido
      '[[100, 100, 0, 1, 1, 60, 0, 99, 1, 0, 0]]', // timbre inválido
      '[[100, 100, 0, 1, 1, 60, 0, 0, 2, 0, 0]]', // correctBit inválido
      '[[100, 100, 0, 1, 1, 60, 0, 0, 0, 7, 1]]', // distancia > 6
      '[[100, 100, 0, 1, 1, 60, 0, 0, 0, 2, 5]]', // dirección inválida
    ];

    for (const raw of corruptCases) {
      const store = createMemoryStore({ [ATTEMPTS_STORAGE_KEY]: raw });
      expect(loadAttempts(store), raw).toEqual([]);
    }

    const throwingStore: KeyValueStore = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(loadAttempts(throwingStore)).toEqual([]);
  });

  it("cuando la cuota está llena conserva los intentos en memoria, devuelve false y permite borrar todo", () => {
    let quotaFull = false;
    const underlying: Record<string, string> = {};
    const store: KeyValueStore = {
      getItem(key: string) {
        return underlying[key] ?? null;
      },
      setItem(key: string, value: string) {
        if (quotaFull) {
          throw new Error("QuotaExceededError");
        }
        underlying[key] = value;
      },
    };

    // Primer intento cabe en almacenamiento
    const r1 = recordAttempt(store, sampleAttempts[0]);
    expect(r1.saved).toBe(true);
    expect(loadAttempts(store)).toEqual([sampleAttempts[0]]);

    // Se llena la cuota antes del segundo intento
    quotaFull = true;
    const r2 = recordAttempt(store, sampleAttempts[1]);
    expect(r2.saved).toBe(false);
    expect(r2.attempts).toEqual(sampleAttempts);

    // Aunque localStorage falló, loadAttempts devuelve la lista completa conservada en memoria
    expect(loadAttempts(store)).toEqual(sampleAttempts);

    // clearAttempts limpia todo sin lanzar aunque setItem siga fallando
    expect(() => clearAttempts(store)).not.toThrow();
    expect(loadAttempts(store)).toEqual([]);
  });

  it("AttemptStore administra intentos en memoria, maneja cuota llena y limpia correctamente", () => {
    const failingStore: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };

    const manager = new AttemptStore(failingStore);
    expect(manager.count()).toBe(0);

    const { attempt, saved } = manager.record({
      timestamp: 5000,
      sessionId: 100,
      sequence: "Hombre",
      level: 1,
      scenario: 1,
      playedMidi: 48,
      answeredPitchClass: 0,
      timbre: "Piano",
    });

    expect(saved).toBe(false);
    expect(attempt.correct).toBe(true);
    expect(manager.count()).toBe(1);
    expect(manager.getAll()).toEqual([attempt]);

    manager.clear();
    expect(manager.count()).toBe(0);
    expect(manager.getAll()).toEqual([]);
  });
});

describe("Métricas de estadísticas (casos pequeños calculados a mano)", () => {
  // Sesión 100 (Hombre, nivel 2): 4 intentos → 2 aciertos, 2 errores (distancias 2 y 4 → promedio 3.0, 50 %)
  // Sesión 200 (Hombre, nivel 2): 5 intentos → 4 aciertos, 1 error (distancia 1 → promedio 1.0, 80 %)
  // Sesión 300 (Hombre, nivel 5): 2 intentos → 1 acierto, 1 error tritono (distancia 6 → promedio 6.0, 50 %)
  // Sesión 400 (Mujer, nivel 2):  2 intentos → 2 aciertos (100 %, avgDistance null)
  const attempts: Attempt[] = [
    // Sesión 100 — Hombre, nivel 2
    createAttempt({
      timestamp: 1010,
      sessionId: 100,
      sequence: "Hombre",
      level: 2,
      playedMidi: 48, // C3 (pc 0)
      answeredPitchClass: 0, // C → acierto
      timbre: "Piano",
    }),
    createAttempt({
      timestamp: 1020,
      sessionId: 100,
      sequence: "Hombre",
      level: 2,
      playedMidi: 48, // C3 (pc 0)
      answeredPitchClass: 2, // D → error +2 arriba
      timbre: "Cello",
    }),
    createAttempt({
      timestamp: 1030,
      sessionId: 100,
      sequence: "Hombre",
      level: 2,
      playedMidi: 54, // F#3 (pc 6)
      answeredPitchClass: 6, // F# → acierto
      timbre: "Piano",
    }),
    createAttempt({
      timestamp: 1040,
      sessionId: 100,
      sequence: "Hombre",
      level: 2,
      playedMidi: 54, // F#3 (pc 6)
      answeredPitchClass: 2, // D → error -4 abajo
      timbre: "Corno",
    }),

    // Sesión 200 — Hombre, nivel 2
    createAttempt({
      timestamp: 2010,
      sessionId: 200,
      sequence: "Hombre",
      level: 2,
      playedMidi: 48, // C3 (pc 0)
      answeredPitchClass: 0, // acierto
      timbre: "Piano",
    }),
    createAttempt({
      timestamp: 2020,
      sessionId: 200,
      sequence: "Hombre",
      level: 2,
      playedMidi: 60, // C4 (pc 0)
      answeredPitchClass: 0, // acierto
      timbre: "Cello",
    }),
    createAttempt({
      timestamp: 2030,
      sessionId: 200,
      sequence: "Hombre",
      level: 2,
      playedMidi: 60, // C4 (pc 0)
      answeredPitchClass: 11, // B → error -1 abajo
      timbre: "Coro",
    }),
    createAttempt({
      timestamp: 2040,
      sessionId: 200,
      sequence: "Hombre",
      level: 2,
      playedMidi: 54, // F#3 (pc 6)
      answeredPitchClass: 6, // acierto
      timbre: "Fagot",
    }),
    createAttempt({
      timestamp: 2050,
      sessionId: 200,
      sequence: "Hombre",
      level: 2,
      playedMidi: 54, // F#3 (pc 6)
      answeredPitchClass: 6, // acierto
      timbre: "Guitarra",
    }),

    // Sesión 300 — Hombre, nivel 5
    createAttempt({
      timestamp: 3010,
      sessionId: 300,
      sequence: "Hombre",
      level: 5,
      playedMidi: 52, // E3 (pc 4)
      answeredPitchClass: 4, // acierto
      timbre: "Piano",
    }),
    createAttempt({
      timestamp: 3020,
      sessionId: 300,
      sequence: "Hombre",
      level: 5,
      playedMidi: 52, // E3 (pc 4)
      answeredPitchClass: 10, // A# → tritono (dist 6, dir 0)
      timbre: "Guitarra",
    }),

    // Sesión 400 — Mujer, nivel 2
    createAttempt({
      timestamp: 4010,
      sessionId: 400,
      sequence: "Mujer",
      level: 2,
      playedMidi: 60,
      answeredPitchClass: 0,
      timbre: "Piano",
    }),
    createAttempt({
      timestamp: 4020,
      sessionId: 400,
      sequence: "Mujer",
      level: 2,
      playedMidi: 66,
      answeredPitchClass: 6,
      timbre: "Cello",
    }),
  ];

  it("calcula el porcentaje de aciertos de una sesión y de la sesión anterior del mismo nivel", () => {
    const comp = sessionComparison(attempts, "Hombre", 2);
    expect(comp.current).not.toBeNull();
    expect(comp.previous).not.toBeNull();

    // Sesión actual (200): 4/5 = 80 %, avgDistance = 1.0
    expect(comp.current!.sessionId).toBe(200);
    expect(comp.current!.total).toBe(5);
    expect(comp.current!.correct).toBe(4);
    expect(comp.current!.errors).toBe(1);
    expect(comp.current!.percentage).toBeCloseTo(80);
    expect(comp.current!.avgDistance).toBeCloseTo(1.0);

    // Sesión anterior (100): 2/4 = 50 %, avgDistance = (2 + 4) / 2 = 3.0
    expect(comp.previous!.sessionId).toBe(100);
    expect(comp.previous!.total).toBe(4);
    expect(comp.previous!.correct).toBe(2);
    expect(comp.previous!.errors).toBe(2);
    expect(comp.previous!.percentage).toBeCloseTo(50);
    expect(comp.previous!.avgDistance).toBeCloseTo(3.0);

    // Si el alumno acaba de abrir una sesión nueva (250) en el nivel 2 y aún no responde:
    const newSessionComp = sessionComparison(attempts, "Hombre", 2, 250);
    expect(newSessionComp.current).toBeNull();
    expect(newSessionComp.previous?.sessionId).toBe(200);

    // En nivel 5 solo hay una sesión (300), por lo que previous es null
    const level5Comp = sessionComparison(attempts, "Hombre", 5);
    expect(level5Comp.current?.sessionId).toBe(300);
    expect(level5Comp.previous).toBeNull();
  });

  it("calcula distancia promedio total de errores y de los últimos 50 errores", () => {
    // Hombre global: errores con distancias [2, 4, 1, 6] → promedio = 13 / 4 = 3.25
    const globalHombre = errorDistanceStats(attempts, "Hombre");
    expect(globalHombre.total).toBe(11);
    expect(globalHombre.correct).toBe(7);
    expect(globalHombre.errors).toBe(4);
    expect(globalHombre.percentage).toBeCloseTo((7 / 11) * 100);
    expect(globalHombre.avgDistance).toBeCloseTo(3.25);
    expect(globalHombre.last50AvgDistance).toBeCloseTo(3.25);

    // Hombre nivel 2 (también acepta un objeto Level): errores [2, 4, 1] → promedio = 7 / 3
    const level2Obj = getLevel("Hombre", 2)!;
    const level2Stats = errorDistanceStats(attempts, "Hombre", level2Obj);
    expect(level2Stats.total).toBe(9);
    expect(level2Stats.errors).toBe(3);
    expect(level2Stats.avgDistance).toBeCloseTo(7 / 3);
    expect(level2Stats.last50AvgDistance).toBeCloseTo(7 / 3);

    // Mujer nivel 2: sin errores → avgDistance y last50AvgDistance son null
    const mujerStats = errorDistanceStats(attempts, "Mujer", 2);
    expect(mujerStats.total).toBe(2);
    expect(mujerStats.errors).toBe(0);
    expect(mujerStats.percentage).toBe(100);
    expect(mujerStats.avgDistance).toBeNull();
    expect(mujerStats.last50AvgDistance).toBeNull();

    // Prueba con 60 errores: los primeros 10 tienen distancia 5, los últimos 50 tienen distancia 2
    const manyErrors: Attempt[] = [];
    for (let i = 0; i < 60; i++) {
      manyErrors.push(
        createAttempt({
          timestamp: 10_000 + i,
          sessionId: 500,
          sequence: "Hombre",
          level: 10,
          playedMidi: 60, // C4 (pc 0)
          answeredPitchClass: i < 10 ? 5 : 2, // primeros 10: dist 5; últimos 50: dist 2
          timbre: "Piano",
        }),
      );
    }
    const stats60 = errorDistanceStats(manyErrors, "Hombre", 10);
    // Total: (10*5 + 50*2) / 60 = 150 / 60 = 2.5; últimos 50: 2.0
    expect(stats60.errors).toBe(60);
    expect(stats60.avgDistance).toBeCloseTo(2.5);
    expect(stats60.last50AvgDistance).toBeCloseTo(2.0);
  });

  it("calcula hacia dónde se va (arriba vs abajo) excluyendo tritonos", () => {
    // En Hombre global hay: 1 error arriba (+2), 2 errores abajo (-4, -1) y 1 tritono (6)
    const drift = errorDrift(attempts, "Hombre");
    expect(drift.errorsAbove).toBe(1);
    expect(drift.errorsBelow).toBe(2);
    expect(drift.tritoneErrors).toBe(1);
    expect(drift.directionalErrors).toBe(3);
    expect(drift.aboveRatio).toBeCloseTo(1 / 3);
    expect(drift.belowRatio).toBeCloseTo(2 / 3);
    expect(drift.abovePercent).toBeCloseTo(100 / 3);
    expect(drift.belowPercent).toBeCloseTo(200 / 3);

    // En Hombre nivel 5 solo hay 1 error y es de tritono → directionalErrors = 0, ratios null
    const driftTritoneOnly = errorDrift(attempts, "Hombre", 5);
    expect(driftTritoneOnly.tritoneErrors).toBe(1);
    expect(driftTritoneOnly.directionalErrors).toBe(0);
    expect(driftTritoneOnly.aboveRatio).toBeNull();
    expect(driftTritoneOnly.belowRatio).toBeNull();
  });

  it("calcula precisión por nota: tanto por clase de altura como por altura con octava", () => {
    // En Hombre nivel 2:
    // - Clase C (pc 0): C3 (3 intentos: 2 aciertos, 1 error dist 2) + C4 (2 intentos: 1 acierto, 1 error dist 1)
    //   → total 5, aciertos 3 (60 %), avgDistance = (2 + 1) / 2 = 1.5
    // - Clase F# (pc 6): F#3 (4 intentos: 3 aciertos, 1 error dist 4)
    //   → total 4, aciertos 3 (75 %), avgDistance = 4.0
    const byClass = accuracyByPitchClass(attempts, "Hombre", 2, "sharps");
    expect(byClass).toEqual([
      {
        pitchClass: 0,
        name: "C",
        total: 5,
        correct: 3,
        errors: 2,
        percentage: 60,
        avgDistance: 1.5,
      },
      {
        pitchClass: 6,
        name: "F#",
        total: 4,
        correct: 3,
        errors: 1,
        percentage: 75,
        avgDistance: 4,
      },
    ]);

    // Con bemoles ("Gb")
    const byClassFlats = accuracyByPitchClass(attempts, "Hombre", 2, "flats");
    expect(byClassFlats[1].name).toBe("Gb");

    // Por altura con octava (C3 = 48, F#3 = 54, C4 = 60)
    const byPitch = accuracyByPitch(attempts, "Hombre", 2, "sharps");
    expect(byPitch.map((p) => ({ name: p.name, total: p.total, correct: p.correct, avgDistance: p.avgDistance }))).toEqual([
      { name: "C3", total: 3, correct: 2, avgDistance: 2 },
      { name: "F#3", total: 4, correct: 3, avgDistance: 4 },
      { name: "C4", total: 2, correct: 1, avgDistance: 1 },
    ]);
  });

  it("calcula precisión por timbre en el orden canónico de TIMBRES", () => {
    const byTimbre = accuracyByTimbre(attempts, "Hombre");
    expect(byTimbre).toEqual([
      { timbre: "Piano", total: 4, correct: 4, errors: 0, percentage: 100, avgDistance: null },
      { timbre: "Cello", total: 2, correct: 1, errors: 1, percentage: 50, avgDistance: 2 },
      { timbre: "Corno", total: 1, correct: 0, errors: 1, percentage: 0, avgDistance: 4 },
      { timbre: "Coro", total: 1, correct: 0, errors: 1, percentage: 0, avgDistance: 1 },
      { timbre: "Fagot", total: 1, correct: 1, errors: 0, percentage: 100, avgDistance: null },
      { timbre: "Guitarra", total: 2, correct: 1, errors: 1, percentage: 50, avgDistance: 6 },
    ]);
  });

  it("devuelve el historial de sesiones ordenado de más reciente a más antigua y resúmenes por día/nivel", () => {
    const history = sessionHistory(attempts, "Hombre");
    expect(history.map((s) => s.sessionId)).toEqual([300, 200, 100]);
    expect(history[0]).toMatchObject({
      sessionId: 300,
      timestamp: 300,
      level: 5,
      total: 2,
      correct: 1,
      errors: 1,
      percentage: 50,
      avgDistance: 6,
    });

    const lvlDist = levelDistances(attempts, "Hombre");
    expect(lvlDist).toEqual([
      { level: 2, avgDistance: 7 / 3 },
      { level: 5, avgDistance: 6 },
    ]);

    const daily = dailyErrorDistance(attempts, "Hombre");
    expect(daily).toHaveLength(1);
    expect(daily[0].total).toBe(11);
    expect(daily[0].errors).toBe(4);
    expect(daily[0].errorsAbove).toBe(1);
    expect(daily[0].errorsBelow).toBe(2);
  });
});

describe("Exportación CSV (port de CsvExporterTest.kt)", () => {
  const sampleTimestamp = new Date(2026, 9, 25, 14, 30, 5).getTime(); // 2026-10-25 14:30:05 local
  const sampleSession = new Date(2026, 9, 25, 14, 20, 0).getTime(); // 2026-10-25 14:20:00 local

  it("incluye encabezado en español y formatea filas de acierto, error arriba, abajo y tritono con scenario", () => {
    const attempts: Attempt[] = [
      createAttempt({
        timestamp: sampleTimestamp,
        sessionId: sampleSession,
        sequence: "Hombre",
        level: 3,
        scenario: 1,
        playedMidi: 54, // F#3
        answeredPitchClass: 6, // F#
        timbre: "Piano",
      }),
      createAttempt({
        timestamp: sampleTimestamp,
        sessionId: sampleSession,
        sequence: "Hombre",
        level: 3,
        scenario: 1,
        playedMidi: 52, // E3
        answeredPitchClass: 7, // G (+3 arriba)
        timbre: "Cello",
      }),
      createAttempt({
        timestamp: sampleTimestamp,
        sessionId: sampleSession,
        sequence: "Mujer",
        level: 8,
        scenario: 2,
        playedMidi: 60, // C4
        answeredPitchClass: 6, // F# (6 tritono)
        timbre: "Corno",
      }),
      createAttempt({
        timestamp: sampleTimestamp,
        sessionId: 0,
        sequence: "Mujer",
        level: 8,
        scenario: 2,
        playedMidi: 48, // C3
        answeredPitchClass: 11, // B (-1 abajo)
        timbre: "Guitarra",
      }),
    ];

    const lines = exportAttemptsToCsv(attempts).trimEnd().split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toBe(
      "fecha_hora,secuencia,nivel,escenario,timbre,nota_sonada,nota_respondida,correcto,distancia_semitonos,direccion,sesion",
    );
    expect(lines[1]).toBe(
      "2026-10-25 14:30:05,HOMBRE,3,1,Piano,F#3,F#,si,0,,2026-10-25 14:20:00",
    );
    expect(lines[2]).toBe(
      "2026-10-25 14:30:05,HOMBRE,3,1,Cello,E3,G,no,3,arriba,2026-10-25 14:20:00",
    );
    expect(lines[3]).toBe(
      "2026-10-25 14:30:05,MUJER,8,2,Corno,C4,F#,no,6,tritono,2026-10-25 14:20:00",
    );
    expect(lines[4]).toBe(
      "2026-10-25 14:30:05,MUJER,8,2,Guitarra,C3,B,no,1,abajo,",
    );

    // También soporta etiquetas en inglés (CSV_LABELS_EN)
    const enLines = exportAttemptsToCsv(attempts.slice(0, 2), CSV_LABELS_EN).trimEnd().split("\n");
    expect(enLines[0]).toBe(
      "date_time,sequence,level,scenario,timbre,played_note,answered_note,correct,distance_semitones,direction,session",
    );
    expect(enLines[1]).toBe(
      "2026-10-25 14:30:05,MALE,3,1,Piano,F#3,F#,yes,0,,2026-10-25 14:20:00",
    );
    expect(enLines[2]).toBe(
      "2026-10-25 14:30:05,MALE,3,1,Cello,E3,G,no,3,above,2026-10-25 14:20:00",
    );
  });

  it("escapa comas, comillas dobles y saltos de línea según RFC 4180", () => {
    expect(escapeCsv('Coro, "Especial"')).toBe('"Coro, ""Especial"""');
    expect(escapeCsv("Línea 1\nLínea 2")).toBe('"Línea 1\nLínea 2"');

    const attempt = createAttempt({
      timestamp: sampleTimestamp,
      sessionId: 0,
      sequence: "Hombre",
      level: 1,
      scenario: 1,
      playedMidi: 48, // C3
      answeredPitchClass: 11, // B
      timbre: "Coro",
    });

    const customLabels = {
      ...CSV_LABELS_ES,
      timbres: { Coro: 'Coro, "Especial"' },
    };
    const lines = exportAttemptsToCsv([attempt], customLabels).trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"Coro, ""Especial"""');
    expect(lines[1].endsWith(",C3,B,no,1,abajo,")).toBe(true);
  });
});
