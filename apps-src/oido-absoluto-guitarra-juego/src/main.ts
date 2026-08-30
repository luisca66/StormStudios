import "./styles.css";
import { GuitarAudio } from "./audio";
import {
  GUITAR_STRINGS,
  LEVELS,
  PITCHES,
  type GuitarSample,
  type Pitch,
  type StringId,
  pickSample,
  samplesFor,
} from "./catalog";
import { GuitarWorld } from "./world";
import { ProgressRepository, type AnswerTally } from "./progress";

type Screen = "menu" | "groups" | "warmup" | "gameplay" | "victory" | "stats";
type Feedback = { kind: "neutral" | "correct" | "wrong" | "gate"; title: string; detail: string } | null;

const appElement = document.querySelector<HTMLDivElement>("#app");
const canvasElement = document.querySelector<HTMLCanvasElement>("#world");
if (!appElement || !canvasElement) throw new Error("No se encontró la raíz del prototipo");
const app: HTMLDivElement = appElement;
const canvas: HTMLCanvasElement = canvasElement;

const audio = new GuitarAudio();
const selectedStrings = new Set<StringId>(GUITAR_STRINGS.map((string) => string.id));
const QA_MODE = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qa") === "1";
const TARGET_STREAK = QA_MODE ? 3 : 20;
const progressRepository = new ProgressRepository(QA_MODE ? "resonancia-guitar-progress-qa-v1" : "resonancia-guitar-progress-v1");
let progress = progressRepository.get();

let screen: Screen = "menu";
let levelIndex = 0;
let groupIndex = 0;
let streak = 0;
let hits = 0;
let mistakes = 0;
let resolving = false;
let queuedSample: GuitarSample | null = null;
let currentChallenge: GuitarSample | null = null;
let previousSample: GuitarSample | null = null;
let feedback: Feedback = null;

const world = new GuitarWorld(canvas, {
  onNodeReached: () => void hearChallenge(),
  onPortalEntered: completeLevel,
});

world.setGameplay(false);
render();

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "toggle-string") toggleString(target.dataset.string as StringId);
  if (action === "choose-level") openGroups(Number(target.dataset.level));
  if (action === "choose-group") openWarmup(Number(target.dataset.group));
  if (action === "warmup-note") void playWarmup(target.dataset.pitch as Pitch);
  if (action === "start") startGame();
  if (action === "answer") void answer(target.dataset.pitch as Pitch);
  if (action === "back-menu") backToMenu();
  if (action === "back-groups") openGroups(levelIndex);
  if (action === "replay") void replayChallenge();
  if (action === "next-level") advanceLevel();
  if (action === "restart") startGame();
  if (action === "stats") openStats();
  if (action === "qa-reach") world.debugReachNode();
  if (action === "qa-correct") void answerQaCorrect();
  if (action === "qa-wrong") void answerQaWrong();
  if (action === "qa-portal") world.debugEnterPortal();
});

app.addEventListener("input", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.matches("[data-volume]")) audio.setVolume(Number(target.value));
});

const endVirtualControl = (event: PointerEvent) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-control]");
  if (target) world.setVirtualControl(target.dataset.control ?? "", false);
};

app.addEventListener("pointerdown", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-control]");
  if (!target) return;
  event.preventDefault();
  target.setPointerCapture(event.pointerId);
  world.setVirtualControl(target.dataset.control ?? "", true);
});
app.addEventListener("pointerup", endVirtualControl);
app.addEventListener("pointercancel", endVirtualControl);

window.setInterval(updateTelemetry, 90);

function toggleString(stringId: StringId) {
  if (selectedStrings.has(stringId)) {
    if (selectedStrings.size === 1) return;
    selectedStrings.delete(stringId);
  } else {
    selectedStrings.add(stringId);
  }
  render();
}

function openGroups(nextLevelIndex: number) {
  audio.stop();
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, nextLevelIndex));
  groupIndex = 0;
  screen = "groups";
  world.setGameplay(false);
  render();
}

function openWarmup(nextGroupIndex: number) {
  groupIndex = nextGroupIndex;
  screen = "warmup";
  const pool = currentPool();
  audio.preload(pool);
  render();
}

async function playWarmup(pitch: Pitch) {
  const options = currentPool().filter((sample) => sample.pitch === pitch);
  const sample = options[Math.floor(Math.random() * options.length)];
  if (sample) await audio.playSample(sample);
}

