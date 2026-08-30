// main.ts — Bootstrap F0: idioma, menú-observatorio funcional (constelación, timbre,
// velocidad, grados con presets, volumen) y navegación de pantallas.
// El juego 3D llega en F2+; los ajustes se persisten en F9.
import "./style.css";
import { initI18n, t, lang } from "./i18n";
import {
  SCALES, DIATONIC_DEGREES, TIMBRES, DEGREE_GLOSSARY,
  DEGREE_SHORT_SUFFIX, ALL_DEGREES_OPTIONS, mutablePartner,
  type Degree, type Timbre,
} from "./music/degrees";
import {
  SPEEDS, answerWindowSeconds, routeForScale, REGION_SWATCH, CONSTELLATIONS,
  type SpeedId,
} from "./config";
import { JourneyRenderer } from "./3d/renderer";

// ---------------------------------------------------------------------------
// Estado de configuración del menú (persistencia real en F9)
// ---------------------------------------------------------------------------
interface Settings {
  scale: string;
  timbre: Timbre;
  speed: SpeedId;
  degrees: Set<Degree>;
  volume: number; // 0–100
}

const MIN_DEGREES = 2; // PLAN §3.6: con 1 no hay decisión que tomar

/**
 * Presets = la taxonomía real del modo menor (PLAN §7.9). No son "niveles": son las
 * tres formas de la escala menor más el conjunto completo.
 */
type PresetId = "NATURAL" | "ARMONICA" | "MELODICA" | "TODO";

const PRESETS: Record<PresetId, Degree[]> = {
  NATURAL: [...DIATONIC_DEGREES],                            // la eólica pura
  ARMONICA: [...DIATONIC_DEGREES, "VIIsen"],                 // aparece la sensible
  MELODICA: [...DIATONIC_DEGREES, "VImel", "VIIsen"],        // + el sexto elevado
  TODO: [...ALL_DEGREES_OPTIONS],                            // + IIfr (♭2) y IVly (#4)
};

const PRESET_ORDER: PresetId[] = ["NATURAL", "ARMONICA", "MELODICA", "TODO"];

const settings: Settings = {
  scale: "Am",
  timbre: "Piano",
  speed: "NORMAL",
  degrees: new Set<Degree>(PRESETS.NATURAL),
  volume: 80,
};

/**
 * PLAN §3.2 — trampa heredada de la webapp seria: en A#m el IV lidio se escribe E##,
 * que no existe en el inventario de muestras ni en los fallbacks enharmónicos. El
 * selector simplemente nunca lo sortea, así que aquí no cuenta como grado activo.
 */
const SCALE_WITHOUT_IVLY = "A#m";

function degreeUnavailable(scale: string, degree: Degree): boolean {
  return scale === SCALE_WITHOUT_IVLY && degree === "IVly";
}

/** Grados que de verdad pueden sonar con la tonalidad elegida. */
function playableDegrees(): Degree[] {
  return [...settings.degrees].filter((d) => !degreeUnavailable(settings.scale, d));
}

// ---------------------------------------------------------------------------
// Utilidades DOM
// ---------------------------------------------------------------------------
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento no encontrado: #${id}`);
  return el;
}

function chip(label: string, opts?: { swatch?: string; title?: string; suffix?: string }): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "chip";
  if (opts?.swatch) {
    const s = document.createElement("span");
    s.className = "swatch";
    s.style.background = opts.swatch;
    b.appendChild(s);
  }
  b.appendChild(document.createTextNode(label));
  if (opts?.suffix) {
    const sfx = document.createElement("span");
    sfx.className = "suffix";
    sfx.textContent = opts.suffix;
    b.appendChild(sfx);
  }
  if (opts?.title) b.title = opts.title;
  return b;
}

let toastTimer = 0;

function toast(message: string): void {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2600);
}

function showScreen(id: string): void {
  for (const el of document.querySelectorAll<HTMLElement>(".screen")) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }
  $(id).classList.remove("hidden");
  $(id).classList.add("active");
}

