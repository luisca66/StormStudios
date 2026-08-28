// i18n es/en (PLAN §10). Lee ?lang= al arrancar; default "es".
// Uso: initI18n() una vez; t("clave") en código; data-i18n="clave" en HTML estático.

export type Lang = "es" | "en";

const dict: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "EXPRESO TONAL",
    "app.tagline": "Escucha. Decide. Llega.",
    "app.loading": "Preparando el viaje…",

    "menu.route": "Ruta (tonalidad)",
    "menu.timbre": "Timbre",
    "menu.speed": "Velocidad",
    "menu.degrees": "Grados a trabajar",
    "menu.onlyDiatonic": "Solo diatónicos",
    "menu.all": "Todo",
    "menu.min2": "Selecciona al menos 2 grados para que haya decisión que tomar.",
    "menu.active": "activos",
    "menu.volume": "Volumen",
    "menu.salon": "Salón de Rutas",
    "menu.start": "INICIAR VIAJE",
    "menu.window": "ventana",

    "speed.SLOW": "Lento",
    "speed.NORMAL": "Normal",
    "speed.FAST": "Rápido",
    "speed.MASTER": "Maestro",

    "biome.VALLE": "Valle Dorado",
    "biome.DESIERTO": "Desierto de Agaves",
    "biome.SIERRA": "Sierra de Niebla",
    "biome.COSTA": "Costa de Salinas",
    "biome.PARAMO": "Páramo de Estrellas",

    "time.AMANECER": "amanecer",
    "time.MEDIODIA": "mediodía",
    "time.ATARDECER": "atardecer",
    "time.NOCHE": "noche estrellada",
    "time.CREPUSCULO": "crepúsculo",
    "time.AURORA": "aurora",

    "timbre.Piano": "Piano",
    "timbre.Cello": "Cello",
    "timbre.Corno": "Corno",
    "timbre.Coro": "Coro",
    "timbre.Fagot": "Fagot",
    "timbre.Aleatorio": "Aleatorio",

    "summary.title": "Parte de viaje",
    "summary.retry": "Reintentar ruta",
    "summary.menu": "Menú",

    "salon.title": "Salón de Rutas",
    "salon.back": "Volver",
    "salon.route": "Ruta",
    "salon.state": "Estado",
    "salon.best": "Mejor",
    "salon.streak": "Racha",
    "salon.speed": "Velocidad",
    "salon.since": "Desde",
    "salon.arrived": "Llegada",
    "salon.gala": "GALA",
    "salon.degreeStats": "Precisión por grado",
    "salon.empty": "Aún no has respondido ningún grado. El tablero se llena solo.",
    "salon.wipe": "Borrar progreso",
    "salon.wipeConfirm": "¿Seguro? Pulsa otra vez",

    "pause.title": "Pausa",
    "pause.resume": "Reanudar",
    "pause.quit": "Abandonar viaje",

    "hud.points": "Puntos",
    "hud.streak": "Racha",
    "hud.speed": "Velocidad",
    "hud.whistle": "Silbato",
    "hud.repeat": "Repetir",
    "hud.listen": "Escucha…",
    "hud.correct": "Correcto. Era",
    "hud.wrong": "Desvío. Era",
    "hud.timeout": "Sin respuesta. Era",
    "hud.noOrder": "La aguja no recibió orden.",
    "hud.whistleUsed": "Silbato: acorde de tónica.",
    "hud.repeated": "Nota repetida.",
    "hud.cadence": "Estableciendo el centro tonal…",
    "hud.rolling": "Vía libre.",
    "hud.detour": "APARTADERO.",

    "medal.gold": "Medalla de oro",
    "medal.silver": "Medalla de plata",
    "medal.bronze": "Medalla de bronce",
    "summary.gala": "¡LLEGADA DE GALA!",
    "summary.points": "Puntos",
    "summary.detours": "Desvíos",
    "summary.accuracy": "Precisión",
    "summary.bestStreak": "Mejor racha",
    "summary.whistlesLeft": "Silbatos sin usar",

    "toast.wip": "En construcción — esta parte llega en una fase posterior.",
    "toast.configSaved": "Configuración lista.",

    "credit": "Desarrollado por Luis Cardenas para Storm Studios Learning",
  },
  en: {
    "app.title": "TONAL EXPRESS",
    "app.tagline": "Listen. Decide. Arrive.",
    "app.loading": "Preparing the journey…",

    "menu.route": "Route (key)",
    "menu.timbre": "Timbre",
    "menu.speed": "Speed",
    "menu.degrees": "Degrees to train",
    "menu.onlyDiatonic": "Diatonic only",
    "menu.all": "All",
    "menu.min2": "Select at least 2 degrees so there is a decision to make.",
    "menu.active": "active",
    "menu.volume": "Volume",
    "menu.salon": "Hall of Routes",
    "menu.start": "START JOURNEY",
    "menu.window": "window",

    "speed.SLOW": "Slow",
    "speed.NORMAL": "Normal",
    "speed.FAST": "Fast",
    "speed.MASTER": "Master",

    "biome.VALLE": "Golden Valley",
    "biome.DESIERTO": "Agave Desert",
    "biome.SIERRA": "Mist Highlands",
    "biome.COSTA": "Salt Flats Coast",
    "biome.PARAMO": "Starlight Moor",

    "time.AMANECER": "sunrise",
    "time.MEDIODIA": "midday",
    "time.ATARDECER": "sunset",
    "time.NOCHE": "starry night",
    "time.CREPUSCULO": "dusk",
    "time.AURORA": "aurora",

    "timbre.Piano": "Piano",
    "timbre.Cello": "Cello",
    "timbre.Corno": "Horn",
    "timbre.Coro": "Choir",
    "timbre.Fagot": "Bassoon",
    "timbre.Aleatorio": "Random",

    "summary.title": "Journey report",
    "summary.retry": "Retry route",
    "summary.menu": "Menu",

    "salon.title": "Hall of Routes",
    "salon.back": "Back",
    "salon.route": "Route",
    "salon.state": "Status",
    "salon.best": "Best",
    "salon.streak": "Streak",
    "salon.speed": "Speed",
    "salon.since": "Since",
    "salon.arrived": "Arrived",
    "salon.gala": "GALA",
    "salon.degreeStats": "Accuracy by degree",
    "salon.empty": "No degrees answered yet. The board fills itself.",
    "salon.wipe": "Erase progress",
    "salon.wipeConfirm": "Sure? Press again",

    "pause.title": "Paused",
    "pause.resume": "Resume",
    "pause.quit": "Abandon journey",

    "hud.points": "Points",
    "hud.streak": "Streak",
    "hud.speed": "Speed",
    "hud.whistle": "Whistle",
    "hud.repeat": "Repeat",
    "hud.listen": "Listen…",
    "hud.correct": "Correct. It was",
    "hud.wrong": "Detour. It was",
    "hud.timeout": "No answer. It was",
    "hud.noOrder": "The switch received no order.",
    "hud.whistleUsed": "Whistle: tonic chord.",
    "hud.repeated": "Note repeated.",
    "hud.cadence": "Establishing the tonal centre…",
    "hud.rolling": "Line clear.",
    "hud.detour": "SIDING.",

    "medal.gold": "Gold medal",
    "medal.silver": "Silver medal",
    "medal.bronze": "Bronze medal",
    "summary.gala": "GALA ARRIVAL!",
    "summary.points": "Points",
    "summary.detours": "Detours",
    "summary.accuracy": "Accuracy",
    "summary.bestStreak": "Best streak",
    "summary.whistlesLeft": "Unused whistles",

    "toast.wip": "Under construction — this part arrives in a later phase.",
    "toast.configSaved": "Settings ready.",

    "credit": "Developed by Luis Cardenas for Storm Studios Learning",
  },
};

export let lang: Lang = "es";

export function initI18n(): void {
  const p = new URLSearchParams(window.location.search).get("lang");
  lang = p === "en" ? "en" : "es";
  document.documentElement.lang = lang;
  // Aplica traducciones al HTML estático.
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
}

export function t(key: string): string {
  return dict[lang][key] ?? dict.es[key] ?? key;
}
