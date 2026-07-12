// Bootstrap de Batisfera: i18n, menú, settings, audio y mundo 3D (F0–F2).

import "./style.css";
import { initI18n, t, getLang } from "./i18n";
import { Game3D } from "@/3d/renderer";
import { HUD } from "@/ui/hud";
import {
  INSTRUMENTS,
  ZONES,
  STORAGE_KEYS,
  type GameMode,
  type InstrumentChoice,
  depthMeters,
  zoneAtY,
} from "@/config";
import { CHORD_TYPES, CHORD_BY_ID, FAMILY_NAMES, chordName } from "@/music/chords";
import { chordNotes, hasSamplesFor, noteToMidi, midiToNote } from "@/music/theory";
import { QuestionMachine } from "@/game/questions";
import { DiveState, type DiveEndReason } from "@/game/state";
import { shouldCancelListening } from "@/game/listening";
import { loadBitacora, recordAttempt, saveUnlockedZone } from "@/game/persistence";
import { SPECIES } from "@/3d/creatures/species";
import { AMBIENT_BUBBLES_URL, AMBIENT_THRUSTERS_URL, FAMILY_GLOW } from "@/config";
import { SamplePlayer, resolveInstrument } from "@/audio/samples";
import type { Creature } from "@/3d/creatures/base";
import type { Instrument } from "@/config";

interface Settings {
  instrument: InstrumentChoice;
  volume: number; // 0..1
}

const DEFAULT_SETTINGS: Settings = { instrument: "Piano", volume: 0.8 };

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(s));
  } catch {
    // almacenamiento no disponible: seguir sin persistir
  }
}

// Zona máxima desbloqueada (persistencia completa llega en F7; aquí solo lectura segura).
function unlockedZone(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) return 1;
    const parsed = JSON.parse(raw) as { unlockedZone?: number };
    const z = parsed.unlockedZone ?? 1;
    return Math.min(5, Math.max(1, z));
  } catch {
    return 1;
  }
}

// ---------- Estado del menú ----------
const settings = loadSettings();
let selectedMode: GameMode = "EXPEDITION";
let selectedStartZone = 1;

const player = new SamplePlayer();
player.setVolume(settings.volume);

// ---------- Helpers de DOM ----------
function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Elemento #${id} no encontrado`);
  return node as T;
}

