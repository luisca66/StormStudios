import "./styles.css";
import {
  CellData,
  GameController,
  GamePhase,
  GameState,
  LocalStorageScoreRepository,
  WORLDS,
} from "./game";
import { detectLang, getStrings } from "./i18n";
import { startMusic } from "./music";

// La música de Luis: sólo en partida, aleatoria sin repetir, con volumen y silencio.
const music = startMusic();
import { drawAnimatedLogoOnCanvas, renderGameShapeSvg } from "./shapeDrawer";

type ScreenName = "HOME" | "LEVEL_SELECT" | "GAME" | "GAME_OVER";

type CellResultState = "NONE" | "SELECTED" | "CORRECT" | "WRONG" | "MISSED";

const lang = detectLang();
document.documentElement.lang = lang;
const t = getStrings(lang);

const repository = new LocalStorageScoreRepository();
const controller = new GameController({ repository });

const appRoot = document.getElementById("app") as HTMLElement;

let currentScreen: ScreenName = "HOME";
let showInstructionsModal = false;
let showResetConfirmModal = false;
let showExitConfirmModal = false;
let focusedCellIndex = 0;
let keyboardNavigationActive = false;

let logoRafId: number | null = null;
let gridResizeObserver: ResizeObserver | null = null;

// Seguimiento del estado previo para actualizaciones eficientes durante el temporizador
let lastRenderedScreen: ScreenName | null = null;
let lastRenderedPhase: GamePhase | null = null;
let lastRenderedLevel = -1;
let lastRenderedLives = -1;
let lastRenderedGrid: GameState["originalGrid"] | null = null;

function stopLogoAnimation(): void {
  if (logoRafId !== null) {
    cancelAnimationFrame(logoRafId);
    logoRafId = null;
  }
}

function disconnectGridObserver(): void {
  if (gridResizeObserver !== null) {
    gridResizeObserver.disconnect();
    gridResizeObserver = null;
  }
}

function navigateTo(screen: ScreenName): void {
  currentScreen = screen;
  showInstructionsModal = false;
  showResetConfirmModal = false;
  showExitConfirmModal = false;
  renderFull(controller.state);
}

function getCellResultState(state: GameState, index: number): CellResultState {
  if (state.phase === "RESULT") {
    const selected = state.playerSelections.has(index);
    const mutated = state.mutatedIndices.has(index);
    if (selected && mutated) return "CORRECT";
    if (selected && !mutated) return "WRONG";
    if (!selected && mutated) return "MISSED";
    return "NONE";
  }
  if (state.phase === "FINDING" && state.playerSelections.has(index)) {
    return "SELECTED";
  }
  return "NONE";
}

function computeRevealDelay(state: GameState, index: number, resultState: CellResultState): number {
  if (
    resultState !== "CORRECT" &&
    resultState !== "WRONG" &&
    resultState !== "MISSED"
  ) {
    return 0;
  }
  const combined = new Set<number>([
    ...state.playerSelections,
    ...state.mutatedIndices,
  ]);
  const sorted = Array.from(combined).sort((a, b) => a - b);
  const pos = sorted.indexOf(index);
  return pos >= 0 ? pos * 150 : 0;
}

function updateGridCellSize(stageEl: HTMLElement, cols: number, rows: number): void {
  const rect = stageEl.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;

  const gap = cols >= 5 || rows >= 5 ? 5 : 6;
  const padding = 24;
  const availW = Math.max(80, rect.width - padding - (cols - 1) * gap);
  const availH = Math.max(80, rect.height - padding - (rows - 1) * gap);
  const cellSize = Math.max(32, Math.min(Math.floor(availW / cols), Math.floor(availH / rows), 116));

  const gridEl = stageEl.querySelector<HTMLElement>(".game-grid");
  if (gridEl) {
    gridEl.style.setProperty("--cols", String(cols));
    gridEl.style.setProperty("--rows", String(rows));
    gridEl.style.setProperty("--grid-gap", `${gap}px`);
    gridEl.style.setProperty("--cell-size", `${cellSize}px`);
  }
}

