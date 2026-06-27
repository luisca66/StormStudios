import { INSTRUMENTS, type Instrument } from "@/config";
import { STRINGS, strings, switchLang, type Lang } from "@/i18n";
import { INTERVAL_BY_ID, stripOctave, type IntervalDef } from "@/music/core";
import {
  GameController,
  type AppState,
  type GameMode,
  type TrainingType,
} from "@/game/controller";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const ACCIDENTALS = ["♭", "♭♭", "#", "##"];

export function mountUI(root: HTMLElement, controller: GameController): void {
  const t = strings(controller.lang);
  controller.subscribe((state) => {
    root.innerHTML = render(state, controller);
  });

  root.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target || isDisabled(target)) return;
    handleAction(target, controller);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[role="button"][data-action]');
    if (!target || isDisabled(target)) return;
    event.preventDefault();
    handleAction(target, controller);
  });

  window.addEventListener("beforeunload", () => controller.dispose());

  if (!window.isSecureContext) {
    console.info(t.micUnsupported);
  }
}

function handleAction(target: HTMLElement, controller: GameController): void {
  const action = target.dataset.action;
  switch (action) {
    case "language":
      switchLang((target.dataset.lang as Lang) ?? "es");
      break;
    case "duration":
      controller.setDuration(Number(target.dataset.duration));
      break;
    case "mode":
      controller.openMode((target.dataset.mode as GameMode) ?? "classic");
      break;
    case "stats":
      controller.openStats();
      break;
    case "menu":
      controller.openMenu();
      break;
    case "setup":
      controller.openSetup();
      break;
    case "training-type":
      controller.setTrainingType((target.dataset.trainingType as TrainingType) ?? "HYBRID");
      break;
    case "instrument":
      controller.setInstrument((target.dataset.instrument as Instrument) ?? "Piano");
      break;
    case "start-interval":
      controller.startTraining((target.dataset.interval as IntervalDef["id"] | "") ?? "");
      break;
    case "new-question":
      controller.newQuestion();
      break;
    case "repeat-start":
      controller.repeatStartNote();
      break;
    case "note-key":
      controller.inputNoteKey(target.dataset.key ?? "");
      break;
    case "delete-key":
      controller.deleteNoteKey();
      break;
    case "submit-answer":
      void controller.submitAnswer();
      break;
    case "replay":
      controller.startTraining(controller.getState().selectedIntervalId ?? "");
      break;
    case "ask-clear":
      controller.askClearStats();
      break;
    case "cancel-clear":
      controller.cancelClearStats();
      break;
    case "clear-stats":
      controller.clearStats();
      break;
  }
}

function render(state: AppState, controller: GameController): string {
  if (state.screen === "setup") return renderSetup(state, controller);
  if (state.screen === "training") return renderTraining(state, controller);
  if (state.screen === "stats") return renderStats(state, controller);
  return renderMenu(state);
}

function renderMenu(state: AppState): string {
  const t = strings(state.lang);
  return `
    <main class="screen">
      <header class="topline">
        <div class="brand">
          ${logoMarkup()}
          <div>
            <div class="eyebrow">${t.appSub}</div>
            <h1 class="title">${t.appName}</h1>
            <p class="subtitle">${t.appLine}</p>
          </div>
        </div>
        ${languageSwitch(state.lang)}
      </header>

      <section class="mode-list" aria-label="${t.chooseMode}">
        <h2 class="screen-title">${t.chooseMode}</h2>
        ${modeCard("classic", t.classic, t.classicSub)}
        ${modeCard("time", t.time, t.timeSub, durationButtons(state))}
        ${modeCard("survival", t.survival, t.survivalSub)}
        <div class="mode-card stats-button" role="button" tabindex="0" data-action="stats" style="--mode-color:var(--mint)">
          <span class="accent-bar" aria-hidden="true"></span>
          <span class="mode-icon" aria-hidden="true">ST</span>
          <span class="mode-body">
            <span class="mode-title">${t.stats}</span>
            <span class="mode-subtitle">${t.statsSub}</span>
          </span>
          <span class="mode-arrow" aria-hidden="true">›</span>
        </div>
      </section>
    </main>
  `;

  function modeCard(mode: GameMode, title: string, subtitle: string, extra = ""): string {
    return `
      <div class="mode-card" role="button" tabindex="0" data-action="mode" data-mode="${mode}" style="--mode-color:${activeColor(mode)}">
        <span class="accent-bar" aria-hidden="true"></span>
        <span class="mode-icon" aria-hidden="true">${modeIcon(mode)}</span>
        <span class="mode-body">
          <span class="mode-title">${title}</span>
          <span class="mode-subtitle">${subtitle}</span>
          ${extra ? `<span class="mode-extra">${extra}</span>` : ""}
        </span>
        <span class="mode-arrow" aria-hidden="true">›</span>
      </div>
    `;
  }

  function durationButtons(menuState: AppState): string {
    return `
      <span class="duration-row">
        ${[60, 90, 120].map((duration) => `
          <button class="pill ${menuState.selectedDuration === duration ? "on" : ""}" type="button"
            data-action="duration" data-duration="${duration}">${duration}s</button>
        `).join("")}
      </span>
    `;
  }
}