let toastTimer = 0;
function showToast(message: string): void {
  const toast = el<HTMLDivElement>("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

function renderChipRow<T extends string | number>(
  container: HTMLElement,
  items: { value: T; label: string; disabled?: boolean }[],
  selected: T,
  onSelect: (value: T) => void,
): void {
  container.innerHTML = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (item.value === selected ? " selected" : "");
    btn.textContent = item.label;
    btn.disabled = Boolean(item.disabled);
    btn.addEventListener("click", () => {
      onSelect(item.value);
      renderMenu(); // re-render para refrescar selección
    });
    container.appendChild(btn);
  }
}

function renderMenu(): void {
  renderChipRow<GameMode>(
    el("mode-options"),
    (["EXPEDITION", "TIME_ATTACK", "SURVIVAL"] as GameMode[]).map((m) => ({
      value: m,
      label: t(`mode.${m}`),
    })),
    selectedMode,
    (m) => {
      selectedMode = m;
    },
  );
  el("mode-desc").textContent = t(`mode.${selectedMode}.desc`);

  renderChipRow<InstrumentChoice>(
    el("timbre-options"),
    ([...INSTRUMENTS, "Aleatorio"] as InstrumentChoice[]).map((i) => ({
      value: i,
      label: t(`timbre.${i}`),
    })),
    settings.instrument,
    (i) => {
      settings.instrument = i;
      saveSettings(settings);
    },
  );

  const maxZone = unlockedZone();
  if (selectedStartZone > maxZone) selectedStartZone = maxZone;
  renderChipRow<number>(
    el("zone-options"),
    ZONES.map((z) => ({
      value: z.index,
      label: `${z.index} · ${t(z.nameKey)}`,
      disabled: z.index > maxZone,
    })),
    selectedStartZone,
    (z) => {
      selectedStartZone = z;
    },
  );
}

// ---------- Arranque ----------
initI18n();
renderMenu();

const volumeSlider = el<HTMLInputElement>("volume-slider");
volumeSlider.value = String(Math.round(settings.volume * 100));
volumeSlider.addEventListener("input", () => {
  settings.volume = Number(volumeSlider.value) / 100;
  player.setVolume(settings.volume);
  saveSettings(settings);
});

// ---------- Mundo 3D (F2) y HUD (F3) ----------
const game = new Game3D(el<HTMLCanvasElement>("game-canvas"));
const hud = new HUD(el("hud"));

function showScreen(id: string): void {
  for (const section of document.querySelectorAll<HTMLElement>("#ui-root .screen")) {
    section.classList.toggle("hidden", section.id !== id);
    section.classList.toggle("active", section.id === id);
  }
}

function returnToMenu(): void {
  game.stopDive();
  game.creatures.clear();
  player.stopLoop("bubbles");
  player.stopLoop("thrusters");
  thrustersActive = false;
  dive = null;
  paused = false;
  cancelListening();
  showScreen("menu-screen");
  renderMenu(); // refresca zonas desbloqueadas
}

game.onDepth = (meters, y) => {
  hud.setDepth(meters, t(zoneAtY(y).nameKey));
  if (!dive || dive.ended) return;
  dive.trackDepth(meters);

  const zone = zoneAtY(y).index;
  if (zone !== dive.zoneIndex) {
    dive.enterZone(zone);
    hud.setQuota(dive.capturesInZone, dive.quota);
    game.player.depthLimit = dive.allowedBottomY();
    cancelListening();
    showZoneTransition(zone);
  }

  if (dive.reachedBottom(y)) endDive("COMPLETE");
};

game.onFrame = (dt) => {
  hud.tick(dt, game.creatures.blips(game.player.position, game.player.yaw));
  if (listening && dive && !paused && !dive.ended) {
    listeningElapsedSec += dt;
    const distance = listening.position.distanceTo(game.player.position);
    if (shouldCancelListening(listeningElapsedSec, distance)) cancelListening();
  }
  // Contrarreloj: el O₂ drena solo mientras no haya pausa (F6).
  if (dive && !paused && !dive.ended && dive.mode === "TIME_ATTACK") {
    const out = dive.tickO2(dt);
    hud.setO2(dive.o2 / 90);
    if (out) endDive("O2_OUT");
  }

  if (dive && !paused && !dive.ended) {
    const moving = game.player.isMoving;
    if (moving && !thrustersActive) {
      thrustersActive = true;
      player.startLoop("thrusters", AMBIENT_THRUSTERS_URL, 1.0);
    } else if (!moving && thrustersActive) {
      thrustersActive = false;
      player.stopLoop("thrusters");
    }
  } else if (thrustersActive) {
    thrustersActive = false;
    player.stopLoop("thrusters");
  }
};

// ---------- Sesión de inmersión (F5) ----------
const questions = new QuestionMachine();
let dive: DiveState | null = null;
let paused = false;
let thrustersActive = false;

// El generador alimenta al spawner con el avance de la zona actual.
game.creatures.setAssigner((zoneIndex) => {
  if (!dive || dive.ended || paused) return null;
  const q = questions.next(zoneIndex, dive.capturesInZone, dive.quota);
  return q ? { chord: q.chord, rootNote: q.rootNote, isReview: q.isReview } : null;
});

// Timbre por criatura: "Aleatorio" se resuelve UNA vez por pregunta (PLAN §3.3).
const creatureInstrument = new WeakMap<Creature, Instrument>();
let listening: Creature | null = null;
let listeningElapsedSec = 0;

function cancelListening(): void {
  if (listening?.state === "LISTENING") listening.state = "IDLE";
  listening = null;
  listeningElapsedSec = 0;
  player.stopChord();
  hud.clearQuestion();
}

function playCreatureChord(creature: Creature): void {
  player.unlock();
  let instrument = creatureInstrument.get(creature);
  if (!instrument) {
    instrument = resolveInstrument(settings.instrument);
    creatureInstrument.set(creature, instrument);
  }
  void player.playChord(chordNotes(creature.rootNote, creature.chord), instrument);
  creature.pulse();
}

game.onCreatureTapped = (creature) => {
  if (!dive || dive.ended || paused) return;
  if (creature.state !== "IDLE" && creature.state !== "LISTENING") return;
  if (listening && listening !== creature && listening.state === "LISTENING") {
    cancelListening(); // tocar otra cancela la anterior sin penalización (§6.1)
  }
  listening = creature;
  listeningElapsedSec = 0;
  creature.state = "LISTENING";
  playCreatureChord(creature); // re-click = re-escuchar, ilimitado

  const options = questions.optionsFor(
    { chord: creature.chord, rootNote: creature.rootNote, isReview: creature.isReview },
    dive.zoneIndex,
    dive.capturesInZone,
    dive.quota,
  );
  const familyLabel = creature.isReview
    ? FAMILY_NAMES[creature.chord.family][getLang()]
    : undefined;
  hud.showQuestion(options, answerCurrent, () => {
    if (listening !== creature || creature.state !== "LISTENING") return;
    listeningElapsedSec = 0;
    playCreatureChord(creature);
  }, familyLabel);
};

function answerCurrent(chordId: string): void {
  if (!dive || !listening || listening.state !== "LISTENING") return;
  const creature = listening;
  listening = null;
  listeningElapsedSec = 0;
  hud.clearQuestion();

  const result = dive.answer(creature.chord.id, chordId, creature.isLeviathan);
  recordAttempt(creature.chord.id, result.correct, creature.speciesId); // F7: guarda YA
  hud.setScore(dive.score);
  hud.setStreak(dive.streak);
  hud.setQuota(dive.capturesInZone, dive.quota);

  if (result.correct) {
    player.playCorrect();
    creature.capture();
    if (result.thermoclineOpened) {
      game.player.depthLimit = dive.allowedBottomY();
      game.environment.setThermoclineOpen(dive.zoneIndex, true);
      hud.showFeedback(true, `${t("feedback.correct")} +${result.points} — ${t("feedback.zoneOpen")}`);
      // Solo Expedición desbloquea zonas de forma persistente (PLAN §6.4).
      if (dive.mode === "EXPEDITION") saveUnlockedZone(dive.zoneIndex + 1);
    } else {
      hud.showFeedback(true, `${t("feedback.correct")} +${result.points}`);
    }
  } else {
    player.playIncorrect();
    creature.flee(game.player.position);
    hud.showFeedback(
      false,
      `${t("feedback.wrong")} ${t("feedback.was")} ${chordName(creature.chord, getLang())}`,
    );
    if (dive.mode === "SURVIVAL") {
      hud.addCrack();
      hud.setHull(result.hullRemaining, 3);
      if (result.hullRemaining === 0) endDive("HULL_OUT");
    }
  }
}

// Teclas 1..9 responden; R re-escucha (PLAN §9).
window.addEventListener("keydown", (e) => {
  if (!dive || paused || e.target instanceof HTMLInputElement) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) hud.pickByIndex(n);
  if (e.key.toLowerCase() === "r" && listening) {
    listeningElapsedSec = 0;
    playCreatureChord(listening);
  }
});

