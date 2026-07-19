// Bootstrap de Aerostato (F0): i18n, menú y settings persistidos.
// El mundo 3D, el audio y el micrófono llegan en fases siguientes (PLAN §13).

import "./style.css";
import { initI18n, t, applyI18n, getLang } from "./i18n";
import {
  GAME_MODES,
  INSTRUMENT_CHOICES,
  LAYERS,
  MUSIC_FADE_IN_MS,
  MUSIC_FADE_OUT_MS,
  MUSIC_RESUME_AFTER_CHORD_MS,
  MUSIC_TRACK_URLS,
  MUSIC_VOLUME_SCALE,
  REGISTERS,
  STORAGE_KEYS,
  altitudeMeters,
  type GameMode,
  type InstrumentChoice,
  type RefMode,
  type Register,
} from "@/config";
import {
  CHORD_TYPES,
  CHORD_BY_ID,
  FAMILY_NAMES,
  chordName,
  intervalToDegreeLabel,
} from "@/music/chords";
import { activePool } from "@/game/progression";
import {
  loadProgress,
  recordAttempt,
  recordCompleted,
  saveBestScore,
  saveUnlockedLayer,
} from "@/game/persistence";
import { renderAtlas } from "@/ui/atlas";
import { MEDAL_BONUS, medalFor } from "@/config";
import {
  chordNotes,
  hasSamplesFor,
  midiToFrequency,
  midiToNote,
  noteToMidi,
  pitchClassName,
  validRoots,
} from "@/music/theory";
import { SamplePlayer, resolveInstrument } from "@/audio/samples";
import {
  FakePitchDetector,
  MicDeniedError,
  MicPitchDetector,
  MicUnsupportedError,
  isFakeMicRequested,
  type PitchDetectorLike,
} from "@/audio/mic";
import { FAMILY_GLOW, GAMEPLAY, LAYER_FAMILIES, MODES, PHYSICS, WORLD, layerAtY } from "@/config";
import { Game3D } from "@/3d/renderer";
import { HUD, type Medallion } from "@/ui/hud";
import { SynthSfx } from "@/audio/synth-sfx";
import { GameState, type ActiveString } from "@/game/state";
import { QuestionMachine } from "@/game/questions";
import { LanternString } from "@/3d/lanterns/string";
import { Vector3 } from "three";
import type { SpawnInfo } from "@/3d/lanterns/manager";
import type { Instrument } from "@/config";

// Settings persistidos (PLAN §7.7: aerostato-settings).
interface Settings {
  instrument: InstrumentChoice;
  volume: number; // 0..1
  register: Register;
  refMode: RefMode;
  showNames: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  instrument: "Piano",
  volume: 0.8,
  register: "male",
  refMode: "root",
  showNames: false,
};

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

function unlockedLayer(): number {
  return Math.min(Math.max(loadProgress().unlockedLayer, 1), 5);
}