/** Ninguna pantalla activa: el drag llega al canvas para mirar desde la carlinga. */
function hideAllScreens(): void {
  for (const el of document.querySelectorAll<HTMLElement>(".screen")) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }
}

// ---------------------------------------------------------------------------
// El viaje (F2: se vuela, todavía sin preguntas — el loop de juego llega en F6)
// ---------------------------------------------------------------------------
let journey: JourneyRenderer | null = null;

function startJourney(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  if (!journey) journey = new JourneyRenderer(canvas);
  const speed = SPEEDS.find((s) => s.id === settings.speed)!;
  journey.start({ scale: settings.scale, speed, volume: settings.volume });
  hideAllScreens();
}

function abandonJourney(): void {
  journey?.stop();
  showScreen("menu-screen");
}

function togglePause(): void {
  if (!journey) return;
  const paused = !journey.isPaused();
  journey.setPaused(paused);
  if (paused) showScreen("pause-screen");
  else hideAllScreens();
}

// ---------------------------------------------------------------------------
// Render del menú
// ---------------------------------------------------------------------------

/** Constelaciones: el telescopio apunta a una tonalidad (PLAN §5.8, §10). */
function renderRoutes(): void {
  const row = $("route-options");
  row.replaceChildren();
  for (const scale of SCALES) {
    const route = routeForScale(scale);
    const constellation = CONSTELLATIONS[route.constellation];
    const b = chip(scale, {
      swatch: REGION_SWATCH[route.region],
      title: `${constellation[lang]} · ${t(`region.${route.region}`)} · ${t(`variante.${route.variante}`)}`,
    });
    if (scale === settings.scale) b.classList.add("selected");
    b.addEventListener("click", () => {
      settings.scale = scale;
      renderRoutes();
      renderDegrees(); // la disponibilidad de IVly depende de la tonalidad
      updateStartState();
    });
    row.appendChild(b);
  }

  const route = routeForScale(settings.scale);
  const constellation = CONSTELLATIONS[route.constellation];
  $("route-desc").textContent =
    `${constellation[lang]} — ${t(`region.${route.region}`)} · ${t(`variante.${route.variante}`)}`;
}

function renderTimbres(): void {
  const row = $("timbre-options");
  row.replaceChildren();
  for (const timbre of TIMBRES) {
    const b = chip(t(`timbre.${timbre}`));
    if (timbre === settings.timbre) b.classList.add("selected");
    b.addEventListener("click", () => {
      settings.timbre = timbre;
      renderTimbres();
    });
    row.appendChild(b);
  }
}

function renderSpeeds(): void {
  const row = $("speed-options");
  row.replaceChildren();
  for (const speed of SPEEDS) {
    const b = chip(t(`speed.${speed.id}`));
    if (speed.id === settings.speed) b.classList.add("selected");
    b.addEventListener("click", () => {
      settings.speed = speed.id;
      renderSpeeds();
    });
    row.appendChild(b);
  }

  const current = SPEEDS.find((s) => s.id === settings.speed)!;
  const window_ = answerWindowSeconds(current).toFixed(1);
  $("speed-desc").textContent =
    `${t("menu.window")}: ${window_} s · ×${current.scoreMultiplier.toFixed(2)}`;
}

/** ¿Los grados activos coinciden exactamente con un preset? (para marcarlo) */
function matchingPreset(): PresetId | null {
  for (const id of PRESET_ORDER) {
    const preset = PRESETS[id];
    if (preset.length !== settings.degrees.size) continue;
    if (preset.every((d) => settings.degrees.has(d))) return id;
  }
  return null;
}

function renderPresets(): void {
  const row = $("preset-options");
  row.replaceChildren();
  const active = matchingPreset();
  for (const id of PRESET_ORDER) {
    const b = document.createElement("button");
    b.className = "btn tiny";
    b.textContent = t(`preset.${id}`);
    if (id === active) b.classList.add("selected");
    b.addEventListener("click", () => {
      settings.degrees = new Set(PRESETS[id]);
      renderDegrees();
      updateStartState();
    });
    row.appendChild(b);
  }
}