function renderSetup(state: AppState, controller: GameController): string {
  const t = strings(state.lang);
  return `
    <main class="screen">
      <header class="header-row">
        <button class="back-button" type="button" data-action="menu">‹ ${t.back}</button>
        <div>
          <div class="eyebrow">${t.mode}</div>
          <h1 class="screen-title">${controller.modeLabel(state.selectedMode)}</h1>
        </div>
        ${languageSwitch(state.lang)}
      </header>

      <section class="setup-list">
        <div class="setup-section">
          <span class="section-label">${t.practice}</span>
          <div class="segmented">
            ${trainingTypeButton(state, "HYBRID", t.hybrid)}
            ${trainingTypeButton(state, "NOMENCLATURE_ONLY", t.nomenclature)}
          </div>
        </div>

        <div class="setup-section">
          <span class="section-label">${t.instrument}</span>
          <div class="chip-row">
            ${INSTRUMENTS.map((instrument) => `
              <button class="chip ${state.selectedInstrument === instrument ? "on" : ""}" type="button"
                data-action="instrument" data-instrument="${instrument}">${controller.instrumentLabel(instrument)}</button>
            `).join("")}
          </div>
        </div>

        <div class="setup-section">
          <span class="section-label">${t.interval}</span>
          <div class="interval-list">
            ${controller.intervals.map((interval) => intervalRow(controller, interval)).join("")}
            <button class="interval-row" type="button" data-action="start-interval" data-interval="">
              <span>${t.allIntervals}</span>
              <span class="abbr">ALL</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  `;
}

function renderTraining(state: AppState, controller: GameController): string {
  const t = strings(state.lang);
  const session = state.session;
  if (!session) return renderMenu(state);
  const color = activeColor(session.mode);
  if (session.ended) return renderGameOver(state, controller, color);

  return `
    <main class="screen" style="--active-color:${color}">
      <header class="toolbar">
        <button class="back-button" type="button" data-action="setup">‹ ${t.back}</button>
        <div>
          <div class="eyebrow">${controller.modeLabel(session.mode)}</div>
          <h1 class="screen-title">${state.selectedIntervalId ? controller.intervalLabel(INTERVAL_BY_ID[state.selectedIntervalId]) : t.allIntervals}</h1>
        </div>
        <div class="hud">${renderHud(state)}</div>
      </header>

      ${state.trainingType === "HYBRID" && !window.isSecureContext ? `
        <div class="training-panel feedback warn">${t.micUnsupported}</div>
      ` : ""}

      <section class="training-main">
        <div class="training-panel question-card">
          ${renderQuestion(state, controller)}
        </div>

        <div class="training-panel answer-display">
          <span class="answer-note ${state.answer ? "" : "empty"}">${state.answer.replace(/b/g, "♭") || "—"}</span>
        </div>

        <div class="feedback ${state.resultKind}">
          ${state.recording ? recordingMarkup(t.singing) : (state.result.replace(/b/g, "♭") || "&nbsp;")}
        </div>

        <div class="button-row">
          <button class="secondary-button" type="button" data-action="new-question" ${busy(state) ? "disabled" : ""}>${t.new}</button>
          <button class="secondary-button" type="button" data-action="repeat-start"
            ${state.trainingType !== "HYBRID" || !state.current || busy(state) ? "disabled" : ""}>
            ${t.hearNote}
          </button>
        </div>
      </section>

      ${renderKeyboard(state)}
    </main>
  `;
}

