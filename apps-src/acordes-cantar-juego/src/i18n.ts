// i18n es/en (PLAN §10). Lee ?lang= al arrancar; default "es".
// Uso: initI18n() una vez; t("clave") en código; data-i18n="clave" en HTML estático.

export type Lang = "es" | "en";

const dict: Record<Lang, Record<string, string>> = {
  es: {
    "app.title": "AEROSTATO",
    "app.tagline": "Asciende. Canta. Ilumina.",
    "app.loading": "Preparando ascenso…",

    "menu.mode": "Modo de ascenso",
    "mode.EXPEDITION": "Expedición",
    "mode.EXPEDITION.desc":
      "Asciende las 5 capas a tu ritmo. Sin muerte: solo el viento puede llevarse una cuerda.",
    "mode.TIME_ATTACK": "Contrarreloj",
    "mode.TIME_ATTACK.desc":
      "Gas limitado del quemador. Cada linterna suma +6 s y cada cuerda completa +15 s. ¿A qué altitud llegas?",
    "mode.SURVIVAL": "Supervivencia",
    "mode.SURVIVAL.desc":
      "Cada cuerda perdida rasga la tela del globo. Tres rasgaduras y descenso de emergencia.",

    "menu.register": "Registro vocal",
    "register.male": "Varón (F2–G4)",
    "register.female": "Dama (G3–A5)",

    "menu.instrument": "Timbre",
    "timbre.Piano": "Piano",
    "timbre.Coro": "Coro",
    "timbre.Corno": "Corno",
    "timbre.Cello": "Cello",
    "timbre.Fagot": "Fagot",
    "timbre.Aleatorio": "Aleatorio",

    "menu.reference": "Nota de referencia",
    "ref.root": "Fundamental",
    "ref.any": "Cualquier nota del acorde",
    "menu.showNames": "Mostrar nombres de nota",

    "menu.startLayer": "Capa inicial",
    "menu.locked": "Bloqueada",
    "menu.volume": "Volumen",
    "menu.atlas": "Atlas",
    "menu.start": "INICIAR ASCENSO",
    "menu.privacy": "Audio 100 % local · nada se graba ni se transmite",
    "credit": "Desarrollado por Luis Cardenas para Storm Studios Learning",

    "layer.1.name": "El Valle",
    "layer.2.name": "Mar de Nubes",
    "layer.3.name": "Cielo Abierto",
    "layer.4.name": "Cielo de Auroras",
    "layer.5.name": "Borde del Espacio",

    "micdenied.title": "Micrófono sin permiso",
    "micdenied.body":
      "Aerostato necesita escuchar tu voz para elevarte. Permite el micrófono en el candado de la barra del navegador y vuelve a intentarlo.",
    "micdenied.back": "Volver al menú",

    "pause.title": "Pausa",
    "pause.resume": "Reanudar",
    "pause.quit": "Abandonar ascenso",

    "hud.quota": "Cuota de capa",
    "hud.gas": "Gas",
    "hud.fabric": "Tela",
    "feedback.lockOpen": "¡Esclusa abierta! Puedes ascender",
    "feedback.approach": "Acércate {meters} m para amarrar",

    "summary.title": "Informe de ascenso",
    "summary.top": "¡Techo del mundo alcanzado: 41 000 m!",
    "summary.gasOut": "Gas agotado — descenso",
    "summary.fabricOut": "Tela rasgada — descenso de emergencia",
    "summary.score": "Puntuación",
    "summary.strings": "Cuerdas completadas",
    "summary.bestStreak": "Mejor racha",
    "summary.maxAlt": "Altitud máxima",
    "summary.avgCents": "Precisión media",
    "summary.retry": "Reintentar",
    "summary.menu": "Menú",

    "atlas.title": "Atlas del Aeronauta",
    "atlas.progress": "catalogadas",
    "atlas.back": "Volver",
    "atlas.attempts": "Intentos",
    "atlas.completed": "Completadas",
    "atlas.bestStreak": "Mejor racha",
    "summary.medals": "Medallas nuevas",

    "hud.score": "Puntos",
    "hud.streak": "Racha",
    "hud.reference": "Referencia",

    "tuner.listening": "Escuchando…",
    "harness.title": "Afinador — arnés QA (A3 · 220 Hz)",
    "harness.back": "Volver",

    "toast.wip": "El ascenso 3D llega en la siguiente fase",
  },
  en: {
    "app.title": "AEROSTAT",
    "app.tagline": "Ascend. Sing. Illuminate.",
    "app.loading": "Preparing ascent…",

    "menu.mode": "Ascent mode",
    "mode.EXPEDITION": "Expedition",
    "mode.EXPEDITION.desc":
      "Ascend the 5 layers at your own pace. No death: only the wind can take a string away.",
    "mode.TIME_ATTACK": "Time Attack",
    "mode.TIME_ATTACK.desc":
      "Limited burner gas. Each lantern adds +6 s and each completed string +15 s. How high can you get?",
    "mode.SURVIVAL": "Survival",
    "mode.SURVIVAL.desc":
      "Every lost string tears the balloon fabric. Three tears and it's an emergency descent.",

    "menu.register": "Vocal register",
    "register.male": "Male (F2–G4)",
    "register.female": "Female (G3–A5)",

    "menu.instrument": "Timbre",
    "timbre.Piano": "Piano",
    "timbre.Coro": "Choir",
    "timbre.Corno": "Horn",
    "timbre.Cello": "Cello",
    "timbre.Fagot": "Bassoon",
    "timbre.Aleatorio": "Random",

    "menu.reference": "Reference note",
    "ref.root": "Root",
    "ref.any": "Any chord note",
    "menu.showNames": "Show note names",

    "menu.startLayer": "Starting layer",
    "menu.locked": "Locked",
    "menu.volume": "Volume",
    "menu.atlas": "Atlas",
    "menu.start": "BEGIN ASCENT",
    "menu.privacy": "Audio is 100% local · nothing is recorded or transmitted",
    "credit": "Developed by Luis Cardenas for Storm Studios Learning",

    "layer.1.name": "The Valley",
    "layer.2.name": "Sea of Clouds",
    "layer.3.name": "Open Sky",
    "layer.4.name": "Aurora Sky",
    "layer.5.name": "Edge of Space",

    "micdenied.title": "Microphone permission denied",
    "micdenied.body":
      "Aerostat needs to hear your voice to lift you. Allow the microphone from the lock icon in the browser bar and try again.",
    "micdenied.back": "Back to menu",

    "pause.title": "Paused",
    "pause.resume": "Resume",
    "pause.quit": "Abandon ascent",

    "hud.quota": "Layer quota",
    "hud.gas": "Gas",
    "hud.fabric": "Fabric",
    "feedback.lockOpen": "Wind lock open! You may ascend",
    "feedback.approach": "Move {meters} m closer to moor",

    "summary.title": "Ascent report",
    "summary.top": "World ceiling reached: 41,000 m!",
    "summary.gasOut": "Out of gas — descending",
    "summary.fabricOut": "Fabric torn — emergency descent",
    "summary.score": "Score",
    "summary.strings": "Strings completed",
    "summary.bestStreak": "Best streak",
    "summary.maxAlt": "Maximum altitude",
    "summary.avgCents": "Average precision",
    "summary.retry": "Retry",
    "summary.menu": "Menu",

    "atlas.title": "Aeronaut's Atlas",
    "atlas.progress": "catalogued",
    "atlas.back": "Back",
    "atlas.attempts": "Attempts",
    "atlas.completed": "Completed",
    "atlas.bestStreak": "Best streak",
    "summary.medals": "New medals",

    "hud.score": "Score",
    "hud.streak": "Streak",
    "hud.reference": "Reference",

    "tuner.listening": "Listening…",
    "harness.title": "Tuner — QA harness (A3 · 220 Hz)",
    "harness.back": "Back",

    "toast.wip": "The 3D ascent arrives in the next phase",
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
