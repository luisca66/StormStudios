import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES,
  ALL_WORDS,
  GameEngine,
  UNLOCK_REQUIRED_CORRECT,
  calculatePointsForAnswer,
  shuffleWordOptions,
} from "./gameLogic";
import { createMemoryStorage } from "./storage";
import { detectLang, getTranslations } from "./i18n";

describe("Etimológica — Datos JSON (words.json y categories.json)", () => {
  it("contiene exactamente 200 palabras con IDs consecutivos 1..200 y 5 categorías", () => {
    expect(ALL_WORDS.length).toBe(200);
    expect(ALL_CATEGORIES.length).toBe(5);

    const ids = ALL_WORDS.map((w) => w.id);
    const expectedIds = Array.from({ length: 200 }, (_, i) => i + 1);
    expect(ids).toEqual(expectedIds);
  });

  it("reparte 40 palabras en cada una de las 5 categorías", () => {
    const expectedCategoryIds = [
      "latin_vulgar",
      "arabismos",
      "nahuatlismos",
      "helenismos",
      "neologismos",
    ];
    expect(ALL_CATEGORIES.map((c) => c.id)).toEqual(expectedCategoryIds);

    for (const catId of expectedCategoryIds) {
      const count = ALL_WORDS.filter((w) => w.category === catId).length;
      expect(count).toBe(40);
    }
  });

  it("preserva todos los campos requeridos, saltos de línea y caracteres griegos/latinos/árabes", () => {
    for (const w of ALL_WORDS) {
      expect(typeof w.id).toBe("number");
      expect(w.word.trim().length).toBeGreaterThan(0);
      expect(w.category.trim().length).toBeGreaterThan(0);
      expect(w.definition.trim().length).toBeGreaterThan(0);
      expect(w.distractor1.trim().length).toBeGreaterThan(0);
      expect(w.distractor2.trim().length).toBeGreaterThan(0);
      expect(w.distractor3.trim().length).toBeGreaterThan(0);
      expect(w.rootsDisplay.trim().length).toBeGreaterThan(0);
      expect(w.etymologyText.trim().length).toBeGreaterThan(0);
      expect(w.originNote.trim().length).toBeGreaterThan(0);
      expect(w.funFact.trim().length).toBeGreaterThan(0);
      expect(w.unlocked).toBe(false);
      expect(w.answeredCorrectly).toBeNull();
    }

    // Verificar saltos de línea y caracteres especiales (griego, árabe, japonés, sánscrito, macrones)
    const diafano = ALL_WORDS.find((w) => w.id === 3)!;
    expect(diafano.word).toBe("diáfano");
    expect(diafano.rootsDisplay).toContain("\n");
    expect(diafano.rootsDisplay).toContain("διαφανής");
    expect(diafano.rootsDisplay).toContain("φαίνω (phaínō)");

    const alcazar = ALL_WORDS.find((w) => w.id === 11)!;
    expect(alcazar.rootsDisplay).toContain("القصر");

    const chocolate = ALL_WORDS.find((w) => w.id === 21)!;
    expect(chocolate.rootsDisplay).toContain("xocolātl");

    const emoji = ALL_WORDS.find((w) => w.id === 45)!;
    expect(emoji.rootsDisplay).toContain("絵文字");

    const avatar = ALL_WORDS.find((w) => w.id === 47)!;
    expect(avatar.rootsDisplay).toContain("अवतार");

    const trovar = ALL_WORDS.find((w) => w.id === 200)!;
    expect(trovar.word).toBe("trovar");
    expect(trovar.rootsDisplay).toContain("τρόπος");
  });
});

