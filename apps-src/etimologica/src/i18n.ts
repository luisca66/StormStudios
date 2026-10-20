export type Lang = "es" | "en";

export function detectLang(search: string = typeof window !== "undefined" ? window.location.search : ""): Lang {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get("lang")?.toLowerCase();
    if (raw === "en") return "en";
    return "es";
  } catch {
    return "es";
  }
}

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  pointsSuffix: (pts: number) => string;
  playBtn: string;
  collectionBtn: string;
  statsBtn: string;
  backLabel: string;
  categoriesTitle: string;
  unlockRequirementHint: string;
  categoryCompletedTitle: string;
  sessionPoints: (pts: number) => string;
  backToCategoriesBtn: string;
  retryIncorrectBtn: string;
  replayCategoryBtn: string;
  scoreLabel: (pts: number) => string;
  remainingLabel: (count: number) => string;
  etymologyHintsTitle: string;
  correctPointsEarned: (pts: number) => string;
  incorrectAnswer: string;
  viewEtymologyCardBtn: string;
  nextWordBtn: string;
  keyboardHintGame: string;
  etymologyCardTitle: string;
  sectionDefinition: string;
  sectionRoots: string;
  sectionEtymology: string;
  sectionOrigin: string;
  sectionFunFact: string;
  categoryPrefix: (name: string) => string;
  collectionTitle: string;
  filterAll: string;
  emptyCollectionCategory: string;
  emptyCollectionAll: string;
  statsTitle: string;
  totalPointsLabel: string;
  wordsCorrectLabel: string;
  accuracyLabel: string;
  maxStreakLabel: string;
  favoriteCategoryLabel: string;
  resetProgressBtn: string;
  resetProgressConfirm: string;
  categoryNames: Record<string, string>;
  categoryDescriptions: Record<string, string>;
}

const ES: Translations = {
  appTitle: "Etimológica",
  appSubtitle: "Gimnasia cerebral para amantes de las palabras",
  pointsSuffix: (pts) => `${pts} puntos`,
  playBtn: "Jugar",
  collectionBtn: "Colección",
  statsBtn: "Estadísticas",
  backLabel: "Volver",
  categoriesTitle: "Categorías",
  unlockRequirementHint: "Acierta 7 palabras en la categoría anterior para desbloquear la siguiente.",
  categoryCompletedTitle: "Categoría completada",
  sessionPoints: (pts) => `+${pts} puntos esta sesión`,
  backToCategoriesBtn: "Volver a categorías",
  retryIncorrectBtn: "Repasar palabras falladas",
  replayCategoryBtn: "Volver a jugar categoría",
  scoreLabel: (pts) => `Puntos: ${pts}`,
  remainingLabel: (count) => `Restantes: ${count}`,
  etymologyHintsTitle: "PISTAS ETIMOLÓGICAS",
  correctPointsEarned: (pts) => `+${pts} puntos`,
  incorrectAnswer: "Respuesta incorrecta",
  viewEtymologyCardBtn: "Ver ficha etimológica →",
  nextWordBtn: "Siguiente palabra →",
  keyboardHintGame: "Teclado: 1–4 elegir opción · Enter siguiente · F ver ficha",
  etymologyCardTitle: "Ficha etimológica",
  sectionDefinition: "Definición",
  sectionRoots: "Raíces",
  sectionEtymology: "Etimología",
  sectionOrigin: "Origen",
  sectionFunFact: "Dato curioso",
  categoryPrefix: (name) => `Categoría: ${name}`,
  collectionTitle: "Colección",
  filterAll: "Todas",
  emptyCollectionCategory: "No has desbloqueado palabras en esta categoría",
  emptyCollectionAll: "Juega para desbloquear fichas",
  statsTitle: "Estadísticas",
  totalPointsLabel: "puntos totales",
  wordsCorrectLabel: "Palabras acertadas",
  accuracyLabel: "Precisión",
  maxStreakLabel: "Racha máxima",
  favoriteCategoryLabel: "Categoría favorita",
  resetProgressBtn: "Reiniciar progreso",
  resetProgressConfirm: "¿Reiniciar todo el progreso guardado?",
  categoryNames: {
    latin_vulgar: "Latín vulgar",
    arabismos: "Arabismos",
    nahuatlismos: "Nahuatlismos",
    helenismos: "Helenismos",
    neologismos: "Neologismos",
  },
  categoryDescriptions: {
    latin_vulgar: "Palabras heredadas del latín",
    arabismos: "Herencia árabe en el español",
    nahuatlismos: "Voces indígenas americanas",
    helenismos: "Raíces griegas",
    neologismos: "Préstamos modernos",
  },
};

const EN: Translations = {
  appTitle: "Etimológica",
  appSubtitle: "Brain gymnastics for lovers of Spanish words",
  pointsSuffix: (pts) => `${pts} points`,
  playBtn: "Play",
  collectionBtn: "Collection",
  statsBtn: "Statistics",
  backLabel: "Back",
  categoriesTitle: "Categories",
  unlockRequirementHint: "Get 7 words right in the previous category to unlock the next one.",
  categoryCompletedTitle: "Category completed",
  sessionPoints: (pts) => `+${pts} points this session`,
  backToCategoriesBtn: "Back to categories",
  retryIncorrectBtn: "Review missed words",
  replayCategoryBtn: "Replay category",
  scoreLabel: (pts) => `Score: ${pts}`,
  remainingLabel: (count) => `Remaining: ${count}`,
  etymologyHintsTitle: "ETYMOLOGY HINTS",
  correctPointsEarned: (pts) => `+${pts} points`,
  incorrectAnswer: "Incorrect answer",
  viewEtymologyCardBtn: "View etymology card →",
  nextWordBtn: "Next word →",
  keyboardHintGame: "Keyboard: 1–4 select option · Enter next · F view card",
  etymologyCardTitle: "Etymology card",
  sectionDefinition: "Definition",
  sectionRoots: "Roots",
  sectionEtymology: "Etymology",
  sectionOrigin: "Historical origin",
  sectionFunFact: "Fun fact",
  categoryPrefix: (name) => `Category: ${name}`,
  collectionTitle: "Collection",
  filterAll: "All",
  emptyCollectionCategory: "No unlocked words in this category yet",
  emptyCollectionAll: "Play to unlock etymology cards",
  statsTitle: "Statistics",
  totalPointsLabel: "total points",
  wordsCorrectLabel: "Words correct",
  accuracyLabel: "Accuracy",
  maxStreakLabel: "Best streak",
  favoriteCategoryLabel: "Favorite category",
  resetProgressBtn: "Reset progress",
  resetProgressConfirm: "Reset all saved progress?",
  categoryNames: {
    latin_vulgar: "Vulgar Latin",
    arabismos: "Arabisms",
    nahuatlismos: "Nahuatlisms",
    helenismos: "Hellenisms",
    neologismos: "Neologisms",
  },
  categoryDescriptions: {
    latin_vulgar: "Words inherited from Latin",
    arabismos: "Arabic heritage in Spanish",
    nahuatlismos: "Indigenous American voices",
    helenismos: "Ancient Greek roots",
    neologismos: "Modern loanwords & coinages",
  },
};

export function getTranslations(lang: Lang): Translations {
  return lang === "en" ? EN : ES;
}