function startGame() {
  audio.stop();
  streak = 0;
  hits = 0;
  mistakes = 0;
  resolving = false;
  queuedSample = null;
  currentChallenge = null;
  previousSample = null;
  feedback = { kind: "neutral", title: "Busca la primera resonancia", detail: "La brújula señala el nodo más cercano." };
  screen = "gameplay";
  progress = progressRepository.startSession(LEVELS[levelIndex].id);
  world.setGameplay(true);
  world.resetPlayer();
  world.setMovement(true);
  nextNode();
}

function nextNode() {
  const sample = pickSample(currentPool(), previousSample);
  if (!sample) return;
  queuedSample = sample;
  previousSample = sample;
  currentChallenge = null;
  resolving = false;
  feedback = null;
  world.spawnNode();
  world.setMovement(true);
  render();
}

async function hearChallenge() {
  if (!queuedSample || screen !== "gameplay" || resolving) return;
  currentChallenge = queuedSample;
  feedback = { kind: "neutral", title: "La cuerda respondió", detail: "Identifica la altura que acabas de escuchar." };
  world.setMovement(false);
  render();
  const played = await audio.playSample(currentChallenge);
  if (!played) {
    feedback = { kind: "wrong", title: "No se pudo reproducir la muestra", detail: "Revisa la conexión e inténtalo otra vez." };
    render();
  }
}

async function replayChallenge() {
  if (currentChallenge && !resolving) await audio.playSample(currentChallenge);
}

async function answer(pitch: Pitch) {
  if (!currentChallenge || resolving) return;
  resolving = true;
  const sample = currentChallenge;
  const correct = sample.pitch === pitch;

  if (correct) {
    streak += 1;
    hits += 1;
    progress = progressRepository.recordAnswer(sample, true, LEVELS[levelIndex].id, streak);
    world.resolveCorrect();
    void audio.playCorrect();
    feedback = {
      kind: streak >= TARGET_STREAK ? "gate" : "correct",
      title: streak >= TARGET_STREAK ? "La roseta está abierta" : `Correcto · ${sample.pitch}`,
      detail: streak >= TARGET_STREAK
        ? "Las seis cuerdas están en resonancia. Entra al portal."
        : `${sample.noteName} · ${sample.stringLabel} · traste ${sample.fret}`,
    };
    currentChallenge = null;
    render();

    if (streak >= TARGET_STREAK) {
      world.unlockPortal();
      resolving = false;
    } else {
      window.setTimeout(nextNode, 760);
    }
    return;
  }

  mistakes += 1;
  streak = 0;
  progress = progressRepository.recordAnswer(sample, false, LEVELS[levelIndex].id, streak);
  void audio.playWrong();
  feedback = {
    kind: "wrong",
    title: `Era ${sample.pitch}`,
    detail: `${sample.noteName} · ${sample.stringLabel}. Volverás a encontrar la misma resonancia.`,
  };
  currentChallenge = null;
  render();
  window.setTimeout(() => {
    resolving = false;
    feedback = { kind: "neutral", title: "La resonancia cambió de lugar", detail: "Encuéntrala y escucha de nuevo." };
    world.resolveWrong();
    world.setMovement(true);
    render();
  }, 1350);
}

async function answerQaCorrect() {
  if (QA_MODE && currentChallenge) await answer(currentChallenge.pitch);
}

async function answerQaWrong() {
  if (!QA_MODE || !currentChallenge) return;
  const wrongPitch = selectedPitches().find((pitch) => pitch !== currentChallenge?.pitch);
  if (wrongPitch) await answer(wrongPitch);
}

function completeLevel() {
  audio.stop();
  progress = progressRepository.completeLevel(LEVELS[levelIndex].id);
  screen = "victory";
  world.setMovement(false);
  feedback = null;
  render();
}

function openStats() {
  audio.stop();
  progress = progressRepository.get();
  screen = "stats";
  world.setGameplay(false);
  render();
}

function advanceLevel() {
  levelIndex = (levelIndex + 1) % LEVELS.length;
  groupIndex = 0;
  screen = "groups";
  world.setGameplay(false);
  render();
}

function backToMenu() {
  audio.stop();
  screen = "menu";
  feedback = null;
  currentChallenge = null;
  queuedSample = null;
  world.setGameplay(false);
  render();
}

function selectedPitches() {
  return LEVELS[levelIndex].groups[groupIndex];
}

function currentPool() {
  return samplesFor(selectedStrings, selectedPitches());
}

