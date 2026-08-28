// main.ts — Bootstrap F0: idioma, menú funcional (selección de ruta/timbre/velocidad/
// grados/volumen) y navegación de pantallas. El juego 3D llega en F2+.
import "./style.css";
import { initI18n, t, lang } from "./i18n";
import {
  SCALES, DIATONIC_DEGREES, CHROMATIC_DEGREES, TIMBRES, DEGREE_GLOSSARY,
  DEGREE_SHORT_SUFFIX, ALL_DEGREES_OPTIONS, resolveTimbre, sortDegrees,
  scaleWalkFiles, scaleDegrees, triadFiles, type Degree, type Timbre, type Scale,
} from "./music/degrees";
import { SPEEDS, answerWindowSeconds, routeForScale, BIOME_SWATCH, type SpeedId } from "./config";
import { JourneyRenderer } from "./3d/renderer";
import { Hud } from "./ui/hud";
import { GameStateManager, type ArrivalInfo, type GameSnapshot, type ResolutionInfo } from "./game/state";
import { SamplePlayer } from "./audio/samples";
import { Salon } from "./ui/salon";
import {
  loadSettings, recordAnswer, recordArrival, saveSettings,
} from "./game/persistence";
import { supportTimbreDir, type QuestionSample } from "./music/selector";
import { CADENCE_CHORD_GAP_S } from "./config";


let salon: Salon | null = null;

/** Vuelca los ajustes actuales del menú a localStorage (§7.7). */
function persistSettings(): void {
  saveSettings({
    escala: settings.scale,
    timbre: settings.timbre,
    velocidad: settings.speed,
    gradosSeleccionados: sortDegrees(settings.degrees),
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
  if (typeof stored.volumen === "number") settings.volume = Math.max(0, Math.min(100, stored.volumen));
  const degrees = stored.gradosSeleccionados
    .filter((d): d is Degree => (ALL_DEGREES_OPTIONS as readonly string[]).includes(d));
  if (degrees.length >= MIN_DEGREES) settings.degrees = new Set(degrees);
}

function openSalon(): void {
  if (!salon) salon = new Salon($("salon-board"), $("salon-degrees"));
  salon.render();
  $("salon-screen").classList.remove("hidden");
  $("salon-screen").classList.add("active");
}

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

const settings: Settings = {
  scale: "C",
  timbre: "Piano",
  speed: "NORMAL",
  degrees: new Set<Degree>(DIATONIC_DEGREES),
  volume: 80,
};

const MIN_DEGREES = 2; // PLAN §3.6: con 1 no hay decisión que tomar

// ---------------------------------------------------------------------------
// Utilidades DOM
// ---------------------------------------------------------------------------
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento no encontrado: #${id}`);
  return el;
}

function chip(label: string, opts?: { swatch?: string; title?: string }): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "chip";
  if (opts?.swatch) {
    const s = document.createElement("span");
    s.className = "swatch";
    s.style.background = opts.swatch;
    b.appendChild(s);
  }
  b.appendChild(document.createTextNode(label));
  if (opts?.title) b.title = opts.title;
  return b;
}

let toastTimer = 0;
let journey: JourneyRenderer | null = null;
let hud: Hud | null = null;
let game: GameStateManager | null = null;
const samples = new SamplePlayer();

/** Última pregunta sonada: el timbre Aleatorio infiere de ella su carpeta de apoyo. */
let lastQuestion: QuestionSample | null = null;

/**
 * Mensaje de consola estilo telegrama. SIEMPRE revela nota y grado al resolverse
 * (§7.1), porque la revelación es el momento pedagógico del juego.
 */
function resolutionMessage(info: ResolutionInfo): string {
  const head = info.correct ? t("hud.correct") : info.timedOut ? t("hud.timeout") : t("hud.wrong");
  const gloss = DEGREE_GLOSSARY[info.degree][lang];
  const body = `${head} ${info.pitchClass} (${info.degree} — ${gloss}).`;
  // §7.1: quedarse callado tiene su propio mensaje además de la revelación.
  return info.timedOut ? `${t("hud.noOrder")} ${body}` : body;
}

