import { describe, it, expect } from "vitest";
import {
  SEQUENCES,
  TIMBRES,
  WORLD_RANGES,
  parsePitch,
  pitchFromMidi,
  pitchClassName,
  pitchName,
  sampleName,
  worldOfLevel,
  getLevels,
  getLevel,
  levelsOfWorld,
  errorDistance,
  QuestionGenerator,
  emptyProgress,
  recordAnswer,
  currentLevel,
  completedInWorld,
  loadProgress,
  saveProgress,
  type KeyValueStore,
  type Level,
  type SequenceProgress,
} from "./progression";

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
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

function makeTestLevel(number: number, requiredStreak = 3, noteNames = ["C3", "F#3"]): Level {
  const pitches = noteNames.map((n) => parsePitch(n)!).sort((a, b) => a.midi - b.midi);
  const answerClasses = Array.from(new Set(pitches.map((p) => p.pitchClass))).sort((a, b) => a - b);
  return {
    number,
    world: worldOfLevel(number),
    pitches,
    timbres: [...TIMBRES],
    requiredStreak,
    comment: "",
    commentEnglish: "",
    answerClasses,
  };
}

describe("Pitch y distancias de error", () => {
  it("parsea notas naturales, alteraciones (#, b, ♯, ♭), mayúsculas/minúsculas, espacios y octavas", () => {
    const examples: Array<[string, number]> = [
      ["C3", 48],
      [" F#3 ", 54],
      ["Gb3", 54],
      ["eb4", 63],
      ["F♯3", 54],
      ["G♭3", 54],
      ["B#3", 60],
      ["Cb4", 59],
      ["C-1", 0],
      ["E2", 40],
      ["C4", 60],
      ["E5", 76],
    ];
    for (const [text, midi] of examples) {
      expect(parsePitch(text), text).toEqual(pitchFromMidi(midi));
    }

    const invalid = ["", "H3", "C", "C##3", "Cbb3", "3C", "C3.0", "C10", "C 3"];
    for (const bad of invalid) {
      expect(parsePitch(bad), bad).toBeNull();
    }
  });

  it("nombra notas con sostenidos o bemoles y hace round-trip en todo el rango E2..E5", () => {
    const sharps = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const flats = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

    for (let pc = 0; pc < 12; pc++) {
      expect(pitchClassName(pc, "sharps")).toBe(sharps[pc]);
      expect(pitchClassName(pc, "flats")).toBe(flats[pc]);
      const p = pitchFromMidi(48 + pc);
      expect(sampleName(p)).toBe(`${sharps[pc]}3`);
      expect(pitchName(p, "flats")).toBe(`${flats[pc]}3`);
    }

    for (let midi = 40; midi <= 76; midi++) {
      const pitch = pitchFromMidi(midi);
      expect(parsePitch(pitchName(pitch, "sharps"))).toEqual(pitch);
      expect(parsePitch(pitchName(pitch, "flats"))).toEqual(pitch);
    }
  });

  it("calcula errorDistance para los 12 desplazamientos desde cada clase de altura", () => {
    const expected = [
      { semitones: 0, direction: 0 },
      { semitones: 1, direction: 1 },
      { semitones: 2, direction: 1 },
      { semitones: 3, direction: 1 },
      { semitones: 4, direction: 1 },
      { semitones: 5, direction: 1 },
      { semitones: 6, direction: 0 },
      { semitones: 5, direction: -1 },
      { semitones: 4, direction: -1 },
      { semitones: 3, direction: -1 },
      { semitones: 2, direction: -1 },
      { semitones: 1, direction: -1 },
    ];

    for (let correct = 0; correct < 12; correct++) {
      expected.forEach((distance, offset) => {
        const actual = errorDistance((correct + offset) % 12, correct);
        expect(actual, `correct=${correct} offset=${offset}`).toEqual(distance);
      });
    }
  });
});