function renderGameOver(state: AppState, controller: GameController, color: string): string {
  const t = strings(state.lang);
  const session = state.session;
  if (!session) return "";
  const score = session.mode === "time" ? session.timeScore : session.survivalScore;
  return `
    <main class="screen" style="--active-color:${color}">
      <section class="game-over">
        <div class="eyebrow">${controller.modeLabel(session.mode)}</div>
        <h1 class="screen-title">${session.endReason === "timeout" ? t.timesUp : t.livesDone}</h1>
        <div class="game-over-score">${score}</div>
        <p class="small-muted">${t.finalScore} · ${t.points}</p>
        <div class="button-row" style="justify-content:center;margin-top:8px">
          <button class="secondary-button" type="button" data-action="setup">${t.setup}</button>
          <button class="primary-button" style="width:auto;min-width:170px" type="button" data-action="replay">${t.playAgain}</button>
        </div>
      </section>
    </main>
  `;
}

function renderStats(state: AppState, controller: GameController): string {
  const t = strings(state.lang);
  const entries = Object.entries(state.stats)
    .filter(([, stat]) => stat.total > 0)
    .sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total);
  const total = entries.reduce((sum, [, stat]) => sum + stat.total, 0);
  const correct = entries.reduce((sum, [, stat]) => sum + stat.correct, 0);
  const overall = total > 0 ? Math.round((correct / total) * 100) : null;

  return `
    <main class="screen">
      <header class="header-row">
        <button class="back-button" type="button" data-action="menu">‹ ${t.back}</button>
        <h1 class="screen-title">${t.stats}</h1>
        ${languageSwitch(state.lang)}
      </header>

      <section class="stats-list">
        ${overall === null ? `<div class="empty-state">${t.noStats}</div>` : `
          <div class="stats-card">
            <div class="stat-top">
              <div>
                <span class="section-label">${t.overall}</span>
                <strong class="screen-title">${overall}%</strong>
              </div>
              <span class="stat-count">${correct} / ${total}</span>
            </div>
            <div class="track"><div class="fill" style="--pct:${overall}%;--bar-color:${accuracyColor(overall)}"></div></div>
          </div>
          ${entries.map(([key, stat]) => {
            const percent = Math.round((stat.correct / stat.total) * 100);
            return `
              <div class="stats-card">
                <div class="stat-top">
                  <div>
                    <div class="stat-name">${statLabel(key, state, controller)}</div>
                    <div class="stat-count">${stat.correct} ${t.correctOf} ${stat.total}</div>
                  </div>
                  <div class="stat-pct" style="color:${accuracyColor(percent)}">${percent}%</div>
                </div>
                <div class="track"><div class="fill" style="--pct:${percent}%;--bar-color:${accuracyColor(percent)}"></div></div>
              </div>
            `;
          }).join("")}
          ${state.confirmClear ? confirmClearMarkup(state.lang) : `<button class="danger-button" type="button" data-action="ask-clear">${t.clearStats}</button>`}
        `}
      </section>
    </main>
  `;
}

function renderHud(state: AppState): string {
  const t = strings(state.lang);
  const session = state.session;
  if (!session) return "";
  if (session.mode === "classic") {
    return `
      ${hudChip("P", session.classicQuestions, "var(--aqua)")}
      ${hudChip("E", session.classicErrors, "var(--rose)")}
    `;
  }
  if (session.mode === "time") {
    return `
      ${hudChip(t.timeLeft, `${session.remainingTime}s`, session.remainingTime < 10 ? "var(--rose)" : "var(--gold)")}
      ${hudChip(t.score, session.timeScore, "var(--gold)")}
    `;
  }
  return `
    <span class="hud-chip" style="--hud-color:var(--rose)">
      <span class="hud-label">VID</span>
      <span class="hearts">${[0, 1, 2].map((index) => `<span class="${index >= session.lives ? "lost" : ""}">♥</span>`).join("")}</span>
    </span>
    ${hudChip(t.score, session.survivalScore, "var(--rose)")}
  `;
}

function renderQuestion(state: AppState, controller: GameController): string {
  const t = strings(state.lang);
  if (!state.current) return `<div class="small-muted">${t.pressNew}</div>`;
  const current = state.current;
  return `
    <div class="question-label">
      ${controller.intervalLabel(current.interval)} · ${current.direction === "asc" ? t.asc : t.desc}
    </div>
    <div class="note-row">
      <span class="note-box">${stripOctave(current.startNote)}</span>
      <span class="direction">
        <span class="arrow">${current.direction === "asc" ? "→" : "←"}</span>
        <span class="abbr">${current.interval.abbr}</span>
      </span>
      <span class="note-box empty ${state.flash === "correct" ? "correct" : ""} ${state.flash === "wrong" ? "wrong" : ""}">?</span>
    </div>
  `;
}

