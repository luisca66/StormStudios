// i18n es/en (PLAN §10). Lee ?lang= al arrancar; default "es".
// Uso: initI18n() una vez; t("clave") en código; data-i18n="clave" en HTML estático.

export type Lang = "es" | "en";

const dict: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "BATISFERA",
    "app.subtitle": "Desciende. Escucha. Cataloga.",
    "app.loading": "Preparando inmersión…",

    "menu.mode": "Modo de inmersión",
    "mode.EXPEDITION": "Expedición",
    "mode.EXPEDITION.desc": "Desciende las 5 zonas a tu ritmo. Sin muerte: los errores solo espantan a la criatura.",
    "mode.TIME_ATTACK": "Contrarreloj",
    "mode.TIME_ATTACK.desc": "Oxígeno limitado. Cada captura suma +8 s. ¿A qué profundidad llegas?",
    "mode.SURVIVAL": "Supervivencia",
    "mode.SURVIVAL.desc": "Cada error agrieta el cristal. Tres grietas y ascenso de emergencia.",

    "menu.instrument": "Timbre",
    "timbre.Piano": "Piano",
    "timbre.Coro": "Coro",
    "timbre.Corno": "Corno",
    "timbre.Cello": "Cello",
    "timbre.Fagot": "Fagot",
    "timbre.Aleatorio": "Aleatorio",

    "menu.volume": "Volumen",
    "menu.startZone": "Zona inicial",
    "menu.locked": "Bloqueada",
    "menu.bitacora": "Bitácora",
    "menu.start": "INICIAR INMERSIÓN",
    "credit": "Desarrollado por Luis Cardenas para Storm Studios Learning",

    "zone.1.name": "Zona Soleada",
    "zone.2.name": "Zona Crepuscular",
    "zone.3.name": "Zona de Medianoche",
    "zone.4.name": "Zona Abisal",
    "zone.5.name": "Fosa Hadal",

    "hud.depth": "Profundidad",
    "hud.score": "Puntos",
    "hud.streak": "Racha",
    "hud.oxygen": "O₂",
    "hud.hull": "Casco",
    "hud.relisten": "Re-escuchar",
    "hud.abort": "Abortar misión",
    "hud.answer": "¿Qué acorde canta?",
    "hud.family": "Familia detectada",
    "hud.quota": "Capturas de zona",

    "feedback.correct": "¡Capturada!",
    "feedback.wrong": "Huyó…",
    "feedback.was": "Era:",
    "feedback.zoneOpen": "Termoclina abierta: puedes descender",

    "pause.title": "Pausa",
    "pause.resume": "Reanudar",
    "pause.quit": "Abandonar inmersión",

    "summary.title": "Informe de inmersión",
    "summary.score": "Puntuación",
    "summary.captures": "Capturas",
    "summary.accuracy": "Precisión",
    "summary.bestStreak": "Mejor racha",
    "summary.maxDepth": "Profundidad máxima",
    "summary.newEntries": "Nuevas entradas en bitácora",
    "summary.retry": "Reintentar",
    "summary.menu": "Menú",
    "summary.complete": "¡Fondo de la fosa alcanzado!",
    "summary.o2out": "Oxígeno agotado — ascenso",
    "summary.hullout": "Casco comprometido — ascenso de emergencia",

    "bitacora.title": "Bitácora del biólogo",
    "bitacora.captured": "Capturado",
    "bitacora.seen": "Avistado",
    "bitacora.unseen": "No visto",
    "bitacora.back": "Volver",
    "bitacora.progress": "catalogados",
    "bitacora.attempts": "Intentos",
    "bitacora.accuracy": "Acierto",

    "toast.wip": "El descenso 3D llega en la siguiente fase",
  },
  en: {
    "app.title": "BATHYSPHERE",
    "app.subtitle": "Descend. Listen. Catalogue.",
    "app.loading": "Preparing the dive…",

    "menu.mode": "Dive mode",
    "mode.EXPEDITION": "Expedition",
    "mode.EXPEDITION.desc": "Descend the 5 zones at your own pace. No death: mistakes only scare the creature away.",
    "mode.TIME_ATTACK": "Time Attack",
    "mode.TIME_ATTACK.desc": "Limited oxygen. Each capture adds +8 s. How deep can you go?",
    "mode.SURVIVAL": "Survival",
    "mode.SURVIVAL.desc": "Every mistake cracks the glass. Three cracks and it's an emergency ascent.",

    "menu.instrument": "Timbre",
    "timbre.Piano": "Piano",
    "timbre.Coro": "Choir",
    "timbre.Corno": "Horn",
    "timbre.Cello": "Cello",
    "timbre.Fagot": "Bassoon",
    "timbre.Aleatorio": "Random",

    "menu.volume": "Volume",
    "menu.startZone": "Starting zone",
    "menu.locked": "Locked",
    "menu.bitacora": "Field journal",
    "menu.start": "START THE DIVE",
    "credit": "Developed by Luis Cardenas for Storm Studios Learning",

    "zone.1.name": "Sunlit Zone",
    "zone.2.name": "Twilight Zone",
    "zone.3.name": "Midnight Zone",
    "zone.4.name": "Abyssal Zone",
    "zone.5.name": "Hadal Trench",

    "hud.depth": "Depth",
    "hud.score": "Score",
    "hud.streak": "Streak",
    "hud.oxygen": "O₂",
    "hud.hull": "Hull",
    "hud.relisten": "Replay",
    "hud.abort": "Abort mission",
    "hud.answer": "Which chord is it singing?",
    "hud.family": "Family detected",
    "hud.quota": "Zone captures",

    "feedback.correct": "Captured!",
    "feedback.wrong": "It fled…",
    "feedback.was": "It was:",
    "feedback.zoneOpen": "Thermocline open: you may descend",

    "pause.title": "Paused",
    "pause.resume": "Resume",
    "pause.quit": "Abandon dive",

    "summary.title": "Dive report",
    "summary.score": "Score",
    "summary.captures": "Captures",
    "summary.accuracy": "Accuracy",
    "summary.bestStreak": "Best streak",
    "summary.maxDepth": "Maximum depth",
    "summary.newEntries": "New journal entries",
    "summary.retry": "Retry",
    "summary.menu": "Menu",
    "summary.complete": "Trench floor reached!",
    "summary.o2out": "Oxygen depleted — ascending",
    "summary.hullout": "Hull compromised — emergency ascent",

    "bitacora.title": "Biologist's field journal",
    "bitacora.captured": "Captured",
    "bitacora.seen": "Sighted",
    "bitacora.unseen": "Not seen",
    "bitacora.back": "Back",
    "bitacora.progress": "catalogued",
    "bitacora.attempts": "Attempts",
    "bitacora.accuracy": "Accuracy",

    "toast.wip": "The 3D descent arrives in the next phase",
  },
};

let current: Lang = "es";

export function initI18n(): Lang {
  const param = new URLSearchParams(window.location.search).get("lang");
  current = param === "en" ? "en" : "es";
  document.documentElement.lang = current;
  applyI18n();
  return current;
}

export function getLang(): Lang {
  return current;
}

export function t(key: string): string {
  return dict[current][key] ?? dict.es[key] ?? key;
}

// Rellena todos los [data-i18n] del árbol dado (por defecto, el documento entero).
export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
}