describe("Etimológica — Barajar opciones y cálculo de rachas", () => {
  it("baraja siempre las 4 opciones (definición + 3 distractores) sin perder ninguna", () => {
    const sample = ALL_WORDS[0];
    const options = shuffleWordOptions(sample, () => 0.25);

    expect(options).toHaveLength(4);
    expect(new Set(options)).toEqual(
      new Set([
        sample.definition,
        sample.distractor1,
        sample.distractor2,
        sample.distractor3,
      ])
    );
  });

  it("otorga 10 puntos en racha 1–2, 15 puntos en racha >= 3 y 0 al fallar", () => {
    const r1 = calculatePointsForAnswer(true, 0);
    expect(r1).toEqual({ pointsEarned: 10, newStreak: 1 });

    const r2 = calculatePointsForAnswer(true, 1);
    expect(r2).toEqual({ pointsEarned: 10, newStreak: 2 });

    const r3 = calculatePointsForAnswer(true, 2);
    expect(r3).toEqual({ pointsEarned: 15, newStreak: 3 });

    const r4 = calculatePointsForAnswer(true, 3);
    expect(r4).toEqual({ pointsEarned: 15, newStreak: 4 });

    const wrong = calculatePointsForAnswer(false, 4);
    expect(wrong).toEqual({ pointsEarned: 0, newStreak: 0 });
  });
});

describe("Etimológica — Flujo del juego, progreso, colección y desbloqueo de categorías", () => {
  it("desbloquea la siguiente categoría al alcanzar 7 aciertos en la categoría previa", () => {
    const storage = createMemoryStorage();
    const engine = new GameEngine(storage, () => 0.5);

    const initialCats = engine.getCategoryStates();
    expect(initialCats[0].category.id).toBe("latin_vulgar");
    expect(initialCats[0].isUnlocked).toBe(true);
    expect(initialCats[1].category.id).toBe("arabismos");
    expect(initialCats[1].isUnlocked).toBe(false);

    engine.startCategory("latin_vulgar");

    for (let i = 0; i < UNLOCK_REQUIRED_CORRECT - 1; i++) {
      const current = engine.getGameState().currentWord!;
      engine.selectAnswer(current.definition);
      engine.nextWord();
    }

    // Con 6 aciertos aún no se desbloquea Arabismos
    expect(engine.getCategoryStates()[1].isUnlocked).toBe(false);

    // 7º acierto desbloquea Arabismos
    const seventhWord = engine.getGameState().currentWord!;
    engine.selectAnswer(seventhWord.definition);
    expect(engine.getCategoryStates()[1].isUnlocked).toBe(true);

    // Puntuación esperada: 10 + 10 + 15 * 5 = 95
    const progress = engine.getUserProgress();
    expect(progress.totalScore).toBe(95);
    expect(progress.currentStreak).toBe(7);
    expect(progress.maxStreak).toBe(7);
    expect(progress.wordsAttempted).toBe(7);
    expect(progress.wordsCorrect).toBe(7);
  });

  it("actualiza colección, estadísticas y reinicia racha al fallar conservando maxStreak", () => {
    const storage = createMemoryStorage();
    const engine = new GameEngine(storage, () => 0.1);

    engine.startCategory("latin_vulgar");

    // 3 aciertos seguidos (10 + 10 + 15 = 35 puntos, racha 3)
    for (let i = 0; i < 3; i++) {
      const w = engine.getGameState().currentWord!;
      engine.selectAnswer(w.definition);
      engine.nextWord();
    }

    // 1 fallo (0 puntos, racha 0, maxStreak se mantiene en 3)
    const wrongWord = engine.getGameState().currentWord!;
    const afterWrong = engine.selectAnswer(wrongWord.distractor1);
    expect(afterWrong.isCorrect).toBe(false);
    expect(afterWrong.pointsEarned).toBe(0);
    expect(afterWrong.sessionStreak).toBe(0);
    expect(afterWrong.sessionScore).toBe(35);

    // Las 4 palabras jugadas están desbloqueadas en la colección
    const unlocked = engine.getUnlockedWords();
    expect(unlocked).toHaveLength(4);

    // Estadísticas globales
    const stats = engine.getStatsState();
    expect(stats.totalScore).toBe(35);
    expect(stats.totalCorrect).toBe(3);
    expect(stats.totalAttempted).toBe(4);
    expect(stats.accuracyPercent).toBe(75);
    expect(stats.maxStreak).toBe(3);
    expect(stats.mostPlayedCategory).toBe("latin_vulgar");
  });

  it("soporta detección de idioma ?lang=es|en", () => {
    expect(detectLang("?lang=en")).toBe("en");
    expect(detectLang("?lang=es")).toBe("es");
    expect(detectLang("")).toBe("es");
    expect(getTranslations("en").playBtn).toBe("Play");
    expect(getTranslations("es").playBtn).toBe("Jugar");
  });
});
