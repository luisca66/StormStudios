// main.ts — Bootstrap: idioma, menú-observatorio, arranque del viaje y consola.
// Los ajustes se persisten en F9.
import "./style.css";
import { initI18n, t, lang } from "./i18n";
import {
  SCALES, DIATONIC_DEGREES, TIMBRES, DEGREE_GLOSSARY,
  DEGREE_SHORT_SUFFIX, ALL_DEGREES_OPTIONS, mutablePartner,
  type Degree, type Timbre,
} from "./music/degrees";
import {
  SPEEDS, answerWindowSeconds, routeForScale, REGION_SWATCH, CONSTELLATIONS,
  DECISIONS_TO_ARRIVE, type SpeedId,
} from "./config";
import { JourneyRenderer } from "./3d/renderer";
import { Hud, type HudState, type LeverMark } from "./ui/hud";
import { Planetarium } from "./ui/planetarium";
import {
  loadSettings, saveSettings, recordAnswer, recordArrival,
} from "./game/persistence";
import {
  GameStateManager, type ArrivalInfo, type GameSnapshot, type JourneyPorts,
  type ResolutionInfo,
} from "./game/state";
import { SamplePlayer } from "./audio/samples";
import {
  triadFiles, minorChordFileName, pitchClassOfDegree, scaleWalkFiles, writtenMidi,
  type Scale,
} from "./music/degrees";
import { supportTimbreDir, type QuestionSample } from "./music/selector";
import {
  CADENCE_CHORD_GAP_S, MUTABLE_COMPARISON_ENABLED, DRIFT_REVEAL_NOTE,
} from "./config";

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

/** Vuelca los ajustes del menú a localStorage (§7.7). */
function persistSettings(): void {
  saveSettings({
    escala: settings.scale,
    timbre: settings.timbre,
    velocidad: settings.speed,
    gradosSeleccionados: [...settings.degrees],
    volumen: settings.volume,
  });
}

/**
 * Restaura los ajustes guardados. Se valida TODO contra las listas vivas: si un día
 * cambian los grados o las tonalidades, un localStorage viejo no debe romper el arranque.
 */
function restoreSettings(): void {
  const stored = loadSettings();
  if (!stored) return;
  if ((SCALES as readonly string[]).includes(stored.escala)) settings.scale = stored.escala;
  if ((TIMBRES as readonly string[]).includes(stored.timbre)) settings.timbre = stored.timbre as Timbre;
  if (SPEEDS.some((s) => s.id === stored.velocidad)) settings.speed = stored.velocidad as SpeedId;
  if (typeof stored.volumen === "number") {
    settings.volume = Math.max(0, Math.min(100, stored.volumen));
  }
  const degrees = stored.gradosSeleccionados
    .filter((d): d is Degree => (ALL_DEGREES_OPTIONS as readonly string[]).includes(d));
  if (degrees.length >= MIN_DEGREES) settings.degrees = new Set(degrees);
}

function openPlanetarium(): void {
  if (!planetarium) {
    planetarium = new Planetarium($("planetarium-board"), $("planetarium-degrees"));
  }
  planetarium.render();
  showScreen("planetarium-screen");
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

/**
 * Las pantallas MODALES: menú, pausa, resumen, planetario.
 *
 * ⚠️ `#hud` también lleva la clase `.screen`, pero NO es una pantalla: es la consola que
 * convive con el mundo. Su visibilidad la gobiernan solo `hud.show()` y `hud.hide()`.
 * Meterla en este barrido dejaba al jugador SIN CONTROLES: `startJourney` mostraba la
 * consola y acto seguido `hideAllScreens()` se la llevaba por delante.
 */
function modalScreens(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(".screen")]
    .filter((el) => el.id !== "hud");
}

function showScreen(id: string): void {
  for (const el of modalScreens()) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }
  $(id).classList.remove("hidden");
  $(id).classList.add("active");
}

/** Ninguna pantalla modal: el drag llega al canvas para mirar desde la carlinga. */
function hideAllScreens(): void {
  for (const el of modalScreens()) {
    el.classList.add("hidden");
    el.classList.remove("active");
  }
}

// ---------------------------------------------------------------------------
// El viaje (F2: se vuela, todavía sin preguntas — el loop de juego llega en F6)
// ---------------------------------------------------------------------------
let journey: JourneyRenderer | null = null;
let hud: Hud | null = null;
let planetarium: Planetarium | null = null;
let game: GameStateManager | null = null;
const samples = new SamplePlayer();
/** Última pregunta sonada: el timbre Aleatorio infiere de ella su carpeta de apoyo. */
let lastQuestion: QuestionSample | null = null;