function pushSnapshot(snapshot: GameSnapshot, message?: string): void {
  if (!hud) return;
  const speed = SPEEDS.find((s) => s.id === settings.speed)!;
  hud.update({
    progress: snapshot.progress,
    total: snapshot.total,
    detours: snapshot.detours,
    points: snapshot.points,
    streak: snapshot.streak,
    speedLabel: t(`speed.${speed.id}`),
    whistlesLeft: snapshot.whistlesLeft,
    whistlesTotal: snapshot.whistlesTotal,
    answerWindow: snapshot.answerWindow,
    urgentWindow: settings.speed === "MASTER" && (snapshot.answerWindow ?? 1) < 0.25,
    message: message ?? currentMessage(snapshot),
    locked: snapshot.locked,
    marks: snapshot.marks,
  });
}

function currentMessage(snapshot: GameSnapshot): string {
  if (snapshot.phase === "DEPARTING") return t("hud.cadence");
  if (snapshot.phase === "QUESTION") return t("hud.listen");
  if (snapshot.phase === "DETOUR" && snapshot.lastResolution) {
    // En el apartadero el telegrama insiste: la revelación es el momento pedagógico.
    return `${t("hud.detour")} ${resolutionMessage(snapshot.lastResolution)}`;
  }
  if (snapshot.lastResolution) return resolutionMessage(snapshot.lastResolution);
  return t("hud.rolling");
}

/**
 * Acorde de tónica en el timbre del viaje (silbato, revelación del desvío y acorde final
 * de la llegada).
 *
 * Se APILA desde las notas sueltas del timbre —igual que la cadencia de §3.5— en vez de
 * usar el sample `Major Chords` que pedía §3.4. Motivo: esas grabaciones no respetan su
 * carpeta (pidiendo `Piano/Major Chords/Cmajor.mp3` se oía un cello; Piano, Cello y Coro
 * comparten duración exacta), y la regla de Luis es que si el viaje es en piano, TODO
 * suene en piano. El círculo silbato↔llegada se sigue cerrando: ambos son la misma
 * tríada I.
 */
function playTonicTriad(volumeScale = 1): void {
  const dir = supportTimbreDir(settings.timbre, lastQuestion);
  void samples.playTriad(triadFiles(settings.scale as Scale, "I", dir), volumeScale);
}

/** Clase de altura de la tónica de una tonalidad, del mapa sagrado `scaleDegrees`. */
function tonicOf(scale: Scale): string {
  const entry = Object.entries(scaleDegrees[scale]).find(([, degree]) => degree === "I");
  return entry ? entry[0] : "C";
}

/** Cadencia de salida I–IV–V–I (§3.5): establece el centro tonal antes de rodar. */
async function playDepartureCadence(scale: Scale, timbreDir: string): Promise<void> {
  for (const triad of ["I", "IV", "V", "I"] as const) {
    await samples.playTriad(triadFiles(scale, triad, timbreDir), 0.9);
    await new Promise((r) => window.setTimeout(r, CADENCE_CHORD_GAP_S * 1000));
  }
}

function abandonJourney(): void {
  journey?.stop();
  if (journey) journey.onTick = null;
  game?.stop();
  hud?.hide();
  samples.stopAll();
  for (const id of ["pause-screen", "summary-screen"]) {
    $(id).classList.add("hidden");
    $(id).classList.remove("active");
  }
  $("menu-screen").classList.remove("hidden");
  $("menu-screen").classList.add("active");
}

/** Se puede saltar la ceremonia tras 5 s (§12). */
const ARRIVAL_SKIPPABLE_AFTER_MS = 5000;
let arrivalSkippableAt = Infinity;

/**
 * La secuencia de llegada (§12). Los 8 arcos cantan la escala mayor de la tonalidad con
 * su ortografía real; el 8º cierra con el MISMO sample `Major Chords` del silbato —el
 * círculo se cierra— y la campana repica 3 veces solo si hubo gala.
 */