function renderHomeScreen(state: GameState): void {
  appRoot.innerHTML = `
    <main class="screen home-screen">
      <canvas id="home-logo-canvas" class="logo-canvas" width="240" height="240" aria-hidden="true"></canvas>
      <h1 class="home-title">${t.appTitle}</h1>
      <p class="home-subtitle">${t.homeSubtitle}</p>

      <button type="button" id="btn-play" class="btn-primary">${t.playButton}</button>
      <button type="button" id="btn-how" class="btn-outlined">${t.howToPlayButton}</button>

      ${
        state.highScore > 0
          ? `<p class="home-best-score">${t.bestScore(state.highScore)}</p>`
          : ""
      }

      <button type="button" id="btn-reset" class="btn-reset">${t.resetProgressButton}</button>
    </main>
    ${renderHomeModals()}
  `;

  const canvas = document.getElementById("home-logo-canvas") as HTMLCanvasElement | null;
  if (canvas) {
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const rotation = reducedMotion ? 15 : ((elapsed % 8000) / 8000) * 360;
        drawAnimatedLogoOnCanvas(ctx, canvas.width, canvas.height, rotation);
        if (!reducedMotion && currentScreen === "HOME") {
          logoRafId = requestAnimationFrame(step);
        }
      };
      step(startTime);
    }
  }

  document.getElementById("btn-play")?.addEventListener("click", () => {
    navigateTo("LEVEL_SELECT");
  });

  document.getElementById("btn-how")?.addEventListener("click", () => {
    showInstructionsModal = true;
    renderFull(controller.state);
  });

  document.getElementById("btn-reset")?.addEventListener("click", () => {
    showResetConfirmModal = true;
    renderFull(controller.state);
  });

  document.getElementById("btn-dismiss-instructions")?.addEventListener("click", () => {
    showInstructionsModal = false;
    renderFull(controller.state);
  });

  document.getElementById("btn-cancel-reset")?.addEventListener("click", () => {
    showResetConfirmModal = false;
    renderFull(controller.state);
  });

  document.getElementById("btn-confirm-reset")?.addEventListener("click", () => {
    controller.resetProgress();
    showResetConfirmModal = false;
    renderFull(controller.state);
  });

  document.querySelector(".modal-backdrop")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      showInstructionsModal = false;
      showResetConfirmModal = false;
      renderFull(controller.state);
    }
  });
}

function renderHomeModals(): string {
  if (showInstructionsModal) {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-how-title">
        <div class="modal-card">
          <h2 id="modal-how-title" class="modal-title">${t.instructionsTitle}</h2>
          <div class="modal-body">
            ${t.instructionsSteps.map((s) => `<p>${s}</p>`).join("")}
            <p><strong>${t.instructionsMutationsTitle}</strong></p>
            <ul class="modal-list">
              ${t.instructionsMutations.map((m) => `<li>${m}</li>`).join("")}
            </ul>
            <p>${t.instructionsFooter}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-dismiss-instructions" class="btn-text">${t.instructionsDismiss}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (showResetConfirmModal) {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-reset-title">
        <div class="modal-card">
          <h2 id="modal-reset-title" class="modal-title">${t.resetDialogTitle}</h2>
          <div class="modal-body">
            <p>${t.resetDialogBody}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-cancel-reset" class="btn-text neutral">${t.resetCancel}</button>
            <button type="button" id="btn-confirm-reset" class="btn-text danger">${t.resetConfirm}</button>
          </div>
        </div>
      </div>
    `;
  }

  return "";
}

function renderLevelSelectScreen(state: GameState): void {
  const worldsMarkup = WORLDS.map((world, idx) => {
    const subtitleText =
      world.subtitle.length > 0 ? t.worldSubtitleMaster : "";
    const levelsMarkup = world.levels
      .map((lvl) => {
        const isCompleted = lvl < state.unlockedLevel;
        const isUnlocked = lvl <= state.unlockedLevel;
        const isLocked = !isUnlocked;

        const cls = [
          "level-btn",
          isCompleted ? "is-completed" : "",
          isLocked ? "is-locked" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return `
          <button
            type="button"
            class="${cls}"
            data-level="${lvl}"
            ${isLocked ? "disabled" : ""}
            aria-label="${t.levelHeader} ${lvl}"
          >
            ${
              isLocked
                ? `<span class="level-lock" aria-hidden="true">&#128274;</span><span class="level-num">${lvl}</span>`
                : `${
                    isCompleted
                      ? `<span class="level-star" aria-hidden="true">&#9733;</span>`
                      : ""
                  }<span class="level-num">${lvl}</span>`
            }
          </button>
        `;
      })
      .join("");

    return `
      <section class="world-section">
        <div class="world-header">
          <span class="world-title">${t.worldLabel(world.worldNumber)}</span>
          <span class="world-grid-label">${world.gridLabel}</span>
          ${
            subtitleText
              ? `<span class="world-subtitle">${subtitleText}</span>`
              : ""
          }
        </div>
        <div class="world-levels-row">
          ${levelsMarkup}
        </div>
        ${idx < WORLDS.length - 1 ? `<div class="world-divider"></div>` : ""}
      </section>
    `;
  }).join("");

  appRoot.innerHTML = `
    <main class="screen">
      <header class="level-select-header">
        <button type="button" id="btn-levels-back" class="icon-btn" aria-label="${t.backAria}">&larr;</button>
        <h1 class="screen-title">${t.levelsTitle}</h1>
      </header>
      ${
        state.highScore > 0
          ? `<p class="levels-best-score">${t.bestScore(state.highScore)}</p>`
          : `<div style="height: 8px"></div>`
      }
      <div class="worlds-list">
        ${worldsMarkup}
      </div>
    </main>
  `;

  document.getElementById("btn-levels-back")?.addEventListener("click", () => {
    navigateTo("HOME");
  });

  appRoot.querySelectorAll<HTMLButtonElement>(".level-btn:not(:disabled)").forEach((btn) => {
    btn.addEventListener("click", () => {
      const level = Number.parseInt(btn.dataset.level ?? "1", 10);
      focusedCellIndex = 0;
      currentScreen = "GAME";
      controller.startLevel(level);
    });
  });
}