/** Carpeta de timbre para los sonidos de apoyo (§3.3: Aleatorio infiere de la pregunta). */
function supportDir(): string {
  return supportTimbreDir(settings.timbre, lastQuestion);
}

/**
 * Cadencia de salida i–iv–V–i (§3.5): establece el centro tonal MENOR antes de volar.
 * El iv y el V se APILAN desde notas sueltas porque el bucket no tiene esos acordes; el
 * i final es el sample `Minor Chords`, el mismo sonido que el radiofaro — así el jugador
 * aprende de entrada qué le va a recordar la transmisión.
 */
async function playDepartureCadence(scale: Scale, dir: string): Promise<void> {
  const gap = CADENCE_CHORD_GAP_S * 1000;
  const wait = () => new Promise((r) => window.setTimeout(r, gap));
  for (const triad of ["i", "iv", "V"] as const) {
    await samples.playTriad(triadFiles(scale, triad, dir), 0.9);
    await wait();
  }
  await samples.playTonicChord(dir, minorChordFileName(scale), 0.85);
  await wait();
}

function startJourney(): void {
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  if (!journey) journey = new JourneyRenderer(canvas);
  if (!hud) {
    hud = new Hud($("hud"), {
      onDegree: (degree) => game?.answer(degree),
      onBeacon: () => { if (game?.useBeacon()) journey?.pullBeacon(); },
      onRepeat: () => game?.repeatNote(),
    });
  }
  if (!game) game = new GameStateManager(makePorts());

  const speed = SPEEDS.find((s) => s.id === settings.speed)!;
  const route = routeForScale(settings.scale);
  const scale = settings.scale as Scale;

  // El gesto de INICIAR VIAJE es lo que desbloquea el audio del navegador.
  samples.unlock();
  samples.setVolume(settings.volume / 100);
  lastQuestion = null;

  persistSettings();
  journey.start({ scale: settings.scale, speed, volume: settings.volume });
  hud.setDegrees(playableDegrees());
  hud.setConstellation(route.constellation, DECISIONS_TO_ARRIVE);
  hud.show();

  game.start({
    scale,
    degrees: new Set(playableDegrees()),
    timbre: settings.timbre,
    speed,
  });
  journey.onTick = (dt, distance) => game?.tick(dt, distance);
  hideAllScreens();
  hud.show();

  // La cúpula se abre, suena la cadencia y SOLO ENTONCES se suelta el cometa (§7.1).
  void playDepartureCadence(scale, supportDir()).then(() => game?.beginRolling());
}

function abandonJourney(): void {
  journey?.stop();
  if (journey) journey.onTick = null;
  game?.stop();
  hud?.hide();
  samples.stopAll();
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
  restoreSettings();

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
  $("planetarium-btn").addEventListener("click", () => openPlanetarium());

  // Navegación de las pantallas que ya existen como esqueleto.
  $("planetarium-back").addEventListener("click", () => showScreen("menu-screen"));
  $("summary-planetarium").addEventListener("click", () => openPlanetarium());
  $("summary-menu").addEventListener("click", () => abandonJourney());
  $("summary-retry").addEventListener("click", () => startJourney());
  $("pause-resume").addEventListener("click", () => togglePause());
  $("pause-quit").addEventListener("click", () => abandonJourney());

  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !journey) return;
    // Durante la ceremonia, Esc SALTA (tras 5 s) en vez de pausar (§12).
    if (journey.isArriving()) {
      if (performance.now() >= arrivalSkippableAt) journey.skipArrival();
      return;
    }
    togglePause();
  });

  // Arnés de QA (F1+): import dinámico para que no pese en el bundle de producción.
  if (new URLSearchParams(window.location.search).get("dev") === "1") {
    void import("./dev/harness").then((m) => m.mountDevHarness());
    // El viaje y el juego se exponen para poder auditarlos desde consola.
    const w = window as unknown as Record<string, unknown>;
    w.CometaJourney = () => journey;
    w.CometaGame = () => game;
  }
}

boot();

// ---------------------------------------------------------------------------
// Puertos: el puente entre la lógica pura y el mundo (§11)
// ---------------------------------------------------------------------------