function showZoneTransition(zoneIndex: number): void {
  const zone = ZONES[zoneIndex - 1];
  el("zt-name").textContent = t(zone.nameKey);
  el("zt-meters").textContent =
    `${zone.metersTop.toLocaleString()}–${zone.metersBottom.toLocaleString()} m`;
  el("zt-family").textContent = zone.families
    .map((f) => FAMILY_NAMES[f][getLang()])
    .join(" · ");
  const section = el("zone-transition");
  section.classList.remove("hidden");
  window.setTimeout(() => section.classList.add("hidden"), 2650);
}

function startDive(): void {
  player.unlock(); // debe ejecutarse sincrónicamente dentro del gesto del botón
  void player.preloadEffects(); // primer gesto: desbloquea y precarga SFX
  questions.reset();
  dive = new DiveState(selectedMode, selectedStartZone);
  paused = false;
  cancelListening();
  game.creatures.clear();
  game.creatures.spawningEnabled = true;
  hud.clearQuestion();
  hud.setScore(0);
  hud.setStreak(0);
  hud.setQuota(dive.capturesInZone, dive.quota);
  hud.setModeMeters(selectedMode);
  if (selectedMode === "TIME_ATTACK") hud.setO2(1);
  if (selectedMode === "SURVIVAL") hud.setHull(3, 3);
  game.player.depthLimit = dive.allowedBottomY();
  for (let boundary = 1; boundary <= 4; boundary++) {
    game.environment.setThermoclineOpen(boundary, dive.isZoneOpen(boundary));
  }
  showScreen("hud");
  game.startDive(selectedStartZone);
  showZoneTransition(selectedStartZone);
  player.startLoop("bubbles", AMBIENT_BUBBLES_URL, 0.35);
}