function startArrivalSequence(info: ArrivalInfo): void {
  // El récord se apunta al llegar, antes de la ceremonia: si el jugador cierra la
  // pestaña durante los 35 s de arcos, la llegada ya está en el tablero.
  recordArrival({
    scale: settings.scale,
    medal: info.medal,
    gala: info.gala,
    score: info.points,
    streak: info.bestStreak,
    speedLabel: t(`speed.${settings.speed}`),
  });

  const scale = settings.scale as Scale;
  const timbreDir = supportTimbreDir(settings.timbre, lastQuestion);
  const walk = scaleWalkFiles(scale, timbreDir);
  for (const path of walk) void samples.preload(path);

  hud?.hide();
  $("hud").classList.add("hidden");
  arrivalSkippableAt = performance.now() + ARRIVAL_SKIPPABLE_AFTER_MS;

  const tonicPitchClass = walk[0].split("/")[1].replace(/\d+\.mp3$/, "");
  journey?.beginArrival(tonicPitchClass, info.gala, {
    onArch: (index) => void samples.playNote(walk[index], 0.95),
    onFinalChord: () => playTonicTriad(1),
    onStopped: () => {
      arrivalSkippableAt = Infinity;
      showSummary(info);
    },
  });
}

const MEDAL_ICON = { gold: "🥇", silver: "🥈", bronze: "🥉" } as const;

/**
 * Resumen del viaje (§10). F8 antepondrá la secuencia de llegada de la Terminal y F9
 * añadirá aquí las novedades del Salón de Rutas.
 */
function showSummary(info: ArrivalInfo): void {
  journey?.stop();
  if (journey) journey.onTick = null;
  hud?.hide();

  $("summary-medal").textContent =
    `${MEDAL_ICON[info.medal]} ${t(`medal.${info.medal}`)}${info.gala ? ` · ${t("summary.gala")}` : ""}`;

  const stats = $("summary-stats");
  stats.innerHTML = "";
  const rows: Array<[string, string]> = [
    [t("summary.points"), String(info.points)],
    [t("summary.detours"), String(info.detours)],
    [t("summary.accuracy"), `${Math.round(info.accuracy * 100)} %`],
    [t("summary.bestStreak"), `×${info.bestStreak}`],
    [t("summary.whistlesLeft"), String(info.whistlesLeft)],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "summary-row";
    const name = document.createElement("span");
    name.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    row.append(name, strong);
    stats.appendChild(row);
  }

  $("summary-screen").classList.remove("hidden");
  $("summary-screen").classList.add("active");
}

function ensureGame(): { hud: Hud; game: GameStateManager } {
  if (hud && game) return { hud, game };
  const createdHud = new Hud($("hud"), {
    onDegree: (degree) => game?.answer(degree),
    onWhistle: () => { if (game?.useWhistle()) journey?.pullWhistle(); },
    onRepeat: () => game?.repeatNote(),
  });
  hud = createdHud;

  game = new GameStateManager({
    playQuestionNote: (sample) => {
      lastQuestion = sample;
      void samples.playNote(sample.filePath);
    },
    playTonicChord: () => playTonicTriad(),
    playCorrectSfx: () => {
      journey?.playSwitchClunk();
      samples.playCorrect(0.55); // volumen bajo: no debe tapar el clunk (§9)
    },
    playWrongSfx: () => samples.playIncorrect(0.7),
    duckBed: (level) => journey?.duckBed(level),
    setSwitch: (index, result) => journey?.setSwitchResult(index, result),
    setAmbientSuppressed: (suppressed) => journey?.setAmbientSuppressed(suppressed),
    beginDetour: (_info, startDistance) => journey?.beginDetour(startDistance),
    endDetour: () => journey?.endDetour(),
    // Re-anclaje del oído en el apartadero: SOLO el acorde de tónica.
    //
    // Desviación deliberada del PLAN §2.6, pedida por Luis tras jugar: el plan cerraba
    // "tónica → nota", pero volver a soltar la nota de la pregunta la regala en vez de
    // reanclar. El grado y la nota siguen revelándose por escrito en el telegrama.
    playReveal: () => playTonicTriad(0.85),
    onChange: (snapshot) => {
      journey?.setGameProgress(snapshot.progress / snapshot.total);
      pushSnapshot(snapshot);
    },
    onResolved: (info) => {
      // §7.7: se guarda tras CADA decisión, no al final del viaje.
      recordAnswer(info.degree, info.correct);
      pushSnapshot(game!.snapshot(), resolutionMessage(info));
    },
    onArrived: (info) => startArrivalSequence(info),
  });
  return { hud, game };
}
/** Aviso efímero. Lo conservan las fases futuras (F10/F11) aunque ahora nadie lo llame. */
export function showToast(msg: string): void {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove("show"), 2600);
}