const settings = loadSettings();
let selectedMode: GameMode = "EXPEDITION";
let selectedLayer = 1;

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} no encontrado`);
  return el;
}

function showScreen(id: string): void {
  document.querySelectorAll<HTMLElement>(".screen").forEach((s) => {
    s.classList.toggle("hidden", s.id !== id);
  });
}

let toastTimer = 0;
function showToast(msg: string): void {
  const toast = $("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

// Fila de chips exclusivos: pinta opciones y gestiona la selección.
function buildChipRow<T extends string>(
  container: HTMLElement,
  options: { value: T; label: () => string; disabled?: boolean }[],
  selected: T,
  onSelect: (value: T) => void,
): void {
  container.innerHTML = "";
  for (const opt of options) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = opt.label();
    chip.disabled = opt.disabled ?? false;
    chip.classList.toggle("selected", opt.value === selected);
    chip.addEventListener("click", () => {
      onSelect(opt.value);
      container.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
    });
    container.appendChild(chip);
  }
}

function updateModeDesc(): void {
  $("mode-desc").textContent = t(`mode.${selectedMode}.desc`);
}

// La capa inicial solo aplica a Expedición (PLAN §7.4).
function updateLayerGroupVisibility(): void {
  $("layer-group").style.display = selectedMode === "EXPEDITION" ? "" : "none";
}

// Se rehace al volver al menú: los desbloqueos de la partida deben verse (F9).
function rebuildLayerChips(): void {
  const maxLayer = unlockedLayer();
  selectedLayer = Math.min(selectedLayer, maxLayer);
  buildChipRow(
    $("layer-options"),
    LAYERS.map((l) => ({
      value: String(l.num),
      label: () => (l.num <= maxLayer ? t(l.i18nKey) : `${t(l.i18nKey)} · ${t("menu.locked")}`),
      disabled: l.num > maxLayer,
    })),
    String(selectedLayer),
    (v) => {
      selectedLayer = Number(v);
    },
  );
}

function buildMenu(): void {
  buildChipRow(
    $("mode-options"),
    GAME_MODES.map((m) => ({ value: m, label: () => t(`mode.${m}`) })),
    selectedMode,
    (m) => {
      selectedMode = m;
      updateModeDesc();
      updateLayerGroupVisibility();
    },
  );
  updateModeDesc();

  buildChipRow(
    $("register-options"),
    (Object.keys(REGISTERS) as Register[]).map((r) => ({
      value: r,
      label: () => t(REGISTERS[r].i18nKey),
    })),
    settings.register,
    (r) => {
      settings.register = r;
      saveSettings(settings);
    },
  );

  buildChipRow(
    $("timbre-options"),
    INSTRUMENT_CHOICES.map((i) => ({ value: i, label: () => t(`timbre.${i}`) })),
    settings.instrument,
    (i) => {
      settings.instrument = i;
      saveSettings(settings);
    },
  );

  buildChipRow(
    $("ref-options"),
    [
      { value: "root" as RefMode, label: () => t("ref.root") },
      { value: "any" as RefMode, label: () => t("ref.any") },
    ],
    settings.refMode,
    (r) => {
      settings.refMode = r;
      saveSettings(settings);
    },
  );

  rebuildLayerChips();
  updateLayerGroupVisibility();

  const showNames = $("shownames-toggle") as HTMLInputElement;
  showNames.checked = settings.showNames;
  showNames.addEventListener("change", () => {
    settings.showNames = showNames.checked;
    saveSettings(settings);
  });

  const volume = $("volume-slider") as HTMLInputElement;
  volume.value = String(Math.round(settings.volume * 100));
  volume.addEventListener("input", () => {
    settings.volume = Number(volume.value) / 100;
    saveSettings(settings);
    samplePlayer.setVolume(settings.volume);
    synth?.setVolume(settings.volume);
  });

  // INICIAR ASCENSO: el gesto que desbloquea audio + mic (§10).
  $("start-btn").addEventListener("click", () => void startGame());

  $("atlas-btn").addEventListener("click", () => {
    renderAtlas($("atlas-grid"), $("atlas-count"));
    showScreen("atlas-screen");
  });
  $("atlas-back").addEventListener("click", () => showScreen("menu-screen"));
  $("mic-denied-back").addEventListener("click", () => showScreen("menu-screen"));
}

// ---------------------------------------------------------------------------
// QA temporal de F1 (se retira cuando el loop de canto quede integrado, F6):
// API de consola siempre disponible + panel de botones solo con ?qa=1.
// ---------------------------------------------------------------------------

const samplePlayer = new SamplePlayer();
samplePlayer.setVolume(settings.volume);

declare global {
  interface Window {
    aerostato: {
      chordNotes: typeof chordNotes;
      validRoots: typeof validRoots;
      noteToMidi: typeof noteToMidi;
      midiToNote: typeof midiToNote;
      midiToFrequency: typeof midiToFrequency;
      hasSamplesFor: typeof hasSamplesFor;
      intervalToDegreeLabel: typeof intervalToDegreeLabel;
      resolveInstrument: typeof resolveInstrument;
      altitudeMeters: typeof altitudeMeters;
      CHORD_TYPES: typeof CHORD_TYPES;
      CHORD_BY_ID: typeof CHORD_BY_ID;
      player: SamplePlayer;
      detector?: PitchDetectorLike;
      game?: Game3D;
      hud?: HUD;
      state?: GameState;
    };
  }
}

window.aerostato = {
  chordNotes,
  validRoots,
  noteToMidi,
  midiToNote,
  midiToFrequency,
  hasSamplesFor,
  intervalToDegreeLabel,
  resolveInstrument,
  altitudeMeters,
  CHORD_TYPES,
  CHORD_BY_ID,
  player: samplePlayer,
};

// Un solo AudioContext compartido (samples-unlock, synth-sfx, worklet del mic),
// creado tras un gesto real (PLAN §16). No crear contextos por módulo.
let audioCtx: AudioContext | null = null;
function sharedAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

let pitchDetector: PitchDetectorLike | null = null;
function getPitchDetector(): PitchDetectorLike {
  if (!pitchDetector) {
    pitchDetector = isFakeMicRequested()
      ? new FakePitchDetector()
      : new MicPitchDetector(sharedAudioContext());
    window.aerostato.detector = pitchDetector;
  }
  return pitchDetector;
}

function buildQaPanel(): void {
  if (new URLSearchParams(window.location.search).get("qa") !== "1") return;
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;top:8px;left:8px;z-index:99;display:flex;flex-direction:column;" +
    "gap:6px;pointer-events:auto;background:rgba(36,24,17,0.9);border:1px solid #c9a227;" +
    "border-radius:8px;padding:8px;font-family:Rajdhani,sans-serif";
  const cases: { label: string; run: () => void }[] = [
    { label: "Vuelo libre (QA)", run: () => startFreeFlight() },
  ];
  for (const c of cases) {
    const btn = document.createElement("button");
    btn.className = "chip";
    btn.textContent = c.label;
    btn.addEventListener("click", c.run);
    panel.appendChild(btn);
  }
  document.getElementById("ui-root")?.appendChild(panel);
}

// ── Mundo 3D: arranca de inmediato como fondo vivo del menú (patrón Batisfera) ──
const game = new Game3D($("game-canvas") as HTMLCanvasElement);
window.aerostato.game = game;

// ── Consola de latón (F5) + SFX sintetizados ──
const hud = new HUD();
window.aerostato.hud = hud;
let synth: SynthSfx | null = null;

// ══════════════════════════════════════════════════════════════════════════
// El loop de canto (F6 — máquina §7.1)
// ══════════════════════════════════════════════════════════════════════════

const state = new GameState();
window.aerostato.state = state;
const questions = new QuestionMachine();
let dockedString: LanternString | null = null;
let currentTargetMidi = 0;
let referenceMidi = 0;
let playing = false; // partida en curso (real, no vuelo libre)
let pausedGame = false;
let freeFlying = false;
let ghostTimers: number[] = [];
let musicInteractionToken = 0;

async function playReferenceWithMusicPaused(str: LanternString): Promise<void> {
  const token = ++musicInteractionToken;
  await samplePlayer.pausePlaylist("music", MUSIC_FADE_OUT_MS);
  if (
    token !== musicInteractionToken ||
    !playing ||
    pausedGame ||
    dockedString !== str ||
    !state.active
  ) return;
  await samplePlayer.playNote(midiToNote(referenceMidi), str.instrument as Instrument);
}

function resumeMusicAfterSinging(token = ++musicInteractionToken): void {
  if (token !== musicInteractionToken || !playing || dockedString) return;
  samplePlayer.resumePlaylist("music", MUSIC_FADE_IN_MS);
}

function resumeMusicAfterChord(token: number): void {
  window.setTimeout(
    () => resumeMusicAfterSinging(token),
    MUSIC_RESUME_AFTER_CHORD_MS,
  );
}

function stopMusic(): void {
  musicInteractionToken++;
  samplePlayer.stopPlaylist("music");
}

function poolForLayer(layerNum: number): string[] {
  const fams = LAYER_FAMILIES[layerNum] ?? LAYER_FAMILIES[1];
  return CHORD_TYPES.filter((c) => fams.includes(c.family)).map((c) => c.id);
}

// Repaso en capa 5 (§7.3): tras media cuota, 1 de cada 3 cuerdas es "canto del
// pasado" — acorde de CUALQUIER capa anterior. Se marca para anunciar familia.
let reviewCounter = 0;
const reviewQuestions = new WeakSet<object>();

function spawnInfoFor(layerNum: number): SpawnInfo {
  let isReview = false;
  if (
    layerNum === 5 &&
    state.completedInLayer >= state.quota() / 2 &&
    ++reviewCounter % 3 === 0
  ) {
    isReview = true;
    questions.setPool([1, 2, 3, 4].flatMap((l) => poolForLayer(l)));
  } else {
    // Pools incrementales por grupos (§7.3): recién introducidos pesan doble.
    const { pool, fresh } = activePool(layerNum, state.completedInLayer, state.quota());
    questions.setPool(pool, fresh);
  }
  const question = questions.next(settings.register);
  if (isReview) reviewQuestions.add(question);
  return {
    question,
    familyColor: FAMILY_GLOW[question.type.family],
    // "Aleatorio" elige un timbre POR CUERDA (§3.3).
    instrument: resolveInstrument(settings.instrument),
  };
}

function announceName(s: ActiveString): string {
  const base = `${pitchClassName(s.rootMidi, getLang())} · ${chordName(s.type, getLang())}`;
  // El repaso anuncia su familia (§7.3: "la consola lo anuncia con su familia y color").
  const q = dockedString?.question;
  if (q && reviewQuestions.has(q)) {
    const fam = FAMILY_NAMES[s.type.family][getLang()];
    return `${base} · ${fam}`;
  }
  return base;
}

function medallionsFor(s: ActiveString): Medallion[] {
  const color = FAMILY_GLOW[s.type.family];
  return s.type.intervals.map((interval, i) => {
    const st = i < s.litCount ? "lit" : i === s.litCount ? "active" : "off";
    const label =
      st === "lit" || settings.showNames
        ? midiToNote(s.rootMidi + interval)
        : intervalToDegreeLabel(interval, getLang());
    return { label, state: st, color };
  });
}

function clearGhostTimers(): void {
  for (const id of ghostTimers) window.clearTimeout(id);
  ghostTimers = [];
}

/** Amarrarse (click o E). Amarrar otra suelta la anterior sin penalización. */
function dockString(str: LanternString): void {
  if (!playing || pausedGame || str.isDying || dockedString === str) return;
  if (dockedString) {
    dockedString.docked = false;
    dockedString.resetLanterns();
    state.undockSoft();
    pitchDetector?.stopListening();
  }
  dockedString = str;
  str.docked = true;
  game.player.docked = true; // auto-hover: inputs de movimiento ignorados (§7.1)
  synth?.click();

  stringCents = []; // precisión de ESTA cuerda (media de la pasada §7.6)
  const s = state.dock(str.id, str.question.type, str.question.rootMidi, str.multiplier);
  // Nota de referencia: fundamental o cualquier nota del acorde (§2.11).
  referenceMidi =
    settings.refMode === "root"
      ? s.rootMidi
      : s.noteMidis[Math.floor(Math.random() * s.noteMidis.length)];
  void playReferenceWithMusicPaused(str);

  currentTargetMidi = s.noteMidis[0];
  str.setActive(0);
  getPitchDetector().startListening(midiToFrequency(currentTargetMidi));
  hud.setChord(announceName(s), medallionsFor(s));
}

function undockCleanup(): void {
  dockedString = null;
  game.player.docked = false;
  pitchDetector?.stopListening();
  hud.setChord(null, []);
  hud.setWindTimer(null);
}

function replayReference(): void {
  const str = dockedString;
  if (!str || !state.active) return;
  // Re-escucha ILIMITADA, sin penalización (§7.1).
  void playReferenceWithMusicPaused(str);
}

hud.onReference = replayReference;

state.on("lantern", (index, midi, s) => {
  const str = dockedString;
  if (!str) return;
  str.light(index); // enciende + suena su nota + revela nombre (§7.1)
  void samplePlayer.playNote(midiToNote(midi), str.instrument as Instrument);
  if (s.litCount < s.noteMidis.length) {
    currentTargetMidi = s.noteMidis[s.litCount];
    str.setActive(s.litCount);
    getPitchDetector().startListening(midiToFrequency(currentTargetMidi));
    hud.setChord(announceName(s), medallionsFor(s));
  }
});

state.on("completed", (s) => {
  const str = dockedString;
  undockCleanup();
  const musicToken = ++musicInteractionToken;
  // Atlas + medalla de precisión (§7.6): guardar tras CADA cuerda (§7.7).
  if (stringCents.length > 0) {
    const avg = stringCents.reduce((a, b) => a + b, 0) / stringCents.length;
    const medal = medalFor(avg);
    state.addScore(MEDAL_BONUS[medal]); // oro +10, plata +5 (§7.4)
    const res = recordCompleted(s.type.id, state.streak, avg);
    if (res.firstTime || res.improvedCents) medalsThisRun.push(medal);
  }
  samplePlayer.playCorrect();
  if (str) {
    // Acorde completo armónico + rugido + empujón de altitud (§7.1).
    void samplePlayer
      .playChord(s.noteMidis.map(midiToNote), str.instrument as Instrument)
      .then(() => resumeMusicAfterChord(musicToken));
    str.startAscend();
  } else {
    resumeMusicAfterSinging(musicToken);
  }
  game.basket.burst();
  synth?.burnerBurst();
  game.player.addImpulse(GAMEPLAY.completeImpulse);
});

state.on("expired", (s) => {
  const str = dockedString;
  undockCleanup();
  const musicToken = ++musicInteractionToken;
  recordAttempt(s.type.id); // el Atlas registra el intento (§7.1)
  samplePlayer.playIncorrect();
  if (str) {
    // Feedback pedagógico: arpegio FANTASMA de las restantes y acorde completo.
    let delay = 350;
    for (let i = s.litCount; i < s.noteMidis.length; i++) {
      const idx = i;
      ghostTimers.push(
        window.setTimeout(() => {
          str.ghost(idx);
          void samplePlayer.playNote(midiToNote(s.noteMidis[idx]), str.instrument as Instrument);
        }, delay),
      );
      delay += 170;
    }
    ghostTimers.push(
      window.setTimeout(() => {
        void samplePlayer
          .playChord(s.noteMidis.map(midiToNote), str.instrument as Instrument)
          .then(() => resumeMusicAfterChord(musicToken));
        str.startLose();
      }, delay + 300),
    );
  } else {
    resumeMusicAfterSinging(musicToken);
  }
});

state.on("released", () => {
  const str = dockedString;
  undockCleanup();
  str?.resetLanterns(); // la cuerda queda intacta; sin rasgadura (§7.1)
  resumeMusicAfterSinging();
});

state.on("score", (score, streak) => {
  hud.setScore(score);
  hud.setStreak(streak);
});

state.on("timer", (frac) => hud.setWindTimer(frac));

// ── F7: cuotas, esclusas bloqueantes, transición de capa, techo del mundo ──

let startLayerOfRun = 1;
let lastLayerNum = 1;
let maxAltitudeM = 0;
let centsSamples: number[] = [];
let stringCents: number[] = [];
let medalsThisRun: string[] = [];
let transitionTimer = 0;

// Medidor de modo combinado: cuota + recurso (gas/tela) según el modo (§7.4).
let quotaText = "";
let resourceText = "";
function refreshModeMeter(): void {
  hud.setModeText([quotaText, resourceText].filter(Boolean).join(" · "));
}

state.on("quota", (done, quota) => {
  quotaText = `${t("hud.quota")} ${Math.min(done, quota)}/${quota}`;
  refreshModeMeter();
});

let lastGasShown = -1;
state.on("gas", (seconds) => {
  const s = Math.ceil(seconds);
  if (s === lastGasShown) return;
  lastGasShown = s;
  resourceText = `${t("hud.gas")} ${s} s`;
  refreshModeMeter();
});

state.on("fabric", (left) => {
  resourceText = `${t("hud.fabric")} ${"🩹".repeat(Math.max(0, left))}${left <= 0 ? "0" : ""}`;
  refreshModeMeter();
  renderTears(MODES.SURVIVAL.fabric - left);
  if (left < MODES.SURVIVAL.fabric) synth?.tear();
});

state.on("gameOver", (reason) => {
  finishRun(reason === "gas" ? "summary.gasOut" : "summary.fabricOut");
});

// Rasgaduras de tela (Supervivencia): jirones CSS en las esquinas (§6).
function renderTears(count: number): void {
  const wrap = $("tears");
  wrap.innerHTML = "";
  const spots = [
    "top:6%;left:3%;transform:rotate(-14deg)",
    "top:10%;right:4%;transform:rotate(11deg)",
    "top:38%;left:6%;transform:rotate(-5deg)",
  ];
  for (let i = 0; i < Math.min(count, spots.length); i++) {
    const tear = document.createElement("div");
    tear.className = "tear";
    tear.style.cssText = spots[i];
    wrap.appendChild(tear);
  }
}

state.on("layerCleared", (layer) => {
  applyLockState();
  if (layer <= 4) showToast(t("feedback.lockOpen"));
});

/** Esclusa b (tope de la capa b) abierta si la capa b está superada o quedó por
 * debajo de la capa inicial de la partida. Cerrada = clamp de altitud (§5.1). */
function applyLockState(): void {
  for (let b = 1; b <= 4; b++) {
    game.environment.setLockOpen(b, state.isLayerCleared(b) || b < startLayerOfRun);
  }
  const boundary = state.currentLayer;
  const closed =
    boundary <= 4 && !(state.isLayerCleared(boundary) || boundary < startLayerOfRun);
  game.player.altitudeLimit = closed ? LAYERS[boundary - 1].yTop - 1 : null;
}

function showLayerTransition(layerNum: number): void {
  const layer = LAYERS[layerNum - 1];
  const fams = (LAYER_FAMILIES[layerNum] ?? [])
    .map((f) => FAMILY_NAMES[f as keyof typeof FAMILY_NAMES][getLang()])
    .join(" · ");
  $("lt-name").textContent = t(layer.i18nKey);
  $("lt-meters").textContent =
    `${layer.mBottom.toLocaleString("es-MX")} – ${layer.mTop.toLocaleString("es-MX")} m`;
  $("lt-family").textContent = fams;
  const el = $("layer-transition");
  el.classList.remove("hidden");
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => el.classList.add("hidden"), 2500);
}

// Desbloqueo persistente: solo Expedición (§7.4).
function persistUnlock(n: number): void {
  if (state.mode === "EXPEDITION") saveUnlockedLayer(n);
}

function finishRun(reasonKey: string): void {
  playing = false;
  stopMusic();
  clearGhostTimers();
  undockCleanup();
  game.stopAscent();
  synth?.setBurner(0);
  saveBestScore(state.mode, state.score);
  $("summary-reason").textContent = t(reasonKey);
  const avg =
    centsSamples.length > 0
      ? (centsSamples.reduce((a, b) => a + b, 0) / centsSamples.length).toFixed(1)
      : "—";
  const medalEmoji = { gold: "🥇", silver: "🥈", bronze: "🥉" } as Record<string, string>;
  const rows: [string, string][] = [
    [t("summary.score"), String(state.score)],
    [t("summary.strings"), String(state.totalCompleted)],
    [t("summary.bestStreak"), `×${state.bestStreak}`],
    [t("summary.maxAlt"), `${maxAltitudeM.toLocaleString("es-MX")} m`],
    [t("summary.avgCents"), avg === "—" ? avg : `${avg} ¢`],
    [t("summary.medals"), medalsThisRun.length > 0 ? medalsThisRun.map((m) => medalEmoji[m]).join("") : "—"],
  ];
  $("summary-stats").innerHTML = rows
    .map(([k, v]) => `<div class="sum-row"><span>${k}</span><b>${v}</b></div>`)
    .join("");
  showScreen("summary-screen");
}

$("summary-retry").addEventListener("click", () => void startGame());
$("summary-menu").addEventListener("click", () => endGame());

game.onStringTapped = (str) => dockString(str);

// ── Ballena Celeste (§7.5): 1 vez por SESIÓN al llegar a la capa 5 ──
let whaleSpawned = false;
let whaleString: LanternString | null = null;
const whaleBackV = new Vector3();

function spawnWhale(): void {
  whaleSpawned = true;
  game.activateWhale();
  const typeId = ["MAJOR_13", "MINOR_13", "DOMINANT_13"][Math.floor(Math.random() * 3)];
  const type = CHORD_BY_ID[typeId];
  const roots = validRoots(type, settings.register);
  const question = { type, rootMidi: roots[Math.floor(Math.random() * roots.length)] };
  whaleString = new LanternString(
    9999,
    question,
    FAMILY_GLOW.EXT_11_13,
    resolveInstrument(settings.instrument),
    settings.showNames,
    getLang(),
  );
  whaleString.multiplier = 2; // vale ×2 (§7.5)
  game.lanterns.addPersistent(whaleString);
}

game.onAltitude = (meters, y) => {
  hud.setAltitude(meters, layerAtY(y).i18nKey);
  if (!playing || pausedGame) return;
  if (layerAtY(y).num === 5 && !whaleSpawned) spawnWhale();
  maxAltitudeM = Math.max(maxAltitudeM, meters);

  // Cruce de capa: transición 2.5 s, pools nuevos, desbloqueo persistente.
  const ln = layerAtY(y).num;
  if (ln !== lastLayerNum) {
    lastLayerNum = ln;
    state.enterLayer(ln);
    applyLockState();
    if (ln > startLayerOfRun) {
      showLayerTransition(ln);
      persistUnlock(ln);
    }
  }

  // Techo del mundo: 41 000 m (§7.4) → créditos + resumen.
  if (y >= WORLD.topY - 3) finishRun("summary.top");
};

game.onFrame = (dt, elapsed) => {
  const inGame = playing && !pausedGame;
  if (inGame) state.update(dt);

  // La cuerda de la ballena viaja en su lomo; amarrado a ella, el globo la
  // acompaña (§7.5: "ella sigue nadando lento, el globo la acompaña").
  if (whaleString && !whaleString.isDying && game.scenery.whaleActive) {
    whaleString.group.position.copy(game.scenery.whaleBack(whaleBackV));
    if (dockedString === whaleString) {
      game.player.position.addScaledVector(game.scenery.whaleVelocity, dt);
    }
  }

  const listening = inGame && state.active !== null && dockedString !== null;
  const famColor = dockedString ? `#${dockedString.familyColor.getHexString()}` : FAMILY_GLOW.TRIADS;
  const ds = pitchDetector?.getCurrentState() ?? {
    frequency: 0,
    centsOff: 0,
    isOnPitch: false,
    holdProgress: 0,
  };
  hud.renderTuner({
    state: ds,
    listening,
    familyColor: famColor,
    showNames: settings.showNames,
    targetMidi: currentTargetMidi || 57,
  });
  if (listening && dockedString) {
    dockedString.setProgress(ds.holdProgress);
    if (ds.holdProgress >= 1) {
      centsSamples.push(Math.abs(ds.centsOff)); // precisión de la partida (resumen)
      stringCents.push(Math.abs(ds.centsOff)); // precisión de la cuerda (Atlas §7.6)
      state.lanternLit(); // valida la nota sostenida 1.5 s
    }
  }

  const blips = playing || freeFlying ? game.lanterns.blips(game.player.position) : [];
  hud.renderCompass(game.player.yaw, blips, elapsed);

  if (synth) {
    synth.setBurner(Math.max(0, game.player.verticalVelocity / PHYSICS.maxSpeedV));
    synth.setWind(
      Math.min(1, (game.player.position.y / WORLD.topY) * 0.7 + (game.player.speed / PHYSICS.maxSpeedH) * 0.3),
    );
  }
};

