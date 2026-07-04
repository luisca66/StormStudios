import "./styles.css";
import { AudioEngine } from "@/audio/engine";
import { MicPitchDetector } from "@/audio/pitch";
import { GameController, GameState } from "@/game/controller";
import { GameEngine } from "@/game/engine";
import { LEVEL_INTERVALS } from "@/music/core";
import { t, translateFeedback } from "@/i18n";

// DOM references
let appDiv: HTMLDivElement;
let audioEngine: AudioEngine;
let pitchDetector: MicPitchDetector;
let controller: GameController;
let gameEngine: GameEngine;

// Audio parameters
const LEVEL_COLORS: Record<number, string> = {
  1: "#00ffcc", 2: "#00a2ff", 3: "#ffaa00", 4: "#ff3b30",
  5: "#ffcc00", 6: "#33ccff", 7: "#ffff00", 8: "#cc33ff",
  9: "#3366ff", 10: "#ff3333", 11: "#ffffff", 12: "#999999", 13: "#ff80df"
};

const INSTRUMENTS = ["Piano", "Cello", "Corno", "Coro", "Fagot", "Aleatorio"];
const DIFFICULTIES = ["Lento", "Normal", "Rapido", "Maestro"];

// Current spelled answer state
let currentAnswer = "";

function init() {
  appDiv = document.getElementById("app") as HTMLDivElement;
  if (!appDiv) return;

  // Initialize Engines
  audioEngine = new AudioEngine();
  pitchDetector = new MicPitchDetector(audioEngine.context());
  controller = new GameController(audioEngine, pitchDetector);

  // Mount UI Shell Structure
  appDiv.innerHTML = `
    <!-- MAIN MENU SCREEN -->
    <div id="screen-menu" class="screen" style="display: none;">
      <header class="topline">
        <div class="logo-section">
          <h1>Vocal Arcade</h1>
          <p>${t.subtitle}</p>
        </div>
      </header>

      <div class="setup-panel">
        <div class="panel-card">
          <div class="panel-title">${t.selectLevel}</div>
          <div class="level-grid" id="level-selection-grid"></div>
        </div>

        <div class="options-row">
          <div class="panel-card custom-select">
            <div class="panel-title">${t.instrument}</div>
            <div class="selector-buttons" id="instrument-selector"></div>
          </div>

          <div class="panel-card custom-select">
            <div class="panel-title">${t.enemySpeed}</div>
            <div class="selector-buttons" id="difficulty-selector"></div>
          </div>
        </div>

        <div class="panel-card mic-card">
          <div class="mic-status-indicator">
            <span class="status-dot" id="mic-status-dot"></span>
            <span id="mic-status-text">${t.micUncalibrated}</span>
          </div>
          <button class="selector-btn" id="btn-calibrate-mic" style="flex: 0; min-width: 140px;">${t.calibrateMic}</button>
        </div>

        <button class="btn-primary" id="btn-start-game" disabled>
          ${t.startGame}
        </button>
      </div>
    </div>

    <!-- GAMEPLAY SCREEN -->
    <div id="screen-game" class="screen" style="display: none;">
      <header class="game-header">
        <button class="btn-back" id="btn-game-back">${t.btnMenu}</button>
        <div class="logo-section">
          <h2 id="hud-level-name" style="font-size: 1.15rem; font-weight: 800; color: var(--aqua);">${t.level} 1</h2>
        </div>
        <div class="hud-scores">
          <div class="hud-item">
            <div class="hud-label">${t.points}</div>
            <div class="hud-value" id="hud-score">0</div>
          </div>
          <div class="hud-item">
            <div class="hud-label">${t.streak}</div>
            <div class="hud-value gold" id="hud-streak">0</div>
          </div>
          <div class="hud-item" style="text-align: left; margin-left: 8px;">
            <div class="hud-label">${t.shields}</div>
            <div class="hud-strikes" id="hud-strikes-container"></div>
          </div>
        </div>
      </header>

      <!-- Big Prominent Challenge Card -->
      <div class="panel-card challenge-display-card" id="challenge-display-card">
        <div class="challenge-title-label">${t.activeChallenge}</div>
        <div class="challenge-main-row">
          <span class="challenge-note" id="challenge-note">C3</span>
          <span class="challenge-arrow" id="challenge-arrow">↑</span>
          <span class="challenge-interval" id="challenge-interval">5ª Justa</span>
        </div>
      </div>

      <!-- Game Canvas Viewport -->
      <div class="game-viewport">
        <canvas id="game-canvas" class="game-canvas"></canvas>
        
        <!-- Modal popup inside viewport for Game Over / Level Complete -->
        <div id="game-popup" class="viewport-modal" style="display: none;">
          <h2 class="modal-title" id="popup-title">${t.gameOver}</h2>
          <div class="modal-body" id="popup-body">${t.defeatText}</div>
          <div class="modal-score" id="popup-score">0</div>
          <div style="font-size: 0.75rem; color: var(--muted); margin-bottom: 20px; text-transform: uppercase;">${t.finalScore}</div>
          <div class="modal-buttons">
            <button class="modal-btn" id="btn-popup-restart">${t.playAgain}</button>
            <button class="modal-btn secondary" id="btn-popup-menu">${t.mainMenu}</button>
          </div>
        </div>
      </div>

      <!-- Real-Time Vocal Tuner HUD -->
      <div class="panel-card tuning-hud">
        <div class="tuner-bar-wrapper">
          <!-- Tuning slider -->
          <div class="tuner-slider-bg">
            <div class="tuner-marker-center"></div>
            <div class="tuner-indicator" id="tuner-indicator" style="left: 50%;"></div>
          </div>
          <!-- Weapon Charging fill bar -->
          <div class="charge-meter">
            <div class="charge-fill" id="charge-fill" style="width: 0%;"></div>
            <div class="charge-text" id="charge-text">${t.unarmed}</div>
          </div>
        </div>
      </div>

      <!-- Answer Input Panel -->
      <div class="panel-card input-panel">
        <div class="answer-input-box empty" id="answer-display">—</div>
        <button class="btn-confirm" id="btn-confirm-answer" disabled>${t.fire}</button>
      </div>

      <!-- Virtual Keyboard for Note Spelling -->
      <div class="virtual-keyboard">
        <div class="kbd-row">
          <button class="kbd-btn" data-key="A">A</button>
          <button class="kbd-btn" data-key="B">B</button>
          <button class="kbd-btn" data-key="C">C</button>
          <button class="kbd-btn" data-key="D">D</button>
          <button class="kbd-btn" data-key="E">E</button>
          <button class="kbd-btn" data-key="F">F</button>
          <button class="kbd-btn" data-key="G">G</button>
        </div>
        <div class="kbd-row">
          <button class="kbd-btn" data-key="b">♭</button>
          <button class="kbd-btn" data-key="bb">♭♭</button>
          <button class="kbd-btn" data-key="#">♯</button>
          <button class="kbd-btn" data-key="##">𝄪</button>
          <button class="kbd-btn wide" data-key="DELETE">${t.delete}</button>
        </div>
      </div>

      <!-- Status/Feedback Ticker -->
      <div class="feedback-ticker" id="feedback-ticker">${t.getReady}</div>
    </div>
  `;

  // Initialize Game Graphics Engine
  const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
  gameEngine = new GameEngine(canvas, controller);

  // Setup UI event bindings
  setupUIHandlers();

  // Subscribe to controller state changes
  controller.subscribe(renderUI);

  // Default screen is Menu
  controller.setScreen("menu");

  // Keep checking tuner values in real-time when in gameplay screen
  setInterval(updateTunerHUD, 40);
}