describe("Niveles y mundos (levels.json)", () => {
  it("las dos secuencias tienen 147 niveles numerados 1…147 y usan caché", () => {
    for (const seq of SEQUENCES) {
      const levels = getLevels(seq);
      expect(levels).toHaveLength(147);
      expect(getLevels(seq)).toBe(levels);
      levels.forEach((level, idx) => {
        expect(level.number).toBe(idx + 1);
        expect(level.world).toBe(worldOfLevel(level.number));
        expect(getLevel(seq, level.number)).toBe(level);
      });
      expect(getLevel(seq, 0)).toBeUndefined();
      expect(getLevel(seq, 148)).toBeUndefined();
    }
  });

  it("todas las alturas están entre midi 40 y 76 y ordenadas de forma ascendente", () => {
    for (const seq of SEQUENCES) {
      for (const level of getLevels(seq)) {
        expect(level.pitches.length).toBeGreaterThanOrEqual(2);
        for (let i = 0; i < level.pitches.length; i++) {
          const { midi } = level.pitches[i];
          expect(midi).toBeGreaterThanOrEqual(40);
          expect(midi).toBeLessThanOrEqual(76);
          if (i > 0) {
            expect(midi).toBeGreaterThan(level.pitches[i - 1].midi);
          }
        }
        expect(level.timbres.length).toBeGreaterThan(0);
        for (const t of level.timbres) {
          expect(TIMBRES).toContain(t);
        }
      }
    }
  });

  it("cada mundo tiene 36, 33, 34, 35 y 9 niveles respectivamente", () => {
    const expectedCounts: Record<number, number> = {
      1: 36,
      2: 33,
      3: 34,
      4: 35,
      5: 9,
    };
    for (const seq of SEQUENCES) {
      for (const world of [1, 2, 3, 4, 5]) {
        const worldLevels = levelsOfWorld(seq, world);
        expect(worldLevels).toHaveLength(expectedCounts[world]);
        const [min, max] = WORLD_RANGES[world];
        expect(worldLevels[0].number).toBe(min);
        expect(worldLevels[worldLevels.length - 1].number).toBe(max);
      }
    }
  });

  it("el nivel 147 tiene 37 alturas y 12 answerClasses (0…11)", () => {
    for (const seq of SEQUENCES) {
      const level147 = getLevel(seq, 147)!;
      expect(level147).toBeDefined();
      expect(level147.pitches).toHaveLength(37);
      expect(level147.pitches[0].midi).toBe(40);
      expect(level147.pitches[36].midi).toBe(76);
      expect(level147.answerClasses).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    }
  });
});

describe("QuestionGenerator", () => {
  const threeNoteLevel = makeTestLevel(1, 20, ["C3", "F#3", "C4"]);
  const twoNoteLevel = makeTestLevel(1, 20, ["E3", "D#4"]);

  it("elige únicamente notas del nivel", () => {
    const gen = new QuestionGenerator(createSeededRandom(1));
    const questions = Array.from({ length: 2000 }, () => gen.next(threeNoteLevel));
    const chosenMidis = new Set(questions.map((q) => q.pitch.midi));
    expect(chosenMidis).toEqual(new Set(threeNoteLevel.pitches.map((p) => p.midi)));
  });

  it("en 2000 preguntas de un nivel de dos notas la repetición queda cerca del 10 %", () => {
    const gen = new QuestionGenerator(createSeededRandom(42));
    const pitches = Array.from({ length: 2000 }, () => gen.next(twoNoteLevel).pitch);
    let repeats = 0;
    for (let i = 1; i < pitches.length; i++) {
      if (pitches[i].midi === pitches[i - 1].midi) {
        repeats++;
      }
    }
    const rate = repeats / (pitches.length - 1);
    expect(rate).toBeGreaterThanOrEqual(0.08);
    expect(rate).toBeLessThanOrEqual(0.12);
  });

  it("en 20000 preguntas de tres notas repite la nota anterior cerca de 1 de cada 10 veces", () => {
    const gen = new QuestionGenerator(createSeededRandom(7));
    const pitches = Array.from({ length: 20000 }, () => gen.next(threeNoteLevel).pitch);
    let repeats = 0;
    for (let i = 1; i < pitches.length; i++) {
      if (pitches[i].midi === pitches[i - 1].midi) {
        repeats++;
      }
    }
    const rate = repeats / (pitches.length - 1);
    expect(rate).toBeGreaterThanOrEqual(0.09);
    expect(rate).toBeLessThanOrEqual(0.11);
  });

  it("pasa por los 6 timbres en cada vuelta y nunca da el mismo timbre dos veces seguidas", () => {
    const gen = new QuestionGenerator(createSeededRandom(3));
    const timbres = Array.from({ length: 600 }, () => gen.next(threeNoteLevel).timbre);

    for (let i = 0; i < timbres.length; i += 6) {
      const round = timbres.slice(i, i + 6);
      expect(new Set(round)).toEqual(new Set(TIMBRES));
    }
    for (let i = 1; i < timbres.length; i++) {
      expect(timbres[i]).not.toBe(timbres[i - 1]);
    }
  });

  it("respeta subconjuntos de timbres y los botones de respuesta no duplican octavas", () => {
    const gen = new QuestionGenerator(createSeededRandom(5));
    const restricted: Level = { ...threeNoteLevel, timbres: ["Piano", "Cello"] };
    const timbres = Array.from({ length: 100 }, () => gen.next(restricted).timbre);
    expect(new Set(timbres)).toEqual(new Set(["Piano", "Cello"]));
    for (let i = 1; i < timbres.length; i++) {
      expect(timbres[i]).not.toBe(timbres[i - 1]);
    }

    expect(threeNoteLevel.answerClasses.map((pc) => pitchClassName(pc, "sharps"))).toEqual([
      "C",
      "F#",
    ]);
    expect(threeNoteLevel.answerClasses.map((pc) => pitchClassName(pc, "flats"))).toEqual([
      "C",
      "Gb",
    ]);
  });
});

