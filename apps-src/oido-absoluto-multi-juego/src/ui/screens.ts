import { GameStateManager, Note } from "@/game/state";
import { COPY, GameCopy, getLocale, INSTRUMENTS } from "@/i18n";

export function mountUI(
  root: HTMLElement, 
  stateManager: GameStateManager, 
  onAnswerSelected: (isCorrect: boolean) => void,
  onResetChallenge: () => void,
  triggerSpawn: () => void
): void {
  const copy = COPY[getLocale()];
  
  // Re-render UI on state updates
  stateManager.subscribe((state) => {
    root.innerHTML = render(state, stateManager, copy);
    
    // Bind Volume Slider dynamically
    const volSlider = root.querySelector(".volume-slider") as HTMLInputElement;
    if (volSlider) {
      volSlider.addEventListener("input", (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        stateManager.updateVolume(val);
      });
    }
  });

  // Global Click listener for data-actions
  root.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    
    if (action === "select-level") {
      const id = parseInt(target.dataset.id || "1", 10);
      stateManager.selectLevel(id);
    } 
    else if (action === "select-instrument") {
      const inst = target.dataset.id || "Piano";
      stateManager.selectInstrument(inst);
    } 
    else if (action === "select-group") {
      const idx = parseInt(target.dataset.id || "0", 10);
      stateManager.selectNoteGroup(idx);
    } 
    else if (action === "confirm-warmup") {
      stateManager.confirmWarmup();
      triggerSpawn(); // Spawn first note target in 3D
    } 
    else if (action === "warmup-note") {
      const idx = parseInt(target.dataset.index || "0", 10);
      const oct = parseInt(target.dataset.octave || "3", 10);
      stateManager["audio"].playNote(stateManager.getState().selectedInstrument, idx, oct);
    } 
    else if (action === "answer-note") {
      const idx = parseInt(target.dataset.index || "0", 10);
      const oct = parseInt(target.dataset.octave || "3", 10);
      
      const isCorrect = stateManager.checkAnswer(idx, oct);
      onAnswerSelected(isCorrect);
      
      // Trigger Toast notification
      const toast = document.getElementById("feedback-toast");
      if (toast) {
        toast.className = "feedback-toast show";
        const icon = document.getElementById("feedback-icon")!;
        const text = document.getElementById("feedback-text")!;
        const sub = document.getElementById("feedback-sub")!;
        
        if (isCorrect) {
          toast.style.setProperty("--border-color", "var(--mint)");
          icon.textContent = "✅";
          text.textContent = copy.correct;
          text.style.color = "var(--mint)";
          sub.textContent = copy.correctSub;
        } else {
          toast.style.setProperty("--border-color", "var(--rose)");
          icon.textContent = "❌";
          text.textContent = copy.wrong;
          text.style.color = "var(--rose)";
          sub.textContent = copy.wrongSub;
        }
        
        // Auto-fadeout toast after 1.8s
        setTimeout(() => {
          toast.className = "feedback-toast";
          if (isCorrect) {
            triggerSpawn(); // Spawn new note
          } else {
            onResetChallenge(); // Teleport player and note
          }
        }, 1800);
      }
    } 
    else if (action === "menu") {
      stateManager.backToMenu();
    } 
    else if (action === "advance") {
      stateManager.advanceLevel();
    }
  });
}

function render(state: any, stateManager: GameStateManager, copy: GameCopy): string {
  if (state.activeScreen === "menu") {
    return renderMenu(state, copy);
  }
  if (state.activeScreen === "note-selection") {
    return renderNoteSelection(state, stateManager, copy);
  }
  if (state.activeScreen === "warmup") {
    return renderWarmup(state, stateManager, copy);
  }
  if (state.activeScreen === "gameplay") {
    return renderGameplayHUD(state, stateManager, copy);
  }
  if (state.activeScreen === "victory") {
    return renderVictory(state, copy);
  }
  return "";
}

