// i18n es/en (PLAN §10). Lee ?lang= al arrancar; default "es".
// Uso: initI18n() una vez; t("clave") en código; data-i18n="clave" en HTML estático.

export type Lang = "es" | "en";

const dict: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "EL COMETA",
    "app.tagline": "Toda órbita vuelve a casa.",
    "app.loading": "Abriendo la cúpula…",

    "menu.route": "Constelación (tonalidad)",
    "menu.timbre": "Timbre",
    "menu.speed": "Velocidad",
    "menu.degrees": "Grados a trabajar",
    "menu.min2": "Selecciona al menos 2 grados para que haya decisión que tomar.",
    "menu.active": "activos",
    "menu.activeOne": "activo",
    "menu.volume": "Volumen",
    "menu.planetarium": "Planetario",
    "menu.start": "INICIAR VIAJE",
    "menu.window": "ventana",
    "menu.noIVly": "En A#m el IV lidio no está disponible: su nota (E##) no existe en las muestras.",

    "preset.NATURAL": "Natural",
    "preset.ARMONICA": "Armónica",
    "preset.MELODICA": "Melódica",
    "preset.TODO": "Todo",

    "speed.SLOW": "Lento",
    "speed.NORMAL": "Normal",
    "speed.FAST": "Rápido",
    "speed.MASTER": "Maestro",

    "region.LUMBRE": "Nebulosa Lumbre",
    "region.ROCAS": "Cinturón de Rocas",
    "region.HIELO": "Anillos de Hielo",
    "region.FAROLES": "Cúmulo de Faroles",
    "region.VACIO": "El Vacío",

    "variante.RESCOLDO": "rescoldo",
    "variante.MAGENTA": "magenta",
    "variante.DORADA": "dorada",
    "variante.OCRE": "ocre",
    "variante.GRIS_AZUL": "gris azul",
    "variante.VIOLETA": "violeta",
    "variante.ZAFIRO": "zafiro",
    "variante.TURQUESA": "turquesa",
    "variante.PERLA": "perla",
    "variante.ORO_BLANCO": "oro blanco",
    "variante.AZUL_ELECTRICO": "azul eléctrico",
    "variante.AMBAR": "ámbar",
    "variante.NOCHE_ABSOLUTA": "noche absoluta",
    "variante.ALBA_GALACTICA": "alba galáctica",
    "variante.VIOLETA_PROFUNDO": "violeta profundo",

    "timbre.Piano": "Piano",
    "timbre.Cello": "Cello",
    "timbre.Corno": "Corno",
    "timbre.Coro": "Coro",
    "timbre.Fagot": "Fagot",
    "timbre.Aleatorio": "Aleatorio",

    "summary.title": "Bitácora de a bordo",
    "summary.retry": "Reintentar ruta",
    "summary.menu": "Menú",
    "summary.gala": "¡PERIHELIO DE GALA!",
    "summary.points": "Puntos",
    "summary.drifts": "Derivas",
    "summary.accuracy": "Precisión",
    "summary.bestStreak": "Mejor racha",
    "summary.beaconsLeft": "Radiofaros sin usar",

    "planetarium.title": "Planetario",
    "planetarium.back": "Volver",
    "planetarium.route": "Constelación",
    "planetarium.state": "Estado",
    "planetarium.best": "Mejor",
    "planetarium.streak": "Racha",
    "planetarium.speed": "Velocidad",
    "planetarium.since": "Desde",
    "planetarium.arrived": "Perihelio",
    "planetarium.gala": "GALA",
    "planetarium.degreeStats": "Precisión por grado",
    "planetarium.empty": "Aún no has respondido ningún grado. La cúpula se llena sola.",
    "planetarium.wipe": "Borrar progreso",
    "planetarium.wipeConfirm": "¿Seguro? Pulsa otra vez",

    "pause.title": "Pausa",
    "pause.resume": "Reanudar",
    "pause.quit": "Abandonar viaje",

    "hud.points": "Puntos",
    "hud.streak": "Racha",
    "hud.speed": "Velocidad",
    "hud.beacon": "Radiofaro",
    "hud.repeat": "Repetir",
    "hud.listen": "Escucha…",
    "hud.correct": "Correcto. Era",
    "hud.wrong": "Deriva. Era",
    "hud.timeout": "Sin respuesta. Era",
    "hud.noOrder": "El anillo no recibió rumbo.",
    "hud.beaconUsed": "Radiofaro: acorde de tónica.",
    "hud.repeated": "Nota repetida.",
    "hud.cadence": "Estableciendo el centro tonal…",
    "hud.rolling": "Órbita libre.",
    "hud.drift": "NEBULOSA.",
    "hud.mutableMix": "Confundiste las dos estrellas del par:",

    "medal.gold": "Medalla de oro",
    "medal.silver": "Medalla de plata",
    "medal.bronze": "Medalla de bronce",

    "toast.wip": "En construcción — esta parte llega en una fase posterior.",
    "toast.configSaved": "Configuración lista.",

    "credit": "Desarrollado por Luis Cardenas para Storm Studios Learning",
  },
  en: {
    "app.title": "THE COMET",
    "app.tagline": "Every orbit returns home.",
    "app.loading": "Opening the dome…",

    "menu.route": "Constellation (key)",
    "menu.timbre": "Timbre",
    "menu.speed": "Speed",
    "menu.degrees": "Degrees to train",
    "menu.min2": "Select at least 2 degrees so there is a decision to make.",
    "menu.active": "active",
    "menu.activeOne": "active",
    "menu.volume": "Volume",
    "menu.planetarium": "Planetarium",
    "menu.start": "START JOURNEY",
    "menu.window": "window",
    "menu.noIVly": "In A#m the Lydian IV is unavailable: its note (E##) is not in the samples.",

    "preset.NATURAL": "Natural",
    "preset.ARMONICA": "Harmonic",
    "preset.MELODICA": "Melodic",
    "preset.TODO": "All",

    "speed.SLOW": "Slow",
    "speed.NORMAL": "Normal",
    "speed.FAST": "Fast",
    "speed.MASTER": "Master",

    "region.LUMBRE": "Ember Nebula",
    "region.ROCAS": "Rock Belt",
    "region.HIELO": "Ice Rings",
    "region.FAROLES": "Lantern Cluster",
    "region.VACIO": "The Void",

    "variante.RESCOLDO": "ember",
    "variante.MAGENTA": "magenta",
    "variante.DORADA": "golden",
    "variante.OCRE": "ochre",
    "variante.GRIS_AZUL": "blue grey",
    "variante.VIOLETA": "violet",
    "variante.ZAFIRO": "sapphire",
    "variante.TURQUESA": "turquoise",
    "variante.PERLA": "pearl",
    "variante.ORO_BLANCO": "white gold",
    "variante.AZUL_ELECTRICO": "electric blue",
    "variante.AMBAR": "amber",
    "variante.NOCHE_ABSOLUTA": "absolute night",
    "variante.ALBA_GALACTICA": "galactic dawn",
    "variante.VIOLETA_PROFUNDO": "deep violet",

    "timbre.Piano": "Piano",
    "timbre.Cello": "Cello",
    "timbre.Corno": "Horn",
    "timbre.Coro": "Choir",
    "timbre.Fagot": "Bassoon",
    "timbre.Aleatorio": "Random",

    "summary.title": "Ship's log",
    "summary.retry": "Retry route",
    "summary.menu": "Menu",
    "summary.gala": "GALA PERIHELION!",
    "summary.points": "Points",
    "summary.drifts": "Drifts",
    "summary.accuracy": "Accuracy",
    "summary.bestStreak": "Best streak",
    "summary.beaconsLeft": "Unused beacons",

    "planetarium.title": "Planetarium",
    "planetarium.back": "Back",
    "planetarium.route": "Constellation",
    "planetarium.state": "Status",
    "planetarium.best": "Best",
    "planetarium.streak": "Streak",
    "planetarium.speed": "Speed",
    "planetarium.since": "Since",
    "planetarium.arrived": "Perihelion",
    "planetarium.gala": "GALA",
    "planetarium.degreeStats": "Accuracy by degree",
    "planetarium.empty": "No degrees answered yet. The dome fills itself.",
    "planetarium.wipe": "Erase progress",
    "planetarium.wipeConfirm": "Sure? Press again",

    "pause.title": "Paused",
    "pause.resume": "Resume",
    "pause.quit": "Abandon journey",

    "hud.points": "Points",
    "hud.streak": "Streak",
    "hud.speed": "Speed",
    "hud.beacon": "Beacon",
    "hud.repeat": "Repeat",
    "hud.listen": "Listen…",
    "hud.correct": "Correct. It was",
    "hud.wrong": "Drift. It was",
    "hud.timeout": "No answer. It was",
    "hud.noOrder": "The ring received no heading.",
    "hud.beaconUsed": "Beacon: tonic chord.",
    "hud.repeated": "Note repeated.",
    "hud.cadence": "Establishing the tonal centre…",
    "hud.rolling": "Orbit clear.",
    "hud.drift": "NEBULA.",
    "hud.mutableMix": "You mixed up the two stars of the pair:",

    "medal.gold": "Gold medal",
    "medal.silver": "Silver medal",
    "medal.bronze": "Bronze medal",

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