/** Bitácora de a bordo. SIEMPRE revela nota y grado al resolverse (§7.1). */
function resolutionMessage(info: ResolutionInfo): string {
  const head = info.correct ? t("hud.correct") : info.timedOut ? t("hud.timeout") : t("hud.wrong");
  const gloss = DEGREE_GLOSSARY[info.degree][lang];
  const body = `${head} ${info.pitchClass} (${info.degree} — ${gloss}).`;
  // Quedarse callado tiene su propio mensaje además de la revelación (§7.1).
  if (info.timedOut) return `${t("hud.noOrder")} ${body}`;
  // Confundir las dos hermanas del par mutable se nombra: es EL error del modo menor.
  if (info.mutableMix) return `${t("hud.mutableMix")} ${body}`;
  return body;
}

function currentMessage(snapshot: GameSnapshot): string {
  if (snapshot.phase === "DEPARTING") return t("hud.cadence");
  if (snapshot.phase === "QUESTION") return t("hud.listen");
  if (snapshot.lastResolution) return resolutionMessage(snapshot.lastResolution);
  return t("hud.rolling");
}

function pushSnapshot(snapshot: GameSnapshot, message?: string): void {
  if (!hud) return;
  const speed = SPEEDS.find((s) => s.id === settings.speed)!;
  const state: HudState = {
    progress: snapshot.progress,
    total: snapshot.total,
    drifts: snapshot.drifts.length,
    points: snapshot.points,
    streak: snapshot.streak,
    speedLabel: t(`speed.${speed.id}`),
    beaconsLeft: snapshot.beaconsLeft,
    beaconsTotal: snapshot.beaconsTotal,
    answerWindow: snapshot.answerWindow,
    urgentWindow: settings.speed === "MASTER" && (snapshot.answerWindow ?? 1) < 0.25,
    message: message ?? currentMessage(snapshot),
    locked: snapshot.locked,
    marks: snapshot.marks as ReadonlyMap<Degree, LeverMark>,
  };
  hud.update(state);
  journey?.setProgress(snapshot.progress / snapshot.total);
}

/**
 * El re-anclaje del oído a media deriva (§2.6–2.7). Es el momento pedagógico del
 * castigo: no se trata de humillar, sino de dejar el oído mejor de como entró.
 *
 * Caso general: suena la TÓNICA y luego la nota que era. Caso de par mutable —confundir
 * VI con VImel, o VIIST con VIIsen— suena tónica, la que respondiste y la que era, en
 * ese orden: la comparación directa de las dos hermanas es la única forma de separarlas.
 *
 * ⚠️ Nota para Luis: el Expreso Tonal quitó la repetición de la nota (su bitácora del
 * 2026-08-26 dice que "volver a soltarla la regala en vez de reanclar") y dejó solo el
 * acorde. Aquí se sigue el PLAN §2.6, que sí la pide, porque en menor la nota suele ser
 * justo la que distingue una escala de otra. Si al jugarlo te convence más la versión
 * del Expreso, es un tunable: `DRIFT_REVEAL_NOTE` en config.ts.
 */
async function playDriftReveal(info: ResolutionInfo): Promise<void> {
  const scale = settings.scale as Scale;
  const dir = supportDir();
  const gap = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

  await samples.playTonicChord(dir, minorChordFileName(scale), 0.8);
  if (!DRIFT_REVEAL_NOTE) return;
  await gap(1400);

  const correcta = pitchFileFor(scale, info.degree, dir);
  if (MUTABLE_COMPARISON_ENABLED && info.mutableMix && info.answered) {
    // Primero la que respondiste, luego la que era: el oído necesita las dos seguidas
    // para oír en qué se diferencian.
    const respondida = pitchFileFor(scale, info.answered, dir);
    if (respondida) { void samples.playNote(respondida, 0.95); await gap(1100); }
  }
  if (correcta) void samples.playNote(correcta, 0.95);
}

/** Archivo de la nota de un grado, en la octava media, con la ortografía de la escala. */
function pitchFileFor(scale: Scale, degree: Degree, dir: string): string | null {
  try {
    return `${dir}/${pitchClassOfDegree(scale, degree)}4.mp3`;
  } catch {
    return null;
  }
}