// ── Teclas del loop: R re-escucha, E amarre por proximidad, S sostenida suelta ──
let sHoldTimer = 0;
window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  if (!playing || pausedGame) return;
  const k = e.key.toLowerCase();
  if (k === "r") replayReference();
  else if (k === "e" && !dockedString) {
    const near = game.lanterns.nearest(game.player.position);
    if (near && near.dist <= GAMEPLAY.proximityDockDistance) dockString(near.str);
  } else if (k === "s" && dockedString && !e.repeat && sHoldTimer === 0) {
    sHoldTimer = window.setTimeout(() => {
      sHoldTimer = 0;
      state.release(); // válvula anti-atasco vocal (§7.1)
    }, GAMEPLAY.releaseHoldSeconds * 1000);
  }
});
window.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "s" && sHoldTimer) {
    window.clearTimeout(sHoldTimer);
    sHoldTimer = 0;
  }
});

function ensureSynth(): void {
  if (!synth) {
    synth = new SynthSfx(sharedAudioContext());
    synth.start();
  }
  synth.setVolume(settings.volume);
}

// ── INICIAR ASCENSO: gesto de unlock (audio + mic §10) y arranque real ──
async function startGame(): Promise<void> {
  samplePlayer.unlock();
  void samplePlayer.preloadEffects();
  const detector = getPitchDetector();
  try {
    await detector.ensureReady();
  } catch (err) {
    if (err instanceof MicDeniedError) {
      showScreen("mic-denied-screen");
    } else if (err instanceof MicUnsupportedError) {
      showToast("Micrófono no soportado (se requiere HTTPS o localhost)");
    } else {
      throw err;
    }
    return;
  }
  ensureSynth();
  samplePlayer.setVolume(settings.volume);

  clearGhostTimers();
  game.lanterns.reset();
  whaleString = null; // el reset la desmontó; la ballena solo aparece 1 vez/sesión
  game.lanterns.showNames = settings.showNames;
  game.lanterns.lang = getLang();
  game.lanterns.onNeedQuestion = spawnInfoFor;

  const startLayer = selectedMode === "EXPEDITION" ? selectedLayer : 1;
  quotaText = "";
  resourceText = "";
  lastGasShown = -1;
  renderTears(0);
  state.startRun(selectedMode, startLayer);
  startLayerOfRun = startLayer;
  lastLayerNum = startLayer;
  maxAltitudeM = 0;
  centsSamples = [];
  stringCents = [];
  medalsThisRun = [];
  reviewCounter = 0;
  applyLockState();

  playing = true;
  pausedGame = false;
  freeFlying = false;
  undockCleanup();
  game.startAscent(startLayer);
  showScreen("hud");
  samplePlayer.startPlaylist("music", MUSIC_TRACK_URLS, MUSIC_VOLUME_SCALE);
}