function setupUIHandlers() {
  // Level selector grid generator
  const grid = document.getElementById("level-selection-grid")!;
  for (let i = 1; i <= 13; i++) { // All 13 levels are fully active
    const btn = document.createElement("button");
    btn.className = "level-btn";
    btn.style.setProperty("--accent-color", LEVEL_COLORS[i]);
    btn.dataset.level = i.toString();
    btn.innerHTML = `
      <span class="num">${t.level} ${i.toString().padStart(2, "0")}</span>
      <span class="name">${getIntervalDisplay(LEVEL_INTERVALS[i] ?? "5J")}</span>
      <span class="status">${t.ready}</span>
    `;
    btn.addEventListener("click", () => {
      controller.selectLevel(i);
    });
    grid.appendChild(btn);
  }

  // Instrument selector
  const instSelector = document.getElementById("instrument-selector")!;
  INSTRUMENTS.forEach(inst => {
    const btn = document.createElement("button");
    btn.className = "selector-btn";
    btn.innerText = t.instruments[inst as keyof typeof t.instruments] ?? inst;
    btn.dataset.inst = inst;
    btn.addEventListener("click", () => {
      controller.selectInstrument(inst);
    });
    instSelector.appendChild(btn);
  });

  // Difficulty selector
  const diffSelector = document.getElementById("difficulty-selector")!;
  DIFFICULTIES.forEach(diff => {
    const btn = document.createElement("button");
    btn.className = "selector-btn";
    btn.innerText = t.difficulties[diff as keyof typeof t.difficulties] ?? diff;
    btn.dataset.diff = diff;
    btn.addEventListener("click", () => {
      controller.selectDifficulty(diff);
    });
    diffSelector.appendChild(btn);
  });

  // Calibrate mic
  document.getElementById("btn-calibrate-mic")!.addEventListener("click", async () => {
    await controller.initMic();
  });

  // Start game
  document.getElementById("btn-start-game")!.addEventListener("click", () => {
    controller.startGame();
  });

  // Back to menu from gameplay
  document.getElementById("btn-game-back")!.addEventListener("click", () => {
    if (confirm(t.confirmExit)) {
      controller.setScreen("menu");
    }
  });

  // Virtual keyboard buttons
  document.querySelectorAll(".virtual-keyboard .kbd-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const key = (e.currentTarget as HTMLButtonElement).dataset.key!;
      handleVirtualKeyInput(key);
    });
  });

  // Confirm button
  const confirmBtn = document.getElementById("btn-confirm-answer") as HTMLButtonElement;
  confirmBtn.addEventListener("click", () => {
    submitAnswer();
  });

  // Also support physical keyboard inputs (only Backspace/Delete and Enter)
  window.addEventListener("keydown", (e) => {
    const state = controller.getState();
    if (state.screen !== "game" || state.isGameOver || state.isLevelComplete) return;

    if (e.key === "Backspace" || e.key === "Delete") {
      handleVirtualKeyInput("DELETE");
    } else if (e.key === "Enter") {
      submitAnswer();
    }
  });

  // Popup overlay buttons
  document.getElementById("btn-popup-restart")!.addEventListener("click", () => {
    controller.startGame();
  });
  document.getElementById("btn-popup-menu")!.addEventListener("click", () => {
    controller.setScreen("menu");
  });
}