function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case "MEMORIZING":
      return t.phaseMemorize;
    case "HIDDEN":
      return t.phaseHidden;
    case "FINDING":
      return t.phaseFind;
    case "RESULT":
      return t.phaseResult;
  }
}

function getPhaseClass(phase: GamePhase): string {
  switch (phase) {
    case "MEMORIZING":
      return "phase-memorizing";
    case "HIDDEN":
      return "phase-hidden";
    case "FINDING":
      return "phase-finding";
    case "RESULT":
      return "phase-result";
  }
}

function renderGameScreen(state: GameState): void {
  const gridToShow: readonly CellData[] =
    state.phase === "MEMORIZING" || state.phase === "HIDDEN"
      ? state.originalGrid
      : state.mutatedGrid;

  const phaseClass = getPhaseClass(state.phase);
  const progress =
    state.memorizationTimeMs > 0
      ? Math.max(0, Math.min(1, state.timeRemainingMs / state.memorizationTimeMs))
      : 0;

  const heartsMarkup = [0, 1, 2]
    .map((idx) => {
      const isActive = idx < state.lives;
      const justLost =
        state.phase === "RESULT" &&
        lastRenderedLives > state.lives &&
        idx >= state.lives &&
        idx < lastRenderedLives;
      const cls = [
        "heart-icon",
        isActive ? "is-active" : "is-inactive",
        justLost ? "just-lost" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<span class="${cls}" aria-hidden="true">&#10084;</span>`;
    })
    .join("");

  // Si está en pausa durante MEMORIZING o FINDING, ocultamos las figuras debajo del modal de pausa
  const hideCells = state.phase === "HIDDEN" || state.isPaused;

  const cellsMarkup = gridToShow
    .map((cell, index) => {
      const resultState = getCellResultState(state, index);
      const revealDelay = computeRevealDelay(state, index, resultState);
      const row = Math.floor(index / state.gridColumns) + 1;
      const col = (index % state.gridColumns) + 1;
      const isSelected = state.playerSelections.has(index);

      const cellClasses = [
        "game-cell",
        resultState === "SELECTED" ? "is-selected" : "",
        resultState === "CORRECT" ? "result-correct" : "",
        resultState === "WRONG" ? "result-wrong" : "",
        resultState === "MISSED" ? "result-missed" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const styleAttr =
        revealDelay > 0 ? ` style="--reveal-delay: ${revealDelay}ms"` : "";

      return `
        <button
          type="button"
          class="${cellClasses}"
          data-cell-index="${index}"
          aria-disabled="${state.phase !== "FINDING" || state.isPaused ? "true" : "false"}"
          aria-label="${t.cellAria(row, col, isSelected)}"
          aria-pressed="${isSelected ? "true" : "false"}"${styleAttr}
        >
          ${!hideCells ? renderGameShapeSvg(cell.shape, cell.color, cell.rotation) : ""}
        </button>
      `;
    })
    .join("");

  appRoot.innerHTML = `
    <main class="screen game-screen">
      <header class="game-topbar">
        <div class="topbar-left">
          <button type="button" id="btn-game-back" class="icon-btn" aria-label="${t.backAria}">&larr;</button>
          <div class="stat-block">
            <span class="stat-label">${t.levelHeader}</span>
            <span class="stat-value-level">${state.level}</span>
          </div>
        </div>

        <div class="topbar-center">
          <div class="hearts-row" aria-label="Lives: ${state.lives}">
            ${heartsMarkup}
          </div>
        </div>

        <div class="topbar-right">
          <button type="button" id="btn-game-pause" class="pause-btn" aria-label="${t.pauseAria}" title="${t.pauseAria}">&#10074;&#10074;</button>
          <div class="stat-block align-end">
            <span class="stat-label">${t.scoreHeader}</span>
            <span class="stat-value-score">${state.score}</span>
          </div>
        </div>
      </header>

      <div class="timer-slot">
        ${
          state.phase === "MEMORIZING"
            ? `<div class="timer-track"><div id="timer-fill" class="timer-fill" style="transform: scaleX(${progress.toFixed(4)})"></div></div>`
            : ""
        }
      </div>

      <div class="phase-label ${phaseClass}">${getPhaseLabel(state.phase)}</div>

      <div id="grid-stage" class="grid-stage ${phaseClass}">
        <div
          class="game-grid ${hideCells ? "is-hidden" : ""}"
          style="--cols: ${state.gridColumns}; --rows: ${state.gridRows};"
        >
          ${cellsMarkup}
        </div>
        ${
          state.phase === "HIDDEN"
            ? `<div class="hidden-dots" aria-hidden="true">...</div>`
            : ""
        }
      </div>

      <footer class="game-bottom">
        ${
          state.phase === "FINDING"
            ? `
              ${state.showHint ? `<p class="hint-text">${t.level1Hint}</p>` : ""}
              <p class="touches-text">${t.remainingTouches(state.remainingTouches)}</p>
              <button
                type="button"
                id="btn-done"
                class="btn-primary btn-done"
                ${state.playerSelections.size === 0 ? "disabled" : ""}
              >${t.doneButton}</button>
              <p class="keyboard-hint">${t.keyboardHint}</p>
            `
            : ""
        }
      </footer>
    </main>
    ${renderGameModals(state)}
  `;

  const stageEl = document.getElementById("grid-stage");
  if (stageEl) {
    updateGridCellSize(stageEl, state.gridColumns, state.gridRows);
    disconnectGridObserver();
    if (typeof ResizeObserver !== "undefined") {
      gridResizeObserver = new ResizeObserver(() => {
        updateGridCellSize(stageEl, state.gridColumns, state.gridRows);
      });
      gridResizeObserver.observe(stageEl);
    }
  }

  document.getElementById("btn-game-back")?.addEventListener("click", () => {
    handleGameBack(state);
  });

  document.getElementById("btn-game-pause")?.addEventListener("click", () => {
    controller.togglePause();
  });

  document.getElementById("btn-done")?.addEventListener("click", () => {
    controller.onDonePressed();
  });

  appRoot.querySelectorAll<HTMLButtonElement>(".game-cell").forEach((cellBtn) => {
    cellBtn.addEventListener("click", () => {
      const idx = Number.parseInt(cellBtn.dataset.cellIndex ?? "0", 10);
      focusedCellIndex = idx;
      controller.onCellTapped(idx);
    });
  });

  if (
    keyboardNavigationActive &&
    !state.isPaused &&
    !showExitConfirmModal &&
    state.phase === "FINDING"
  ) {
    const safeIdx = Math.max(0, Math.min(gridToShow.length - 1, focusedCellIndex));
    const focusedBtn = appRoot.querySelector<HTMLButtonElement>(
      `.game-cell[data-cell-index="${safeIdx}"]`
    );
    focusedBtn?.focus();
  }

  // Eventos de los modales de pausa o salida
  document.getElementById("btn-resume-game")?.addEventListener("click", () => {
    controller.resume();
  });

  document.getElementById("btn-exit-from-pause")?.addEventListener("click", () => {
    controller.stopGame();
    navigateTo("LEVEL_SELECT");
  });

  document.getElementById("btn-cancel-exit")?.addEventListener("click", () => {
    showExitConfirmModal = false;
    controller.resume();
    renderFull(controller.state);
  });

  document.getElementById("btn-confirm-exit")?.addEventListener("click", () => {
    showExitConfirmModal = false;
    controller.stopGame();
    navigateTo("LEVEL_SELECT");
  });
}

function handleGameBack(state: GameState): void {
  if (state.phase === "RESULT") {
    controller.stopGame();
    navigateTo("LEVEL_SELECT");
  } else {
    controller.pause();
    showExitConfirmModal = true;
    renderFull(controller.state);
  }
}

function renderGameModals(state: GameState): string {
  if (showExitConfirmModal) {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-exit-title">
        <div class="modal-card">
          <h2 id="modal-exit-title" class="modal-title">${t.exitDialogTitle}</h2>
          <div class="modal-body">
            <p>${t.exitDialogBody}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-cancel-exit" class="btn-text neutral">${t.exitCancel}</button>
            <button type="button" id="btn-confirm-exit" class="btn-text danger">${t.exitConfirm}</button>
          </div>
        </div>
      </div>
    `;
  }

  if (state.isPaused) {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-pause-title">
        <div class="modal-card">
          <h2 id="modal-pause-title" class="modal-title">${t.pauseDialogTitle}</h2>
          <div class="modal-body">
            <p>${t.pauseDialogBody}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-exit-from-pause" class="btn-text danger">${t.pauseExit}</button>
            <button type="button" id="btn-resume-game" class="btn-text">${t.pauseResume}</button>
          </div>
        </div>
      </div>
    `;
  }

  return "";
}

function renderGameOverScreen(state: GameState): void {
  const isNewRecord = state.score >= state.highScore && state.score > 0;

  appRoot.innerHTML = `
    <main class="screen gameover-screen">
      <h1 class="gameover-title">${t.gameOverTitle}</h1>

      <p class="gameover-label">${t.levelReached}</p>
      <p class="gameover-level-val">${state.level}</p>

      <p class="gameover-label">${t.scoreLabel}</p>
      <p class="gameover-score-val">${state.score}</p>

      <p class="gameover-best">${t.bestLabel(state.highScore)}</p>
      ${
        isNewRecord
          ? `<p class="gameover-new-record">${t.newRecord}</p>`
          : ""
      }

      <div class="gameover-actions">
        <button type="button" id="btn-retry" class="btn-primary">${t.retryButton}</button>
        <button type="button" id="btn-levels" class="btn-surface">${t.levelsButton}</button>
      </div>
    </main>
  `;

  document.getElementById("btn-retry")?.addEventListener("click", () => {
    focusedCellIndex = 0;
    currentScreen = "GAME";
    controller.startLevel(state.level);
  });

  document.getElementById("btn-levels")?.addEventListener("click", () => {
    navigateTo("LEVEL_SELECT");
  });
}

function renderFull(state: GameState): void {
  if (state.isGameOver && currentScreen === "GAME") {
    currentScreen = "GAME_OVER";
  }

  if (currentScreen !== "HOME") {
    stopLogoAnimation();
  }
  if (currentScreen !== "GAME") {
    disconnectGridObserver();
  }

  switch (currentScreen) {
    case "HOME":
      renderHomeScreen(state);
      break;
    case "LEVEL_SELECT":
      renderLevelSelectScreen(state);
      break;
    case "GAME":
      renderGameScreen(state);
      break;
    case "GAME_OVER":
      renderGameOverScreen(state);
      break;
  }

  lastRenderedScreen = currentScreen;
  lastRenderedPhase = state.phase;
  lastRenderedLevel = state.level;
  lastRenderedLives = state.lives;
  lastRenderedGrid = state.originalGrid;
  music.setPlaying(currentScreen === "GAME" && !state.isPaused && !state.isGameOver);
}

// Suscripción al estado del controlador
controller.subscribe((state) => {
  if (state.isGameOver && currentScreen === "GAME") {
    renderFull(state);
    return;
  }

  // Durante la fase MEMORIZING, cuando solo avanza el reloj (timeRemainingMs),
  // actualizamos únicamente la barra de progreso para evitar recrear el DOM cada 50ms.
  if (
    currentScreen === "GAME" &&
    lastRenderedScreen === "GAME" &&
    state.phase === "MEMORIZING" &&
    lastRenderedPhase === "MEMORIZING" &&
    state.level === lastRenderedLevel &&
    // Al empezar un nivel llega primero un estado vacío y luego la cuadrícula: si cambió, hay que dibujarla.
    state.originalGrid === lastRenderedGrid &&
    !state.isPaused &&
    !showExitConfirmModal
  ) {
    const timerFill = document.getElementById("timer-fill");
    if (timerFill && state.memorizationTimeMs > 0) {
      const progress = Math.max(
        0,
        Math.min(1, state.timeRemainingMs / state.memorizationTimeMs)
      );
      timerFill.style.transform = `scaleX(${progress.toFixed(4)})`;
      return;
    }
  }

  renderFull(state);
});

window.addEventListener("pointerdown", () => {
  keyboardNavigationActive = false;
});

// Controles de teclado globales (flechas, Enter/Espacio, P para pausar, Escape)
window.addEventListener("keydown", (event) => {
  const state = controller.state;

  if (event.key === "Escape") {
    if (showInstructionsModal || showResetConfirmModal) {
      showInstructionsModal = false;
      showResetConfirmModal = false;
      renderFull(state);
      return;
    }
    if (currentScreen === "GAME") {
      if (showExitConfirmModal) {
        showExitConfirmModal = false;
        controller.resume();
        renderFull(controller.state);
      } else if (state.isPaused) {
        controller.resume();
      } else {
        handleGameBack(state);
      }
      return;
    }
    if (currentScreen === "LEVEL_SELECT") {
      navigateTo("HOME");
      return;
    }
  }

  if (currentScreen !== "GAME") return;

  // Tecla P para pausar/reanudar
  if (event.key === "p" || event.key === "P") {
    event.preventDefault();
    if (showExitConfirmModal) {
      showExitConfirmModal = false;
      controller.resume();
      renderFull(controller.state);
    } else {
      controller.togglePause();
    }
    return;
  }

  if (state.isPaused || showExitConfirmModal) return;

  // Navegación por la cuadrícula con las flechas del teclado
  const cols = state.gridColumns;
  const rows = state.gridRows;
  const total = cols * rows;
  if (total <= 0) return;

  if (
    event.key === "ArrowRight" ||
    event.key === "ArrowLeft" ||
    event.key === "ArrowDown" ||
    event.key === "ArrowUp"
  ) {
    event.preventDefault();
    keyboardNavigationActive = true;
    let row = Math.floor(focusedCellIndex / cols);
    let col = focusedCellIndex % cols;

    if (event.key === "ArrowRight") col = (col + 1) % cols;
    if (event.key === "ArrowLeft") col = (col - 1 + cols) % cols;
    if (event.key === "ArrowDown") row = (row + 1) % rows;
    if (event.key === "ArrowUp") row = (row - 1 + rows) % rows;

    focusedCellIndex = row * cols + col;
    const targetBtn = appRoot.querySelector<HTMLButtonElement>(
      `.game-cell[data-cell-index="${focusedCellIndex}"]`
    );
    targetBtn?.focus();
    return;
  }

  // Enter o Espacio para elegir la celda activa cuando el foco no está ya en un botón
  if (
    (event.key === "Enter" || event.key === " ") &&
    state.phase === "FINDING"
  ) {
    keyboardNavigationActive = true;
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body || active === appRoot) {
      event.preventDefault();
      controller.onCellTapped(focusedCellIndex);
    }
  }
});

// Pausa automática si la pestaña pierde visibilidad durante una partida
document.addEventListener("visibilitychange", () => {
  if (document.hidden && currentScreen === "GAME") {
    controller.pause();
  }
});