function endGame(): void {
  playing = false;
  stopMusic();
  pausedGame = false;
  clearGhostTimers();
  undockCleanup();
  state.setPaused(false);
  game.stopAscent();
  game.lanterns.reset();
  game.lanterns.onNeedQuestion = null;
  synth?.setBurner(0);
  synth?.setWind(0);
  rebuildLayerChips();
  showScreen("menu-screen");
}

// Vuelo libre QA: navegar sin loop de canto (sin mic).
function startFreeFlight(): void {
  freeFlying = true;
  ensureSynth();
  game.startAscent(selectedLayer);
  showScreen("hud");
}

// Esc: pausa (congela temporizador, gas y MIC §16) — o salir del vuelo libre.
game.player.onEscape = () => {
  if (freeFlying) {
    freeFlying = false;
    endGame();
    return;
  }
  if (!playing || pausedGame) return;
  pausedGame = true;
  state.setPaused(true);
  pitchDetector?.stopListening(); // no dejar el hold corriendo en pausa
  game.stopAscent();
  showScreen("pause-screen");
};

$("pause-resume").addEventListener("click", () => {
  if (!pausedGame) return;
  pausedGame = false;
  state.setPaused(false);
  game.player.setEnabled(true);
  if (state.active && dockedString) {
    getPitchDetector().startListening(midiToFrequency(currentTargetMidi));
  }
  showScreen("hud");
});

$("pause-quit").addEventListener("click", () => endGame());

initI18n();
buildMenu();
applyI18n();
buildQaPanel();
showScreen("menu-screen");