function makePorts(): JourneyPorts {
  return {
    playQuestionNote(sample) {
      lastQuestion = sample;
      void samples.playNote(sample.filePath);
    },
    playTonicChord() {
      void samples.playTonicChord(
        supportDir(), minorChordFileName(settings.scale as Scale), 0.85,
      );
    },
    playCorrectSfx() {
      samples.playCorrect(0.5);
      journey?.playRingClang();
    },
    playWrongSfx() {
      samples.playIncorrect(0.6);
    },
    duckBed(level) {
      journey?.duckBed(level);
    },
    setRing(index, result) {
      journey?.setRing(index, result);
    },
    setAmbientSuppressed(suppressed) {
      journey?.setAmbientSuppressed(suppressed);
    },
    slingshot() {
      journey?.slingshot();
    },
    beginDrift(_info, startDistance) {
      journey?.beginDrift(startDistance);
    },
    endDrift() {
      journey?.endDrift();
    },
    playReveal(info) {
      void playDriftReveal(info);
    },
    onChange(snapshot) {
      pushSnapshot(snapshot);
    },
    onResolved(info) {
      // Tras CADA decisión, no al final: si el navegador se cierra a mitad de órbita,
      // los grados ya respondidos no se pierden (§7.7).
      recordAnswer(info.degree, info.correct);
    },
    onArrived(info) {
      const speed = SPEEDS.find((s) => s.id === settings.speed)!;
      recordArrival({
        scale: settings.scale,
        medal: info.medal,
        gala: info.gala,
        score: info.points,
        streak: info.bestStreak,
        speedLabel: t(`speed.${speed.id}`),
      });
      beginPerihelion(info);
    },
  };
}

// ---------------------------------------------------------------------------
// El Perihelio (§12): la ceremonia y el resumen
// ---------------------------------------------------------------------------

/** Se puede saltar la ceremonia tras 5 s (§12). */
const ARRIVAL_SKIPPABLE_AFTER_MS = 5000;
let arrivalSkippableAt = Infinity;

/**
 * Las 12 clases de altura del rosetón: los medallones del viaje van encendidos.
 * El índice es el semitono (0 = do), sacado por MIDI real de la clase ESCRITA, así que
 * un C♭ enciende el medallón del si, que es donde suena.
 */
function litRosetteClasses(scale: Scale, degrees: Iterable<Degree>): Set<number> {
  const out = new Set<number>();
  for (const degree of degrees) {
    try {
      const pitchClass = pitchClassOfDegree(scale, degree);
      out.add(((writtenMidi(pitchClass, 4) % 12) + 12) % 12);
    } catch {
      // Un grado sin clase en esta tonalidad (el IVly de A#m) simplemente no enciende.
    }
  }
  return out;
}

/**
 * Arranca la ceremonia. La ESPIRAL son 15 anillos: 8 subiendo la escala melódica y 7
 * bajando la natural (§12). Los archivos ya los calcula `scaleWalkFiles` con la
 * ortografía de la tonalidad; aquí solo se reparten uno por anillo.
 */
function beginPerihelion(info: ArrivalInfo): void {
  if (!journey) return;
  const scale = settings.scale as Scale;
  const dir = supportDir();
  const spiral = [
    ...scaleWalkFiles(scale, "melodicUp", dir),
    ...scaleWalkFiles(scale, "naturalDown", dir),
  ];

  arrivalSkippableAt = performance.now() + ARRIVAL_SKIPPABLE_AFTER_MS;
  hud?.hide();

  journey.beginArrival(
    spiral.length,
    litRosetteClasses(scale, playableDegrees()),
    info.gala,
    {
      onRing(index) {
        const file = spiral[index];
        if (file) void samples.playNote(file, 0.95);
      },
      onFinalChord() {
        // El MISMO sonido del radiofaro: el círculo se cierra (§12).
        void samples.playTonicChord(dir, minorChordFileName(scale), 0.95);
      },
      onSettled() {
        showSummary(info);
      },
    },
  );
}

/** Bitácora final del viaje (§10). El Planetario y la persistencia llegan en F9. */
function showSummary(info: ArrivalInfo): void {
  const medal = info.medal === "gold" ? "🥇" : info.medal === "silver" ? "🥈" : "🥉";
  $("summary-medal").textContent = info.gala
    ? `${medal} ${t("medal." + info.medal)} · ${t("summary.gala")}`
    : `${medal} ${t("medal." + info.medal)}`;

  const rows: Array<[string, string]> = [
    [t("summary.points"), String(info.points)],
    [t("summary.drifts"), String(info.drifts)],
    [t("summary.accuracy"), `${Math.round(info.accuracy * 100)} %`],
    [t("summary.bestStreak"), `×${info.bestStreak}`],
    [t("summary.beaconsLeft"), String(info.beaconsLeft)],
  ];
  const box = $("summary-stats");
  box.replaceChildren();
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "summary-row";
    const name = document.createElement("span");
    name.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    row.append(name, strong);
    box.appendChild(row);
  }
  showScreen("summary-screen");
}