// ---------------------------------------------------------------------------
// Render del menú
// ---------------------------------------------------------------------------
function renderRoutes(): void {
  const row = $("route-options");
  row.innerHTML = "";
  for (const scale of SCALES) {
    const route = routeForScale(scale);
    const tip = `${t(`biome.${route.biome}`)} · ${t(`time.${route.time}`)}`;
    const c = chip(scale, { swatch: BIOME_SWATCH[route.biome], title: tip });
    c.classList.toggle("selected", scale === settings.scale);
    c.onclick = () => {
      settings.scale = scale;
      persistSettings();
      renderRoutes();
    };
    row.appendChild(c);
  }
  const route = routeForScale(settings.scale);
  $("route-desc").textContent =
    `${t(`biome.${route.biome}`)} · ${t(`time.${route.time}`)}`;
}

function renderTimbres(): void {
  const row = $("timbre-options");
  row.innerHTML = "";
  for (const timbre of TIMBRES) {
    const c = chip(t(`timbre.${timbre}`));
    c.classList.toggle("selected", timbre === settings.timbre);
    c.onclick = () => {
      settings.timbre = timbre;
      persistSettings();
      renderTimbres();
    };
    row.appendChild(c);
  }
}

function renderSpeeds(): void {
  const row = $("speed-options");
  row.innerHTML = "";
  for (const spec of SPEEDS) {
    const secs = answerWindowSeconds(spec).toFixed(1);
    const c = chip(`${t(`speed.${spec.id}`)} · ~${secs} s`);
    c.classList.toggle("selected", spec.id === settings.speed);
    c.onclick = () => {
      settings.speed = spec.id;
      persistSettings();
      renderSpeeds();
    };
    row.appendChild(c);
  }
  const spec = SPEEDS.find((s) => s.id === settings.speed)!;
  $("speed-desc").textContent =
    `${t("menu.window")}: ~${answerWindowSeconds(spec).toFixed(1)} s · ×${spec.scoreMultiplier}`;
}

function degreeChipLabel(d: Degree): string {
  const suffix = DEGREE_SHORT_SUFFIX[d];
  return suffix ? `${d} (${suffix})` : d;
}

function renderDegrees(): void {
  const diatonicRow = $("diatonic-options");
  const chromaticRow = $("chromatic-options");
  diatonicRow.innerHTML = "";
  chromaticRow.innerHTML = "";

  const make = (d: Degree, row: HTMLElement) => {
    const c = chip(degreeChipLabel(d), { title: DEGREE_GLOSSARY[d][lang] });
    c.classList.toggle("selected", settings.degrees.has(d));
    c.onclick = () => {
      if (settings.degrees.has(d)) settings.degrees.delete(d);
      else settings.degrees.add(d);
      persistSettings();
      renderDegrees();
    };
    row.appendChild(c);
  };

  for (const d of DIATONIC_DEGREES) make(d, diatonicRow);
  for (const d of CHROMATIC_DEGREES) make(d, chromaticRow);

  const n = settings.degrees.size;
  $("degrees-count").textContent = `— ${n} ${t("menu.active")}`;
  $("degrees-warning").classList.toggle("hidden", n >= MIN_DEGREES);
  ($("start-btn") as HTMLButtonElement).disabled = n < MIN_DEGREES;
}