function endDive(reason: DiveEndReason): void {
  if (!dive || dive.ended) return;
  dive.ended = reason;
  game.stopDive();
  player.stopLoop("bubbles");
  player.stopLoop("thrusters");
  thrustersActive = false;
  cancelListening();

  const reasonKey =
    reason === "COMPLETE" ? "summary.complete" : reason === "O2_OUT" ? "summary.o2out" : reason === "HULL_OUT" ? "summary.hullout" : "";
  el("summary-reason").textContent = reasonKey ? t(reasonKey) : "";
  el("summary-stats").innerHTML = (
    [
      [t("summary.score"), dive.score],
      [t("summary.captures"), dive.captures],
      [t("summary.accuracy"), `${dive.accuracy()}%`],
      [t("summary.bestStreak"), dive.bestStreak],
      [t("summary.maxDepth"), `${dive.maxDepthMeters.toLocaleString()} m`],
    ] as [string, string | number][]
  )
    .map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`)
    .join("");
  showScreen("summary-screen");
}

// Pausa (Esc): congela controles; O₂ (F6) también se detendrá aquí.
game.player.onEscape = () => {
  if (!dive || dive.ended) return;
  if (paused) resumeDive();
  else pauseDive();
};

function pauseDive(): void {
  paused = true;
  game.stopDive();
  player.stopLoop("thrusters");
  thrustersActive = false;
  showScreen("pause-screen");
}

function resumeDive(): void {
  paused = false;
  showScreen("hud");
  game.player.setEnabled(true);
}

// Controles táctiles: solo en dispositivos touch (PLAN §9).
if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add("touch");
  game.player.attachTouchControls(
    el("joy-zone"),
    el("joy-knob"),
    el("btn-up"),
    el("btn-down"),
  );
}

el("pause-resume").addEventListener("click", resumeDive);
el("pause-quit").addEventListener("click", returnToMenu);
hud.abortBtn.addEventListener("click", returnToMenu);
el("summary-retry").addEventListener("click", startDive);
el("summary-menu").addEventListener("click", returnToMenu);

el("start-btn").addEventListener("click", startDive);

// ---------- Bitácora del biólogo (F7): colección = estadísticas ----------
function buildBitacora(): void {
  const data = loadBitacora();
  const lang = getLang();
  const grid = el("bitacora-grid");
  let captured = 0;

  grid.innerHTML = CHORD_TYPES.map((chord) => {
    const entry = data[chord.id];
    const isCaptured = (entry?.correct ?? 0) > 0;
    const isSeen = !isCaptured && (entry?.attempts ?? 0) > 0;
    if (isCaptured) captured++;

    const color = "#" + FAMILY_GLOW[chord.family].toString(16).padStart(6, "0");
    const stateClass = isCaptured ? "captured" : isSeen ? "seen" : "unseen";
    const name = isCaptured || isSeen ? chordName(chord, lang) : "???";
    const species = entry?.speciesId
      ? SPECIES.find((s) => s.id === entry.speciesId)
      : undefined;
    const detail = isCaptured
      ? `${species ? (lang === "en" ? species.en : species.es) + " · " : ""}${Math.round((entry!.correct / entry!.attempts) * 100)}%`
      : isSeen
        ? `${t("bitacora.seen")} · ${entry!.attempts} ${t("bitacora.attempts").toLowerCase()}`
        : t("bitacora.unseen");

    return `<div class="bit-card ${stateClass}" style="border-left-color:${color}">
      <b>${name}</b><span>${detail}</span>
    </div>`;
  }).join("");

  el("bitacora-count").textContent = `${captured}/${CHORD_TYPES.length}`;
}

el("bitacora-btn").addEventListener("click", () => {
  buildBitacora();
  showScreen("bitacora-screen");
});
el("bitacora-back").addEventListener("click", () => showScreen("menu-screen"));

// ---------- Debug (?debug=1) — verificación de F1 (PLAN §12) ----------
const debugEnabled = new URLSearchParams(window.location.search).get("debug") === "1";
if (debugEnabled) {
  const panel = el<HTMLDivElement>("debug-panel");
  panel.classList.remove("hidden");

  const addBtn = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.addEventListener("click", fn);
    panel.appendChild(b);
  };

  const cmaj7 = CHORD_BY_ID["MAJOR_7"];
  addBtn("▶ Cmaj7 · Piano", () => void player.playChord(chordNotes("C4", cmaj7), "Piano"));
  addBtn("▶ Cmaj7 · Coro", () => void player.playChord(chordNotes("C4", cmaj7), "Coro"));
  addBtn("▶ F#3 Mayor · Fagot", () =>
    void player.playChord(chordNotes("F#3", CHORD_BY_ID["MAJOR"]), "Fagot"),
  );
  addBtn("✔ acierto.mp3", () => player.playCorrect());
  addBtn("✘ error.mp3", () => player.playIncorrect());

  // Lectura de profundidad en vivo (verificación F2) — encadena sin robar el callback del HUD.
  const depthReadout = document.createElement("div");
  depthReadout.style.cssText = "color:#7dd3fc;font-family:monospace";
  panel.appendChild(depthReadout);
  const prevOnDepth = game.onDepth;
  game.onDepth = (meters, y) => {
    prevOnDepth?.(meters, y);
    depthReadout.textContent = `${meters} m (y=${y.toFixed(1)})`;
  };
}

// Expuesto para verificación en consola del navegador (criterios de aceptación F1).
declare global {
  interface Window {
    __batisfera: Record<string, unknown>;
  }
}
window.__batisfera = {
  lang: getLang(),
  noteToMidi,
  midiToNote,
  chordNotes,
  hasSamplesFor,
  CHORD_TYPES,
  CHORD_BY_ID,
  chordName,
  depthMeters,
  zoneAtY,
  player,
  resolveInstrument,
  game,
  hud,
  getDive: () => dive,
  answerCurrent,
  showToast,
};

console.log(
  `%cBATISFERA%c F0/F1 · lang=${getLang()} · ${CHORD_TYPES.length} acordes cargados`,
  "font-weight:bold;color:#7dd3fc",
  "color:inherit",
);