function renderMenu(state: any, copy: GameCopy): string {
  const colors = ["var(--mint)", "var(--aqua)", "var(--indigo)", "var(--gold)", "var(--purple)"];
  const icons = ["🌾", "🌊", "🌌", "🐊", "🦄"];

  return `
    <main class="screen">
      <header class="topline">
        <div class="brand">
          <span class="mark">🎵</span>
          <div>
            <div class="eyebrow">${copy.eyebrow}</div>
            <h1 class="title">${copy.appTitle}</h1>
            <p class="subtitle">${copy.appSubtitle}</p>
          </div>
        </div>
      </header>

      <section class="mode-list">
        <h2 class="section-label" style="margin-bottom: 4px;">${copy.selectLevel}</h2>
        ${[1, 2, 3, 4, 5].map((lvl) => {
          const levelCopy = copy.levels[lvl - 1];
          return `
            <div class="mode-card" data-action="select-level" data-id="${lvl}" style="--card-color: ${colors[lvl - 1]}">
              <span class="accent-bar"></span>
              <span class="mode-icon">${icons[lvl - 1]}</span>
              <span class="mode-body">
                <span class="mode-title">${levelCopy.name}</span>
                <span class="mode-subtitle">${levelCopy.menuSubtitle}</span>
              </span>
              <span class="mode-arrow">›</span>
            </div>
          `;
        }).join("")}
      </section>

      <section class="setup-section" style="margin-top: 10px;">
        <span class="section-label">${copy.instrumentTone}</span>
        <div class="chip-row">
          ${INSTRUMENTS.map((inst) => `
            <button class="chip ${state.selectedInstrument === inst ? "on" : ""}" data-action="select-instrument" data-id="${inst}">
              ${copy.instruments[inst]}
            </button>
          `).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderNoteSelection(state: any, stateManager: GameStateManager, copy: GameCopy): string {
  const levelConfig = stateManager.levels[state.currentLevel];
  const levelCopy = copy.levels[state.currentLevel - 1];

  return `
    <main class="screen">
      <header class="header-row">
        <button class="secondary-button" style="padding: 6px 12px; font-size: 0.88rem;" data-action="menu">‹ ${copy.back}</button>
        <div style="text-align: right;">
          <div class="eyebrow">${copy.step1}</div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--aqua);">${levelCopy.name}</h2>
        </div>
      </header>

      <h1 class="title" style="font-size: 1.8rem; margin: 10px 0;">${copy.noteGroup}</h1>
      <p class="subtitle" style="margin-bottom: 12px;">${copy.chooseGroup}</p>

      <section class="mode-list">
        ${levelConfig.groups.map((group, idx) => `
          <div class="mode-card" data-action="select-group" data-id="${idx}" style="--card-color: var(--gold); min-height: 80px;">
            <span class="accent-bar"></span>
            <span class="mode-icon">🎹</span>
            <span class="mode-body">
              <span class="mode-title" style="font-family: var(--font-mono); font-size: 1.15rem;">
                ${levelConfig.groupLabels[idx]}
              </span>
            </span>
            <span class="mode-arrow">›</span>
          </div>
        `).join("")}
      </section>
    </main>
  `;
}

function renderWarmup(state: any, stateManager: GameStateManager, copy: GameCopy): string {
  const levelConfig = stateManager.levels[state.currentLevel];
  const levelCopy = copy.levels[state.currentLevel - 1];

  return `
    <main class="screen">
      <header class="header-row">
        <button class="secondary-button" style="padding: 6px 12px; font-size: 0.88rem;" data-action="select-level" data-id="${state.currentLevel}">‹ ${copy.back}</button>
        <div style="text-align: right;">
          <div class="eyebrow">${copy.step2}</div>
          <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--gold);">${levelCopy.name}</h2>
        </div>
      </header>

      <h1 class="title" style="font-size: 1.8rem; margin: 10px 0;">${copy.warmupTitle}</h1>
      <p class="subtitle" style="margin-bottom: 10px;">${copy.warmupCopy}</p>

      <div class="keyboard-row">
        ${state.selectedNotes.map((note: Note) => {
          const noteName = stateManager.noteNames[note.note_index];
          return `
            <button class="key-btn" data-action="warmup-note" data-index="${note.note_index}" data-octave="${note.octave}">
              <span>${noteName}</span>
              <span style="font-size: 0.65rem; opacity: 0.5; margin-top: 4px;">${copy.octave} ${note.octave}</span>
            </button>
          `;
        }).join("")}
      </div>

      <button class="primary-button" style="margin-top: 15px;" data-action="confirm-warmup">
        ${copy.startGame}
      </button>
    </main>
  `;
}

function renderGameplayHUD(state: any, stateManager: GameStateManager, copy: GameCopy): string {
  const levelName = copy.levels[state.currentLevel - 1].name;
  const instructions = copy.instructions[state.currentLevel - 1];

  // Draw notes selector keyboard inside the bottom answer panel
  let answerMarkup = "";
  if (state.currentChallenge) {
    answerMarkup = `
      <div class="answer-panel">
        <div class="eyebrow" style="text-align: center; color: var(--gold);">${copy.heardQuestion}</div>
        <div class="answer-grid">
          ${state.selectedNotes.map((note: Note) => {
            const noteName = stateManager.noteNames[note.note_index];
            return `
              <button class="answer-btn" data-action="answer-note" data-index="${note.note_index}" data-octave="${note.octave}">
                ${noteName}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  return `
    <div class="hud-wrapper">
      <div class="hud-top">
        <div style="display: flex; gap: 12px;">
          <div class="hud-card">
            <span class="hud-label">${copy.streak}</span>
            <span class="hud-value"><span class="accent">${state.streak}</span> / ${state.maxStreakToUnlock}</span>
          </div>
          <div class="hud-card">
            <span class="hud-label">${copy.hits}</span>
            <span class="hud-value">${state.score}</span>
          </div>
          <div class="hud-card" style="align-items: center; justify-content: center; opacity: 0.85;">
            <span class="hud-label">${levelName}</span>
            <span style="font-size: 0.88rem; font-weight: bold; margin-top: 2px;">${copy.levelShort} ${state.currentLevel}</span>
          </div>
        </div>
        
        <div class="hud-instruction">${instructions}</div>
      </div>

      <div class="hud-bottom">
        ${answerMarkup}

        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <div class="volume-control">
            <span>🔊</span>
            <input class="volume-slider" type="range" min="0" max="1" step="0.02" value="${state.volume}" />
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="secondary-button" style="padding: 8px 14px; font-size: 0.85rem;" data-action="menu">
              ${copy.exitToMenu}
            </button>
          </div>
        </div>
      </div>
      
      <!-- Toast feedback notifier -->
      <div id="feedback-toast" class="feedback-toast">
        <div id="feedback-icon" class="feedback-icon">✅</div>
        <div id="feedback-text" class="feedback-text">${copy.correct}</div>
        <div id="feedback-sub" style="font-size: 0.9rem; color: var(--muted);">${copy.initialToastSub}</div>
      </div>

      <!-- 2D Canvas for Search Radar -->
      <canvas id="radar-canvas" width="144" height="144"></canvas>
    </div>
  `;
}

function renderVictory(state: any, copy: GameCopy): string {
  return `
    <main class="screen" style="text-align: center; gap: 24px; max-width: 500px;">
      <div>
        <span style="font-size: 4.5rem;">🏆</span>
        <h1 class="title" style="color: var(--gold); margin-top: 10px;">${copy.victoryTitle}</h1>
        <p class="subtitle" style="font-size: 1.1rem; margin-top: 6px;">${copy.victoryBody}</p>
      </div>

      <div style="padding: 16px; background: rgba(255,255,255,0.02); border-radius: var(--radius); border: 1px solid var(--border);">
        <div class="eyebrow">${copy.totalScore}</div>
        <div style="font-size: 3rem; font-weight: 800; color: var(--ink); margin-top: 4px;">
          ${state.score} ${copy.hitsLower}
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
        <button class="primary-button" data-action="advance">
          ${copy.nextLevel}
        </button>
        <button class="secondary-button" data-action="menu">
          ${copy.mainMenu}
        </button>
      </div>
    </main>
  `;
}