describe("Progreso, rachas y persistencia", () => {
  const levels = [makeTestLevel(1, 3), makeTestLevel(2, 3), makeTestLevel(3, 3)];

  it("aciertos consecutivos completan el nivel y avanzan currentLevel", () => {
    let p = emptyProgress();
    expect(currentLevel(p, levels).number).toBe(1);

    let justCompleted = false;
    for (let i = 0; i < 3; i++) {
      const res = recordAnswer(p, levels[0], true);
      p = res.progress;
      justCompleted = res.justCompleted;
    }
    expect(justCompleted).toBe(true);
    expect(p.completed).toContain(1);
    expect(p.streaks[1]).toBe(3);
    expect(p.bestStreaks[1]).toBe(3);
    expect(currentLevel(p, levels).number).toBe(2);
  });

  it("un error regresa la racha a 0, conserva bestStreaks y no muta el progreso previo", () => {
    const initial = emptyProgress();
    const step1 = recordAnswer(initial, levels[0], true).progress;
    const step2 = recordAnswer(step1, levels[0], true).progress;
    const afterError = recordAnswer(step2, levels[0], false).progress;

    expect(initial.streaks[1]).toBeUndefined();
    expect(step2.streaks[1]).toBe(2);
    expect(afterError.streaks[1]).toBe(0);
    expect(afterError.bestStreaks[1]).toBe(2);

    const step3 = recordAnswer(afterError, levels[0], true).progress;
    const step4 = recordAnswer(step3, levels[0], true).progress;
    expect(step4.completed).not.toContain(1);
  });

  it("justCompleted solo es true la primera vez que se completa un nivel", () => {
    let p: SequenceProgress = { completed: [1], streaks: {}, bestStreaks: {} };
    let justCompleted = true;
    for (let i = 0; i < 3; i++) {
      const res = recordAnswer(p, levels[0], true);
      p = res.progress;
      justCompleted = res.justCompleted;
    }
    expect(justCompleted).toBe(false);
    expect(p.completed.filter((n) => n === 1)).toHaveLength(1);
  });

  it("currentLevel devuelve el primero sin completar (sin bloqueo) o el último si todos están completos", () => {
    const outOfOrder: SequenceProgress = { completed: [2], streaks: {}, bestStreaks: {} };
    expect(currentLevel(outOfOrder, levels).number).toBe(1);

    const allDone: SequenceProgress = { completed: [1, 2, 3], streaks: {}, bestStreaks: {} };
    expect(currentLevel(allDone, levels).number).toBe(3);

    const moreLevels = [...levels, makeTestLevel(4, 3), makeTestLevel(5, 3)];
    expect(currentLevel(allDone, moreLevels).number).toBe(4);
  });

  it("completedInWorld cuenta los niveles completados dentro del rango de cada mundo", () => {
    const p: SequenceProgress = {
      completed: [1, 2, 36, 37, 70, 147],
      streaks: {},
      bestStreaks: {},
    };
    expect(completedInWorld(p, 1)).toBe(3);
    expect(completedInWorld(p, 2)).toBe(1);
    expect(completedInWorld(p, 3)).toBe(1);
    expect(completedInWorld(p, 4)).toBe(0);
    expect(completedInWorld(p, 5)).toBe(1);
    expect(completedInWorld(p, 99)).toBe(0);
  });

  it("guardar y cargar devuelve el mismo progreso por secuencia", () => {
    const store = createMemoryStore();
    const p: SequenceProgress = {
      completed: [1, 2],
      streaks: { 1: 0, 3: 7 },
      bestStreaks: { 1: 20, 3: 9 },
    };
    saveProgress(store, "Hombre", p);
    expect(store.data["walking-ap:progress:v1:Hombre"]).toBeDefined();
    expect(loadProgress(store, "Hombre")).toEqual(p);
    expect(loadProgress(store, "Mujer")).toEqual(emptyProgress());
  });

  it("loadProgress con JSON corrupto o forma inválida devuelve progreso vacío y nunca lanza", () => {
    const corruptCases = [
      "{json corrupto",
      "c=;s=;b=",
      "null",
      "[]",
      "123",
      "{}",
      JSON.stringify({ completed: "no-array", streaks: {}, bestStreaks: {} }),
      JSON.stringify({ completed: [1, "x"], streaks: {}, bestStreaks: {} }),
      JSON.stringify({ completed: [1], streaks: { "1": "bad" }, bestStreaks: {} }),
      JSON.stringify({ completed: [1], streaks: [], bestStreaks: {} }),
      JSON.stringify({ completed: [1], streaks: {}, bestStreaks: { nope: 5 } }),
    ];

    for (const raw of corruptCases) {
      const store = createMemoryStore({ "walking-ap:progress:v1:Hombre": raw });
      expect(loadProgress(store, "Hombre"), raw).toEqual(emptyProgress());
    }

    const throwingStore: KeyValueStore = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => saveProgress(throwingStore, "Hombre", emptyProgress())).not.toThrow();
    expect(loadProgress(throwingStore, "Hombre")).toEqual(emptyProgress());
  });
});