function wireMenu(): void {
  $("only-diatonic-btn").onclick = () => {
    settings.degrees = new Set<Degree>(DIATONIC_DEGREES);
    renderDegrees();
  };
  $("all-degrees-btn").onclick = () => {
    settings.degrees = new Set<Degree>([...DIATONIC_DEGREES, ...CHROMATIC_DEGREES]);
    renderDegrees();
  };

  const volume = $("volume-slider") as HTMLInputElement;
  volume.value = String(settings.volume);
  volume.oninput = () => {
    settings.volume = Number(volume.value);
    journey?.setVolume(settings.volume);
    samples.setVolume(settings.volume / 100);
    persistSettings();
  };

  $("start-btn").onclick = () => {
    if (settings.degrees.size < MIN_DEGREES) return;
    console.info("[ExpresoTonal] settings:", {
      ...settings,
      degrees: sortDegrees(settings.degrees),
    });
    // El unlock de audio DEBE ir sincrónicamente en el gesto real, antes de cualquier
    // await, o el navegador rechaza todo lo que venga después (PLAN §10).
    samples.unlock();
    samples.setVolume(settings.volume / 100);
    void samples.preloadEffects();

    const speed = SPEEDS.find((s) => s.id === settings.speed)!;
    journey ??= new JourneyRenderer($("game-canvas") as HTMLCanvasElement);
    journey.start({
      scale: settings.scale, speed, volume: settings.volume,
      // El rosetón de 12 husos de la Terminal se orienta con la tónica del viaje (§12).
      tonicPitchClass: tonicOf(settings.scale as Scale),
    });

    const ui = ensureGame();
    journey.onTick = (dt, distance) => ui.game.tick(dt, distance);
    ui.hud.show();
    ui.hud.setDegrees(sortDegrees(settings.degrees));
    lastQuestion = null;
    ui.game.start({
      scale: settings.scale as Scale,
      degrees: settings.degrees,
      timbre: settings.timbre,
      speed,
    });

    $("menu-screen").classList.add("hidden");
    $("menu-screen").classList.remove("active");

    // Cadencia de salida con el tren PARADO; al acabar se sueltan los frenos (§7.1).
    const timbreDir = resolveTimbre(settings.timbre);
    void playDepartureCadence(settings.scale as Scale, timbreDir).then(() => {
      if (ui.game.getPhase() !== "DEPARTING") return; // se abandonó durante la cadencia
      ui.game.beginRolling();
      journey?.releaseBrakes();
    });
  };

  $("salon-btn").onclick = () => openSalon();
  $("salon-back").onclick = () => {
    $("salon-screen").classList.add("hidden");
    $("salon-screen").classList.remove("active");
  };

  const resume = () => {
    journey?.resume();
    $("pause-screen").classList.add("hidden");
    $("pause-screen").classList.remove("active");
  };
  $("pause-resume").onclick = resume;
  $("pause-quit").onclick = () => abandonJourney();

  $("summary-menu").onclick = () => {
    $("summary-screen").classList.add("hidden");
    $("summary-screen").classList.remove("active");
    $("menu-screen").classList.remove("hidden");
    $("menu-screen").classList.add("active");
  };
  $("summary-retry").onclick = () => {
    $("summary-screen").classList.add("hidden");
    $("summary-screen").classList.remove("active");
    $("start-btn").click();
  };
  $("summary-salon").onclick = () => openSalon();

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !journey?.isActive()) return;
    // Durante la ceremonia de llegada Esc NO pausa: salta la secuencia (§12).
    if (journey.isArriving()) {
      if (performance.now() >= arrivalSkippableAt) journey.skipArrival();
      return;
    }
    const pause = $("pause-screen");
    if (pause.classList.contains("hidden")) {
      journey.pause();
      pause.classList.remove("hidden");
      pause.classList.add("active");
    } else {
      resume();
    }
  });
}

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
initI18n();
document.title = lang === "en" ? "Tonal Express — Storm Studios" : "Expreso Tonal — Storm Studios";
restoreSettings();
renderRoutes();
renderTimbres();
renderSpeeds();
renderDegrees();
wireMenu();

// Arnés de QA de fase (PLAN §13): solo con ?dev=1, import dinámico para no pesar en prod.
if (new URLSearchParams(window.location.search).has("dev")) {
  void import("./dev/harness").then((m) => m.mountDevHarness());
  Object.defineProperty(window, "ExpresoF2", {
    configurable: true,
    get: () => ({
      journey,
      hud,
      game, // F6: permite pilotar la máquina de estados a mano cuando rAF no dispara
      snapshot: () => journey?.getSnapshot() ?? null,
      gameSnapshot: () => game?.snapshot() ?? null,
    }),
  });
}