function handleVirtualKeyInput(key: string) {
  const state = controller.getState();
  if (state.isGameOver || state.isLevelComplete || state.missileInFlight) return;

  if (key === "DELETE") {
    currentAnswer = "";
  } else if (["C", "D", "E", "F", "G", "A", "B"].includes(key)) {
    // If typing a note letter, replace the old note base letter
    if (currentAnswer.length > 0 && !["#", "b"].includes(key)) {
      const acc = currentAnswer.slice(1);
      currentAnswer = key + acc;
    } else {
      currentAnswer = key;
    }
  } else if (["#", "##", "b", "bb"].includes(key)) {
    // Typing an accidental, append to note letter base
    if (currentAnswer.length > 0) {
      const base = currentAnswer.charAt(0);
      currentAnswer = base + key;
    }
  }

  // Update display
  updateAnswerDisplay();
}

function updateAnswerDisplay() {
  const display = document.getElementById("answer-display")!;
  if (currentAnswer.length > 0) {
    display.classList.remove("empty");
    display.innerText = currentAnswer.replace(/b/g, "♭").replace(/#/g, "♯");
  } else {
    display.classList.add("empty");
    display.innerText = "—";
  }
}

function submitAnswer() {
  if (currentAnswer.length === 0) return;
  controller.submitAnswer(currentAnswer);
  
  // Clear answer box on correct submission, keep it on wrong so they can edit
  const state = controller.getState();
  if (state.missileInFlight) {
    currentAnswer = "";
    updateAnswerDisplay();
  }
}

function renderUI(state: GameState) {
  const menuScreen = document.getElementById("screen-menu")!;
  const gameScreen = document.getElementById("screen-game")!;

  if (state.screen === "menu") {
    menuScreen.style.display = "flex";
    gameScreen.style.display = "none";
    gameEngine.stop();

    // Render Menu states
    // Level selection list active highlighting
    document.querySelectorAll("#level-selection-grid .level-btn").forEach(btn => {
      const lvl = parseInt((btn as HTMLButtonElement).dataset.level!);
      if (lvl === state.selectedLevel) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });

    // Instrument chips highlighting
    document.querySelectorAll("#instrument-selector .selector-btn").forEach(btn => {
      const inst = (btn as HTMLButtonElement).dataset.inst!;
      if (inst === state.selectedInstrument) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Difficulty chips highlighting
    document.querySelectorAll("#difficulty-selector .selector-btn").forEach(btn => {
      const diff = (btn as HTMLButtonElement).dataset.diff!;
      if (diff === state.difficulty) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    // Mic status and Start game button enabling
    const statusDot = document.getElementById("mic-status-dot")!;
    const statusText = document.getElementById("mic-status-text")!;
    const startBtn = document.getElementById("btn-start-game") as HTMLButtonElement;

    if (state.micError) {
      statusDot.className = "status-dot";
      statusText.innerText = translateFeedback(state.micError);
      startBtn.disabled = true;
    } else if (state.isLoadingMic) {
      statusDot.className = "status-dot";
      statusText.innerText = t.micConnecting;
      startBtn.disabled = true;
    } else {
      // Check if mic worklet exists
      const ready = (pitchDetector as any).worklet !== null;
      if (ready) {
        statusDot.className = "status-dot ok";
        statusText.innerText = t.micReady;
        startBtn.disabled = false;
      } else {
        statusDot.className = "status-dot";
        statusText.innerText = t.micRequired;
        startBtn.disabled = true;
      }
    }

  } else if (state.screen === "game") {
    menuScreen.style.display = "none";
    gameScreen.style.display = "flex";

    // Start canvas game loop if not already running
    if (!(gameEngine as any).animationId) {
      gameEngine.start();
      currentAnswer = "";
      updateAnswerDisplay();
    }

    // Render Hud header info
    const levelIntervalKey = LEVEL_INTERVALS[state.selectedLevel] ?? "5J";
    document.getElementById("hud-level-name")!.innerText =
      `${t.level} ${state.selectedLevel} — ${getIntervalDisplay(levelIntervalKey)}`;
    
    const noteEl = document.getElementById("challenge-note")!;
    const arrowEl = document.getElementById("challenge-arrow")!;
    const intervalEl = document.getElementById("challenge-interval")!;

    if (state.currentChallenge) {
      const ch = state.currentChallenge;
      const isUp = ch.direction === 1;
      
      noteEl.innerText = ch.rootDisplay.replace(/b/g, "♭").replace(/#/g, "♯");
      arrowEl.innerText = isUp ? "↑" : "↓";
      arrowEl.className = `challenge-arrow ${isUp ? "up" : "down"}`;
      
      const intervalKey = ch.intervalKey ?? LEVEL_INTERVALS[state.selectedLevel] ?? "5J";
      intervalEl.innerText = getIntervalDisplay(intervalKey);
    } else {
      noteEl.innerText = "—";
      arrowEl.innerText = "•";
      arrowEl.className = "challenge-arrow";
      intervalEl.innerText = t.waiting;
    }

    document.getElementById("hud-score")!.innerText = state.score.toString();
    document.getElementById("hud-streak")!.innerText = state.streak.toString();

    // Render strikes (hearts/escudos)
    const strikesContainer = document.getElementById("hud-strikes-container")!;
    strikesContainer.innerHTML = "";
    for (let i = 0; i < state.maxStrikes; i++) {
      const dot = document.createElement("div");
      dot.className = `strike-dot ${i < state.strikes ? "active" : ""}`;
      strikesContainer.appendChild(dot);
    }

    // Confirm button enabling
    const confirmBtn = document.getElementById("btn-confirm-answer") as HTMLButtonElement;
    confirmBtn.disabled = !state.missileCharged || state.missileInFlight;

    // Feedback message ticker
    const ticker = document.getElementById("feedback-ticker")!;
    ticker.innerText = translateFeedback(state.feedbackMessage || "");
    ticker.className = `feedback-ticker ${state.feedbackKind || ""}`;

    // Game Over / Victory Modal popup overlays
    const popup = document.getElementById("game-popup")!;
    const popupTitle = document.getElementById("popup-title")!;
    const popupBody = document.getElementById("popup-body")!;
    const popupScore = document.getElementById("popup-score")!;

    if (state.isGameOver) {
      popup.style.display = "flex";
      popupTitle.className = "modal-title defeat";
      popupTitle.innerText = t.gameOver;
      popupBody.innerText = t.defeatText;
      popupScore.innerText = state.score.toString();
    } else if (state.isLevelComplete) {
      popup.style.display = "flex";
      popupTitle.className = "modal-title victory";
      popupTitle.innerText = t.victory;
      popupBody.innerText = t.victoryBody(getIntervalDisplay(LEVEL_INTERVALS[state.selectedLevel] ?? "5J"));
      popupScore.innerText = state.score.toString();
    } else {
      popup.style.display = "none";
    }
  }
}

function updateTunerHUD() {
  const state = controller.getState();
  if (state.screen !== "game" || state.isGameOver || state.isLevelComplete) return;

  const micState = pitchDetector.getCurrentState();

  // Update Slider indicator position (centsOff from -50 to +50 -> 0% to 100% left)
  const indicator = document.getElementById("tuner-indicator")!;
  if (micState.frequency > 0) {
    // Clamp centsOff to [-50, 50]
    const centsClamped = Math.max(-50, Math.min(50, micState.centsOff));
    // Map to percentage [0, 100]
    const leftPercentage = ((centsClamped + 50) / 100) * 100;
    indicator.style.left = `${leftPercentage}%`;
    
    if (micState.isOnPitch) {
      indicator.classList.add("locked");
    } else {
      indicator.classList.remove("locked");
    }
  } else {
    indicator.style.left = "50%";
    indicator.classList.remove("locked");
  }

  // 3. Update Weapon Charge Meter
  const fill = document.getElementById("charge-fill")!;
  const txt = document.getElementById("charge-text")!;
  
  fill.style.width = `${state.pitchHoldTime * 100}%`;
  
  if (state.missileInFlight) {
    txt.innerText = t.missileInFlight;
  } else if (state.missileCharged) {
    txt.innerText = t.readyToFire;
  } else if (state.pitchHoldTime > 0) {
    txt.innerText = `${t.charging} ${Math.round(state.pitchHoldTime * 100)}%`;
  } else {
    txt.innerText = t.chargeEmpty;
  }
}



function getIntervalDisplay(key: string): string {
  return t.intervals[key as keyof typeof t.intervals] ?? key;
}

// Start app
window.addEventListener("DOMContentLoaded", init);