function updateTelemetry() {
  if (screen !== "gameplay") return;
  const telemetry = world.getTelemetry();
  const distance = document.querySelector<HTMLElement>("[data-distance]");
  const needle = document.querySelector<HTMLElement>("[data-needle]");
  const label = document.querySelector<HTMLElement>("[data-destination]");
  if (distance) distance.textContent = `${telemetry.distance} m`;
  if (needle) needle.style.transform = `rotate(${telemetry.bearing}rad)`;
  if (label) label.textContent = telemetry.destination === "portal" ? "Roseta" : "Resonancia";
}

function render() {
  document.body.dataset.screen = screen;
  if (screen === "menu") app.innerHTML = renderMenu();
  if (screen === "groups") app.innerHTML = renderGroups();
  if (screen === "warmup") app.innerHTML = renderWarmup();
  if (screen === "gameplay") app.innerHTML = renderGameplay();
  if (screen === "victory") app.innerHTML = renderVictory();
  if (screen === "stats") app.innerHTML = renderStats();
}

function renderMenu() {
  return `
    <main class="menu-layout">
      <section class="identity-panel">
        <div class="string-signature" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
        <p class="kicker">Oído absoluto · Guitarra clásica</p>
        <h1>Resonancia</h1>
        <p class="intro">Recorre un instrumento convertido en territorio. Encuentra cada vibración, reconoce su altura y despierta la roseta.</p>
        <div class="rule-copy">
          <span>La misión</span>
          <strong>${TARGET_STREAK} aciertos consecutivos</strong>
          <p>Un error reinicia la racha, pero te devuelve la misma nota para volver a escucharla.</p>
        </div>
        <button class="ledger-link" data-action="stats">
          <span>Bitácora del luthier</span>
          <strong>${progress.total ? `${accuracy(progress)}% de precisión` : "Sin sesiones todavía"}</strong>
          <i>→</i>
        </button>
      </section>

      <section class="setup-panel">
        <header class="section-head">
          <span>01</span>
          <div><p>Fuente sonora</p><h2>Elige las cuerdas</h2></div>
        </header>
        <div class="string-picker">
          ${GUITAR_STRINGS.map((string) => `
            <button class="string-choice ${selectedStrings.has(string.id) ? "is-on" : ""}" data-action="toggle-string" data-string="${string.id}" aria-pressed="${selectedStrings.has(string.id)}">
              <span>${string.shortLabel}</span><strong>${string.label}</strong>
            </button>
          `).join("")}
        </div>

        <header class="section-head level-head">
          <span>02</span>
          <div><p>Ruta auditiva</p><h2>Entra al instrumento</h2></div>
        </header>
        <div class="level-list">
          ${LEVELS.map((level, index) => `
            ${(() => {
              const record = progress.levels[String(level.id)];
              const progressLabel = record?.completions
                ? `Completado ×${record.completions}`
                : record?.sessions
                  ? `Mejor racha ${record.bestStreak}`
                  : level.place;
              return `
            <button class="level-row" data-action="choose-level" data-level="${index}" style="--level-accent:${level.accent}">
              <span class="level-number">${String(level.id).padStart(2, "0")}</span>
              <span><strong>${level.name}</strong><small>${progressLabel}</small></span>
              ${record?.completions ? `<b class="completion-mark" aria-label="Nivel completado">◆</b>` : `<i>↗</i>`}
            </button>
              `;
            })()}
          `).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderGroups() {
  const level = LEVELS[levelIndex];
  return `
    <main class="screen-panel compact-panel">
      <button class="text-button" data-action="back-menu">← Volver al inicio</button>
      <div class="chapter-mark" style="--level-accent:${level.accent}"><span>${String(level.id).padStart(2, "0")}</span></div>
      <p class="kicker">${level.place}</p>
      <h1>${level.name}</h1>
      <p class="intro narrow">${level.description} Elige una familia para comenzar.</p>
      <div class="group-list">
        ${level.groups.map((group, index) => {
          const available = samplesFor(selectedStrings, group).length;
          return `
            <button class="group-row" data-action="choose-group" data-group="${index}" ${available < 2 ? "disabled" : ""}>
              <span class="pitch-set">${group.join(" · ")}</span>
              <span class="sample-count">${available} muestras</span>
              <i>→</i>
            </button>
          `;
        }).join("")}
      </div>
    </main>
  `;
}

function renderWarmup() {
  const level = LEVELS[levelIndex];
  const pitches = selectedPitches();
  return `
    <main class="screen-panel warmup-panel">
      <button class="text-button" data-action="back-groups">← Cambiar familia</button>
      <p class="kicker">Calentamiento coclear</p>
      <h1>Escucha antes de caminar</h1>
      <p class="intro narrow">Pulsa cada altura. La muestra cambia de cuerda para que memorices la nota, no una única digitación.</p>
      <div class="warmup-notes">
        ${pitches.map((pitch, index) => `
          <button data-action="warmup-note" data-pitch="${pitch}" style="--delay:${index * 35}ms">
            <span>${pitch}</span><small>escuchar</small>
          </button>
        `).join("")}
      </div>
      <div class="warmup-meta">
        <span>${pitches.length} alturas</span><span>${selectedStrings.size} cuerdas activas</span><span>${currentPool().length} muestras</span>
      </div>
      <button class="primary-action" data-action="start">Entrar al diapasón <span>→</span></button>
    </main>
  `;
}

function renderGameplay() {
  const level = LEVELS[levelIndex];
  const pitches = selectedPitches();
  const progress = Math.min(100, (streak / TARGET_STREAK) * 100);
  return `
    <main class="game-hud">
      <div class="hud-top">
        <section class="mission-strip">
          <button class="exit-button" data-action="back-menu" aria-label="Salir al menú">×</button>
          <div><span>Nivel ${level.id}</span><strong>${level.name}</strong></div>
        </section>
        <section class="streak-meter" style="--progress:${progress}%">
          <div><span>Racha</span><strong>${streak}<small>/${TARGET_STREAK}</small></strong></div>
          <i><b></b></i>
        </section>
        <section class="session-numbers">
          <div><span>Aciertos</span><strong>${hits}</strong></div>
          <div><span>Errores</span><strong>${mistakes}</strong></div>
        </section>
      </div>

      <aside class="compass-card">
        <div class="compass-face"><i data-needle>↑</i><span></span></div>
        <div><span data-destination>Resonancia</span><strong data-distance>— m</strong></div>
      </aside>

      ${feedback ? `
        <section class="feedback ${feedback.kind}">
          <i></i><div><strong>${feedback.title}</strong><span>${feedback.detail}</span></div>
        </section>
      ` : ""}

      ${currentChallenge ? `
        <section class="answer-dock">
          <div class="answer-title"><span>¿Qué nota escuchaste?</span><button data-action="replay">↻ Repetir</button></div>
          <div class="answer-grid">
            ${pitches.map((pitch) => `<button data-action="answer" data-pitch="${pitch}" ${resolving ? "disabled" : ""}>${pitch}</button>`).join("")}
          </div>
        </section>
      ` : ""}

      <div class="mobile-controls ${currentChallenge ? "is-paused" : ""}" aria-label="Controles táctiles">
        <div class="turn-controls">
          <button data-control="left" aria-label="Girar a la izquierda">↶</button>
          <button data-control="right" aria-label="Girar a la derecha">↷</button>
        </div>
        <button class="forward-control" data-control="forward">Avanzar</button>
      </div>

      <div class="desktop-help"><kbd>W</kbd> o <kbd>espacio</kbd> avanzar · <kbd>A</kbd><kbd>D</kbd> girar</div>
      <label class="volume-control"><span>Vol.</span><input data-volume type="range" min="0" max="1" step="0.02" value="${audio.getVolume()}"></label>
      ${QA_MODE ? `
        <aside class="qa-dock" aria-label="Verificación local">
          <span>QA local</span>
          <button data-action="qa-reach">Llegar al nodo</button>
          <button data-action="qa-correct" ${currentChallenge ? "" : "disabled"}>Acierto</button>
          <button data-action="qa-wrong" ${currentChallenge ? "" : "disabled"}>Error</button>
          <button data-action="qa-portal" ${streak >= TARGET_STREAK ? "" : "disabled"}>Entrar al portal</button>
        </aside>
      ` : ""}
    </main>
  `;
}

function renderVictory() {
  const level = LEVELS[levelIndex];
  const levelRecord = progress.levels[String(level.id)];
  return `
    <main class="screen-panel victory-panel">
      <div class="victory-rosette" aria-hidden="true"><i></i><i></i><i></i><span>${TARGET_STREAK}</span></div>
      <p class="kicker">Resonancia completa</p>
      <h1>${level.name} vuelve a sonar</h1>
      <p class="intro narrow">Reconociste ${TARGET_STREAK === 20 ? "veinte" : TARGET_STREAK} alturas consecutivas y activaste las seis cuerdas.</p>
      <div class="victory-stats"><span><small>Aciertos</small>${hits}</span><span><small>Errores</small>${mistakes}</span><span><small>Racha</small>${TARGET_STREAK}</span></div>
      <p class="record-note">Mejor racha histórica en esta zona: <strong>${levelRecord?.bestStreak ?? TARGET_STREAK}</strong> · Completada <strong>${levelRecord?.completions ?? 1}</strong> ${levelRecord?.completions === 1 ? "vez" : "veces"}</p>
      <div class="victory-actions">
        <button class="secondary-action" data-action="restart">Repetir nivel</button>
        <button class="primary-action" data-action="next-level">Siguiente zona <span>→</span></button>
      </div>
      <button class="text-button centered" data-action="back-menu">Volver al inicio</button>
    </main>
  `;
}

function renderStats() {
  const levelRecords = LEVELS.map((level) => ({ level, record: progress.levels[String(level.id)] }));
  const weakestPitch = PITCHES
    .map((pitch) => ({ pitch, tally: progress.pitches[pitch] }))
    .filter((entry): entry is { pitch: Pitch; tally: AnswerTally } => Boolean(entry.tally?.total))
    .sort((a, b) => accuracy(a.tally) - accuracy(b.tally))[0];

  return `
    <main class="screen-panel stats-panel">
      <button class="text-button" data-action="back-menu">← Volver al inicio</button>
      <p class="kicker">Bitácora del luthier</p>
      <h1>Las huellas de tu oído</h1>
      ${progress.total === 0 ? `
        <section class="ledger-empty">
          <div class="empty-strings" aria-hidden="true">${Array.from({ length: 6 }, () => "<i></i>").join("")}</div>
          <h2>La bitácora está en blanco</h2>
          <p>Las respuestas aparecerán aquí después de tu primera sesión.</p>
          <button class="primary-action" data-action="back-menu">Elegir una ruta <span>→</span></button>
        </section>
      ` : `
        <section class="ledger-summary">
          <div><small>Precisión total</small><strong>${accuracy(progress)}<sup>%</sup></strong><span>${progress.correct} de ${progress.total}</span></div>
          <div><small>Mejor racha</small><strong>${progress.bestStreak}</strong><span>${progress.sessions} ${progress.sessions === 1 ? "sesión" : "sesiones"}</span></div>
          <div><small>Altura a reforzar</small><strong>${weakestPitch?.pitch ?? "—"}</strong><span>${weakestPitch ? `${accuracy(weakestPitch.tally)}% de precisión` : "Sin datos"}</span></div>
        </section>

        <section class="ledger-section">
          <header><span>Alturas</span><p>Precisión sin importar cuerda u octava</p></header>
          <div class="pitch-ledger">
            ${PITCHES.map((pitch) => renderTallyCell(pitch, progress.pitches[pitch])).join("")}
          </div>
        </section>

        <section class="ledger-section">
          <header><span>Seis cuerdas</span><p>Cómo cambia tu reconocimiento con el color de cada cuerda</p></header>
          <div class="string-ledger">
            ${GUITAR_STRINGS.map((string) => {
              const tally = progress.strings[string.id];
              const percent = tally ? accuracy(tally) : 0;
              return `<article style="--accuracy:${percent}%">
                <div><span>${string.shortLabel}</span><strong>${string.label}</strong></div>
                <i><b></b></i>
                <small>${tally?.total ? `${percent}% · ${tally.correct}/${tally.total}` : "Sin respuestas"}</small>
              </article>`;
            }).join("")}
          </div>
        </section>

        <section class="ledger-section route-ledger">
          <header><span>Recorrido</span><p>Sesiones y mejores rachas por zona</p></header>
          ${levelRecords.map(({ level, record }) => `<article>
            <span>${String(level.id).padStart(2, "0")}</span>
            <div><strong>${level.name}</strong><small>${record?.sessions ?? 0} ${record?.sessions === 1 ? "sesión" : "sesiones"} · mejor racha ${record?.bestStreak ?? 0}</small></div>
            <b>${record?.completions ? `${record.completions} ◆` : "—"}</b>
          </article>`).join("")}
        </section>
      `}
    </main>
  `;
}

function renderTallyCell(label: string, tally?: AnswerTally) {
  const percent = tally ? accuracy(tally) : 0;
  return `<article style="--accuracy:${percent}%" class="${tally?.total ? "has-data" : ""}">
    <strong>${label}</strong><span>${tally?.total ? `${percent}%` : "—"}</span><i><b></b></i>
  </article>`;
}

function accuracy(tally: AnswerTally) {
  return tally.total ? Math.round((tally.correct / tally.total) * 100) : 0;
}