/**
 * Los 11 grados en orden canónico INTERCALADO (PLAN §3.1). Los pares mutables
 * (VI/VImel y VIIST/VIIsen) se dibujan hermanados como estrellas binarias (§5.7).
 */
function renderDegrees(): void {
  renderPresets();

  const row = $("degree-options");
  row.replaceChildren();

  const degreeChip = (degree: Degree): HTMLButtonElement => {
    const gloss = DEGREE_GLOSSARY[degree][lang];
    const unavailable = degreeUnavailable(settings.scale, degree);
    const b = chip(degree, {
      suffix: DEGREE_SHORT_SUFFIX[degree],
      title: unavailable ? `${gloss} — ${t("menu.noIVly")}` : gloss,
    });
    if (settings.degrees.has(degree)) b.classList.add("selected");
    if (unavailable) b.disabled = true;
    b.addEventListener("click", () => {
      if (settings.degrees.has(degree)) settings.degrees.delete(degree);
      else settings.degrees.add(degree);
      renderDegrees();
      updateStartState();
    });
    return b;
  };

  // Recorrido en orden canónico: los dos miembros de un par mutable son contiguos, así
  // que al encontrar el primero se emiten los dos dentro de su arito y se salta el
  // segundo.
  const emitted = new Set<Degree>();
  for (const degree of ALL_DEGREES_OPTIONS) {
    if (emitted.has(degree)) continue;
    const partner = mutablePartner(degree);
    if (partner) {
      const group = document.createElement("div");
      group.className = "pair-group";
      group.title = `${DEGREE_GLOSSARY[degree][lang]} · ${DEGREE_GLOSSARY[partner][lang]}`;
      group.append(degreeChip(degree), degreeChip(partner));
      row.appendChild(group);
      emitted.add(degree);
      emitted.add(partner);
    } else {
      row.appendChild(degreeChip(degree));
      emitted.add(degree);
    }
  }

  const active = playableDegrees().length;
  $("degrees-count").textContent = `${active} ${t(active === 1 ? "menu.activeOne" : "menu.active")}`;

  // Aviso de la trampa A#m/IVly (PLAN §3.2): solo cuando afecta de verdad.
  const note = $("degrees-note");
  const affected = settings.scale === SCALE_WITHOUT_IVLY && settings.degrees.has("IVly");
  note.textContent = affected ? t("menu.noIVly") : "";
  note.classList.toggle("hidden", !affected);
}

function updateStartState(): void {
  const enough = playableDegrees().length >= MIN_DEGREES;
  ($("start-btn") as HTMLButtonElement).disabled = !enough;
  $("degrees-warning").classList.toggle("hidden", enough);
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
function boot(): void {
  initI18n();

  renderRoutes();
  renderTimbres();
  renderSpeeds();
  renderDegrees();
  updateStartState();

  const volume = $("volume-slider") as HTMLInputElement;
  volume.value = String(settings.volume);
  volume.addEventListener("input", () => {
    settings.volume = Number(volume.value);
    journey?.setVolume(settings.volume);
  });

  // INICIAR VIAJE ya vuela (F2). El loop de preguntas llega en F6.
  $("start-btn").addEventListener("click", () => startJourney());
  $("planetarium-btn").addEventListener("click", () => toast(t("toast.wip")));

  // Navegación de las pantallas que ya existen como esqueleto.
  $("planetarium-back").addEventListener("click", () => showScreen("menu-screen"));
  $("summary-menu").addEventListener("click", () => showScreen("menu-screen"));
  $("pause-resume").addEventListener("click", () => togglePause());
  $("pause-quit").addEventListener("click", () => abandonJourney());

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && journey) togglePause();
  });

  // Arnés de QA (F1+): import dinámico para que no pese en el bundle de producción.
  if (new URLSearchParams(window.location.search).get("dev") === "1") {
    void import("./dev/harness").then((m) => m.mountDevHarness());
    // El viaje se expone para poder auditarlo desde consola (stats, slingshot…).
    (window as unknown as Record<string, unknown>).CometaJourney = () => journey;
  }
}

boot();