function renderKeyboard(state: AppState): string {
  const t = strings(state.lang);
  const disabled = busy(state) || Boolean(state.session?.ended);
  const submitLabel = state.recording ? "..." : state.trainingType === "HYBRID" ? t.record : t.ok;
  return `
    <section class="keyboard-panel">
      <div class="key-row naturals">
        ${LETTERS.map((letter) => `<button class="key white" type="button" data-action="note-key" data-key="${letter}" ${disabled ? "disabled" : ""}>${letter}</button>`).join("")}
      </div>
      <div class="key-row actions">
        ${ACCIDENTALS.map((key) => `<button class="key black" type="button" data-action="note-key" data-key="${key}" ${disabled ? "disabled" : ""}>${key}</button>`).join("")}
        <button class="action-key" style="--action-color:var(--rose)" type="button" data-action="delete-key" ${disabled ? "disabled" : ""} aria-label="${t.delete}">⌫</button>
        <button class="action-key submit ${state.recording ? "recording" : ""}" type="button" data-action="submit-answer"
          ${disabled || !state.answer ? "disabled" : ""}>${submitLabel}</button>
      </div>
    </section>
  `;
}

function trainingTypeButton(state: AppState, id: TrainingType, label: string): string {
  return `
    <button class="chip ${state.trainingType === id ? "on" : ""}" type="button"
      data-action="training-type" data-training-type="${id}">${label}</button>
  `;
}

function intervalRow(controller: GameController, interval: IntervalDef): string {
  return `
    <button class="interval-row" type="button" data-action="start-interval" data-interval="${interval.id}">
      <span>${controller.intervalLabel(interval)}</span>
      <span class="abbr">${interval.abbr}</span>
    </button>
  `;
}

function statLabel(key: string, state: AppState, controller: GameController): string {
  const [intervalId, direction] = key.split(":");
  const interval = INTERVAL_BY_ID[intervalId as IntervalDef["id"]];
  if (!interval) return key;
  return `${controller.intervalLabel(interval)} ${direction === "asc" ? STRINGS[state.lang].ascShort : STRINGS[state.lang].descShort}`;
}

function languageSwitch(lang: Lang): string {
  return `
    <div class="language-switch" aria-label="Language">
      <button class="lang-button ${lang === "es" ? "on" : ""}" type="button" data-action="language" data-lang="es">ES</button>
      <button class="lang-button ${lang === "en" ? "on" : ""}" type="button" data-action="language" data-lang="en">EN</button>
    </div>
  `;
}

function confirmClearMarkup(lang: Lang): string {
  const t = strings(lang);
  return `
    <div class="confirm-panel">
      <p class="small-muted">${t.confirmClear}</p>
      <div class="confirm-row" style="margin-top:10px">
        <button class="secondary-button" type="button" data-action="cancel-clear">${t.cancel}</button>
        <button class="danger-button" type="button" data-action="clear-stats">${t.clear}</button>
      </div>
    </div>
  `;
}

function recordingMarkup(label: string): string {
  return `
    <span class="recording-bars" aria-label="${label}">
      <span></span><span></span><span></span><span></span>
    </span>
    <span>${label}</span>
  `;
}

function hudChip(label: string, value: number | string, color: string): string {
  return `
    <span class="hud-chip" style="--hud-color:${color}">
      <span class="hud-label">${label}</span>
      <span class="hud-value">${value}</span>
    </span>
  `;
}

function logoMarkup(): string {
  return `
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 80 80" role="img">
        <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(103,214,255,0.28)" stroke-width="2" />
        <path d="M18 46 C25 20 32 60 40 34 C48 8 55 58 63 30" fill="none" stroke="#67d6ff" stroke-width="5" stroke-linecap="round" />
        <circle cx="24" cy="44" r="4" fill="#7af0c9" />
        <circle cx="55" cy="38" r="4" fill="#f2b661" />
      </svg>
    </span>
  `;
}

function modeIcon(mode: GameMode): string {
  if (mode === "classic") return "CL";
  if (mode === "time") return "60";
  return "03";
}

function activeColor(mode: GameMode): string {
  if (mode === "classic") return "var(--aqua)";
  if (mode === "time") return "var(--gold)";
  return "var(--rose)";
}

function accuracyColor(percent: number): string {
  if (percent >= 80) return "var(--mint)";
  if (percent >= 50) return "var(--gold)";
  return "var(--rose)";
}

function isDisabled(target: HTMLElement): boolean {
  return target instanceof HTMLButtonElement && target.disabled;
}

function busy(state: AppState): boolean {
  return state.processing || state.recording;
}
