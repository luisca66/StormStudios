const TRANSLATIONS = {
  es: {
    "meta.title": "Synth-Kong - Retro Edition",
    "app.title": "Synth-Kong",
    "app.subtitle": "Entrenamiento Auditivo Avanzado",
    "config.intervals": "Seleccionar Intervalos",
    "config.timbre": "Timbre (Instrumento)",
    "config.playMode": "Modo de Reproduccion",
    "timbre.piano": "Piano",
    "timbre.choir": "Coro",
    "timbre.horn": "Corno",
    "timbre.cello": "Cello",
    "timbre.bassoon": "Fagot",
    "timbre.random": "Aleatorio",
    "playMode.harmonic": "Armonico",
    "playMode.melodic": "Melodico",
    "playMode.random": "Aleatorio",
    "action.start": "INICIAR PARTIDA",
    "action.loading": "CARGANDO...",
    "action.back": "VOLVER",
    "hud.sector": "SECTOR",
    "hud.heading": "RUMBO AL PLANETA",
    "hud.errors": "ERRORES",
    "volume.short": "VOL",
    "action.replay": "REPETIR AUDIO (Espacio)",
    "credit": "Desarrollado por Luis Cardenas para Storm Studios Learning",
    "alert.selectInterval": "Por favor selecciona al menos un grupo de intervalos.",
    "alert.victory.title": "Llegaste al planeta!",
    "alert.victory.errors": "Errores",
    "alert.victory.perfect": "Aterrizaje perfecto",
    "common.yes": "SI",
    "common.no": "NO",
  },
  en: {
    "meta.title": "Synth-Kong - Retro Edition",
    "app.title": "Synth-Kong",
    "app.subtitle": "Advanced Ear Training",
    "config.intervals": "Select Intervals",
    "config.timbre": "Timbre (Instrument)",
    "config.playMode": "Playback Mode",
    "timbre.piano": "Piano",
    "timbre.choir": "Choir",
    "timbre.horn": "Horn",
    "timbre.cello": "Cello",
    "timbre.bassoon": "Bassoon",
    "timbre.random": "Random",
    "playMode.harmonic": "Harmonic",
    "playMode.melodic": "Melodic",
    "playMode.random": "Random",
    "action.start": "START GAME",
    "action.loading": "LOADING...",
    "action.back": "BACK",
    "hud.sector": "SECTOR",
    "hud.heading": "TO THE PLANET",
    "hud.errors": "ERRORS",
    "volume.short": "VOL",
    "action.replay": "REPLAY AUDIO (Space)",
    "credit": "Developed by Luis Cardenas for Storm Studios Learning",
    "alert.selectInterval": "Please select at least one interval group.",
    "alert.victory.title": "You reached the planet!",
    "alert.victory.errors": "Errors",
    "alert.victory.perfect": "Perfect landing",
    "common.yes": "YES",
    "common.no": "NO",
  },
} as const;

const INTERVAL_LABELS = {
  es: {
    "2m": "2m",
    "2M": "2M",
    "3m": "3m",
    "3M": "3M",
    "4J": "4J",
    "5dis": "5dis",
    "5J": "5J",
    "6m": "6m",
    "6M": "6M",
    "7m": "7m",
    "7M": "7M",
    "8J": "8J",
    "9m": "9m",
    "9M": "9M",
  },
  en: {
    "2m": "m2",
    "2M": "M2",
    "3m": "m3",
    "3M": "M3",
    "4J": "P4",
    "5dis": "d5",
    "5J": "P5",
    "6m": "m6",
    "6M": "M6",
    "7m": "m7",
    "7M": "M7",
    "8J": "P8",
    "9m": "m9",
    "9M": "M9",
  },
} as const;

export type Lang = keyof typeof TRANSLATIONS;
export type TranslationKey = keyof typeof TRANSLATIONS.es;
export type IntervalId = keyof typeof INTERVAL_LABELS.es;

export function getLanguage(): Lang {
  const lang = new URL(window.location.href).searchParams.get("lang");
  return lang === "en" ? "en" : "es";
}

export function t(lang: Lang, key: TranslationKey): string {
  return TRANSLATIONS[lang][key] ?? TRANSLATIONS.es[key];
}

export function intervalLabel(lang: Lang, intervalId: string): string {
  return INTERVAL_LABELS[lang][intervalId as IntervalId] ?? intervalId;
}

export function applyStaticTranslations(lang: Lang) {
  document.documentElement.lang = lang;
  document.title = t(lang, "meta.title");

  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as TranslationKey | undefined;
    if (!key) return;
    element.textContent = t(lang, key);
  });
}
