import "./styles.css";
import { AssetAudioPlayer } from "./audio-player";
import {
  allSamples,
  allUniqueNoteNames,
  answerOptions,
  compareFullNotes,
  noteBase,
  sampleId,
  stringOrder,
} from "./catalog";
import { GuitarNoteSelector } from "./note-selector";
import { StatsRepository } from "./stats-repository";
import type { FeedbackState, GameMode, GuitarNoteSample, NoteStat, ScreenName } from "./types";

type Locale = "es" | "en";

type Copy = {
  modeLabels: Record<GameMode, string>;
  modeBadges: Record<GameMode, string>;
  stringLabels: Record<string, string>;
  back: string;
  stats: string;
  timeAttackDurationLabel: string;
  noteSelection: string;
  all: string;
  clear: string;
  start: string;
  remove: string;
  choose: string;
  newNote: string;
  volume: string;
  time: string;
  score: string;
  lives: string;
  streak: string;
  accuracy: string;
  session: string;
  reset: string;
  noAnswersYet: string;
  timeUp: string;
  gameOver: string;
  playAgain: string;
  history: string;
  clearStats: string;
  emptyStats: string;
  ready: string;
  pressNewNote: string;
  whatNote: string;
  cannotLoad: (note: string) => string;
  correct: (note: string) => string;
  incorrect: (note: string) => string;
  sessionReset: string;
  gameOverScore: (score: number) => string;
  timeUpScore: (score: number) => string;
  classicTitle: string;
  livesTitle: (lives: number) => string;
};

const STRINGS: Record<Locale, Copy> = {
  es: {
    modeLabels: {
      classic: "Entrenamiento clásico",
      timeAttack: "Modo contrarreloj",
      survival: "Modo supervivencia",
    },
    modeBadges: {
      classic: "Precisión",
      timeAttack: "Velocidad",
      survival: "Presión",
    },
    stringLabels: {
      "Cuerda E (grave)": "Cuerda E (grave)",
      "Cuerda A": "Cuerda A",
      "Cuerda D": "Cuerda D",
      "Cuerda G": "Cuerda G",
      "Cuerda B": "Cuerda B",
      "Cuerda E (aguda)": "Cuerda E (aguda)",
    },
    back: "Volver",
    stats: "Estadísticas",
    timeAttackDurationLabel: "Duración contrarreloj",
    noteSelection: "Selección de notas",
    all: "Todas",
    clear: "Limpiar",
    start: "Iniciar",
    remove: "Quitar",
    choose: "Elegir",
    newNote: "Nueva nota",
    volume: "Volumen",
    time: "Tiempo",
    score: "Puntuación",
    lives: "Vidas",
    streak: "Racha",
    accuracy: "Precisión",
    session: "Sesión",
    reset: "Reiniciar",
    noAnswersYet: "Sin respuestas todavía",
    timeUp: "Tiempo agotado",
    gameOver: "Juego terminado",
    playAgain: "Jugar otra vez",
    history: "Historial",
    clearStats: "Borrar estadísticas",
    emptyStats: "Todavía no hay respuestas guardadas.",
    ready: "Listo",
    pressNewNote: "Presiona Nueva nota.",
    whatNote: "¿Cuál es la nota?",
    cannotLoad: (note) => `No se pudo cargar ${note}.`,
    correct: (note) => `Correcto. Era ${note}.`,
    incorrect: (note) => `Incorrecto. Era ${note}.`,
    sessionReset: "Sesión reiniciada.",
    gameOverScore: (score) => `Juego terminado. Puntuación: ${score}.`,
    timeUpScore: (score) => `Tiempo agotado. Puntuación final: ${score}.`,
    classicTitle: "Sesión clásica",
    livesTitle: (lives) => `${lives} vidas`,
  },
  en: {
    modeLabels: {
      classic: "Classic training",
      timeAttack: "Time attack",
      survival: "Survival mode",
    },
    modeBadges: {
      classic: "Accuracy",
      timeAttack: "Speed",
      survival: "Pressure",
    },
    stringLabels: {
      "Cuerda E (grave)": "Low E string",
      "Cuerda A": "A string",
      "Cuerda D": "D string",
      "Cuerda G": "G string",
      "Cuerda B": "B string",
      "Cuerda E (aguda)": "High E string",
    },
    back: "Back",
    stats: "Stats",
    timeAttackDurationLabel: "Time attack duration",
    noteSelection: "Note selection",
    all: "All",
    clear: "Clear",
    start: "Start",
    remove: "Remove",
    choose: "Choose",
    newNote: "New note",
    volume: "Volume",
    time: "Time",
    score: "Score",
    lives: "Lives",
    streak: "Streak",
    accuracy: "Accuracy",
    session: "Session",
    reset: "Reset",
    noAnswersYet: "No answers yet",
    timeUp: "Time up",
    gameOver: "Game over",
    playAgain: "Play again",
    history: "History",
    clearStats: "Clear stats",
    emptyStats: "No saved answers yet.",
    ready: "Ready",
    pressNewNote: "Press New note.",
    whatNote: "Which note is it?",
    cannotLoad: (note) => `Could not load ${note}.`,
    correct: (note) => `Correct. It was ${note}.`,
    incorrect: (note) => `Incorrect. It was ${note}.`,
    sessionReset: "Session reset.",
    gameOverScore: (score) => `Game over. Score: ${score}.`,
    timeUpScore: (score) => `Time up. Final score: ${score}.`,
    classicTitle: "Classic session",
    livesTitle: (lives) => `${lives} ${lives === 1 ? "life" : "lives"}`,
  },
};

const locale = detectLocale();
const copy = STRINGS[locale];
document.documentElement.lang = locale;

const root = document.getElementById("app");
if (!root) throw new Error("No se encontró el contenedor #app");

class AppController {
  private screen: ScreenName = "menu";
  private mode: GameMode = "classic";
  private timeAttackDuration = 60;
  private selectedIds = new Set<string>();
  private activeNotes: GuitarNoteSample[] = [];
  private currentNote: GuitarNoteSample | null = null;
  private feedback: FeedbackState = { kind: "info", text: copy.ready };
  private loopEnabled = true;
  private soundPlaying = false;
  private consecutiveHits = 0;
  private totalQuestionsAsked = 0;
  private totalCorrectAnswers = 0;
  private sessionStats = new Map<string, NoteStat>();
  private remainingTime = 0;
  private timeAttackScore = 0;
  private timeAttackFinished = false;
  private timerId: number | null = null;
  private remainingLives = 3;
  private survivalScore = 0;
  private survivalGameOver = false;
  private persistentStats = new Map<string, NoteStat>();

  private readonly statsRepository = new StatsRepository();
  private readonly selector = new GuitarNoteSelector();
  private readonly audioPlayer = new AssetAudioPlayer();

  constructor(private readonly appRoot: HTMLElement) {
    this.persistentStats = this.statsRepository.loadStats();
    this.render();
  }

  private render() {
    this.appRoot.innerHTML = `
      <main class="ag-shell" data-screen="${this.screen}">
        ${this.renderHeader()}
        ${this.renderScreen()}
      </main>
    `;
    this.bindEvents();
  }

  private renderHeader() {
    const showBack = this.screen !== "menu";
    return `
      <header class="ag-topbar">
        <div class="ag-brand">
          ${showBack ? `<button class="ag-icon-btn" data-action="back" aria-label="${copy.back}">‹</button>` : ""}
          <img class="ag-brand-logo" src="${import.meta.env.BASE_URL}brand/storm-studios-logo.png" alt="Storm Studios" />
          <div>
            <p class="ag-kicker">Storm Studios</p>
            <h1>AP Guitar</h1>
          </div>
        </div>
        <button class="ag-quiet-btn" data-action="stats">${copy.stats}</button>
      </header>
    `;
  }

  private renderScreen() {
    switch (this.screen) {
      case "menu":
        return this.renderMenu();
      case "selection":
        return this.renderSelection();
      case "training":
        return this.renderTraining();
      case "stats":
        return this.renderStats();
    }
  }

  private renderMenu() {
    return `
      <section class="ag-menu">
        <div class="ag-menu-panel">
          <div class="ag-visual">
            <img src="${import.meta.env.BASE_URL}brand/app-ap-guitar.jpeg" alt="AP Guitar" />
            <div class="ag-fretboard" aria-hidden="true">
              ${Array.from({ length: 6 }, (_, index) => `<span style="--string:${index + 1}"></span>`).join("")}
            </div>
          </div>
          <div class="ag-mode-grid">
            ${(["classic", "timeAttack", "survival"] as GameMode[])
              .map(
                (mode) => `
                  <button class="ag-mode-card" data-action="select-mode" data-mode="${mode}">
                    <span>${copy.modeBadges[mode]}</span>
                    <strong>${copy.modeLabels[mode]}</strong>
                  </button>
                `,
              )
              .join("")}
          </div>
          <div class="ag-duration-row" aria-label="${copy.timeAttackDurationLabel}">
            ${[60, 90, 120]
              .map(
                (duration) => `
                  <button
                    class="ag-segment ${this.timeAttackDuration === duration ? "is-active" : ""}"
                    data-action="set-duration"
                    data-duration="${duration}"
                    aria-pressed="${this.timeAttackDuration === duration}"
                  >
                    ${duration}s
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      </section>
    `;
  }

  private renderSelection() {
    const notesByString = groupByString(allSamples);
    const selectedCount = this.selectedIds.size;
    return `
      <section class="ag-selection">
        <div class="ag-section-head">
          <div>
            <p class="ag-kicker">${copy.modeLabels[this.mode]}</p>
            <h2>${copy.noteSelection}</h2>
          </div>
          <span class="ag-count">${selectedCount}</span>
        </div>
        <div class="ag-toolbar">
          <button class="ag-secondary-btn" data-action="select-all">${copy.all}</button>
          <button class="ag-secondary-btn" data-action="clear-selection">${copy.clear}</button>
          <button class="ag-primary-btn" data-action="start-training" ${selectedCount === 0 ? "disabled" : ""}>
            ${copy.start}
          </button>
        </div>
        <div class="ag-strings">
          ${stringOrder
            .map((stringName) => {
              const notes = notesByString.get(stringName) ?? [];
              const activeOnString = notes.filter((note) => this.selectedIds.has(sampleId(note))).length;
              return `
                <section class="ag-string-block">
                  <div class="ag-string-head">
                    <h3>${copy.stringLabels[stringName] ?? stringName}</h3>
                    <button class="ag-mini-btn" data-action="toggle-string" data-string="${escapeAttr(stringName)}">
                      ${activeOnString === notes.length ? copy.remove : copy.choose}
                    </button>
                  </div>
                  <div class="ag-note-grid">
                    ${notes
                      .map((note) => {
                        const id = sampleId(note);
                        const checked = this.selectedIds.has(id);
                        return `
                          <button
                            class="ag-note-toggle ${checked ? "is-selected" : ""}"
                            data-action="toggle-note"
                            data-note-id="${escapeAttr(id)}"
                            aria-pressed="${checked}"
                          >
                            ${note.noteName}
                          </button>
                        `;
                      })
                      .join("")}
                  </div>
                </section>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  private renderTraining() {
    const isFinished =
      (this.mode === "timeAttack" && this.timeAttackFinished) ||
      (this.mode === "survival" && this.survivalGameOver);
    const canAnswer = this.currentNote !== null && !isFinished;
    return `
      <section class="ag-training">
        <div class="ag-stage">
          <div class="ag-stage-top">
            <div>
              <p class="ag-kicker">${copy.modeLabels[this.mode]}</p>
              <h2>${this.trainingTitle()}</h2>
            </div>
            <span class="ag-count">${this.activeNotes.length}</span>
          </div>
          ${this.renderHud()}
          <div class="ag-guitar" data-playing="${this.soundPlaying}">
            ${Array.from({ length: 6 }, (_, index) => `<span class="ag-guitar-string" style="--string:${index + 1}"></span>`).join("")}
            ${Array.from({ length: 5 }, (_, index) => `<span class="ag-fret" style="--fret:${index + 1}"></span>`).join("")}
          </div>
          <p class="ag-feedback" data-kind="${this.feedback.kind}">${this.feedback.text}</p>
          <div class="ag-training-actions">
            <button class="ag-primary-btn" data-action="new-note" ${this.activeNotes.length === 0 || isFinished ? "disabled" : ""}>
              ${copy.newNote}
            </button>
            <button class="ag-secondary-btn ${this.loopEnabled ? "is-active" : ""}" data-action="toggle-loop" aria-pressed="${this.loopEnabled}">
              Loop
            </button>
          </div>
          <label class="ag-volume">
            <span>${copy.volume}</span>
            <input data-action="volume" type="range" min="0" max="100" value="${Math.round(this.audioPlayer.getVolume() * 100)}" />
          </label>
        </div>
        <div class="ag-answer-panel">
          <div class="ag-answer-grid">
            ${answerOptions
              .map(
                (note) => `
                  <button class="ag-answer-btn" data-action="answer" data-note="${note}" ${canAnswer ? "" : "disabled"}>
                    ${note}
                  </button>
                `,
              )
              .join("")}
          </div>
          ${this.mode === "classic" ? this.renderClassicStats() : ""}
          ${isFinished ? this.renderEndGameCard() : ""}
        </div>
      </section>
    `;
  }

  private renderHud() {
    if (this.mode === "timeAttack") {
      return `
        <div class="ag-hud">
          <div><span>${copy.time}</span><strong class="${this.remainingTime <= 10 && this.remainingTime > 0 ? "is-hot" : ""}">${this.remainingTime}s</strong></div>
          <div><span>${copy.score}</span><strong>${this.timeAttackScore}</strong></div>
        </div>
      `;
    }

    if (this.mode === "survival") {
      return `
        <div class="ag-hud">
          <div><span>${copy.lives}</span><strong>${"♥".repeat(this.remainingLives)}${"♡".repeat(3 - this.remainingLives)}</strong></div>
          <div><span>${copy.score}</span><strong>${this.survivalScore}</strong></div>
        </div>
      `;
    }

    const accuracy = this.totalQuestionsAsked === 0 ? 0 : this.totalCorrectAnswers / this.totalQuestionsAsked;
    return `
      <div class="ag-hud">
        <div><span>${copy.streak}</span><strong>${this.consecutiveHits}</strong></div>
        <div><span>${copy.accuracy}</span><strong>${formatPercent(accuracy)}</strong></div>
      </div>
    `;
  }

  private renderClassicStats() {
    const accuracy = this.totalQuestionsAsked === 0 ? 0 : this.totalCorrectAnswers / this.totalQuestionsAsked;
    const sortedStats = Array.from(this.sessionStats.entries()).sort(([a], [b]) => compareFullNotes(a, b));
    return `
      <section class="ag-session-card">
        <div class="ag-session-head">
          <div>
            <span>${copy.session}</span>
            <strong>${this.totalCorrectAnswers} / ${this.totalQuestionsAsked}</strong>
          </div>
          <button class="ag-mini-btn" data-action="reset-session">${copy.reset}</button>
        </div>
        <div class="ag-progress"><span style="width:${accuracy * 100}%"></span></div>
        <div class="ag-stat-pills">
          ${
            sortedStats.length === 0
              ? `<span class="ag-empty-pill">${copy.noAnswersYet}</span>`
              : sortedStats
                  .map(([note, stat]) => {
                    const noteAccuracy = stat.total === 0 ? 0 : stat.correct / stat.total;
                    return `<span>${note} ${formatPercent(noteAccuracy)}</span>`;
                  })
                  .join("")
          }
        </div>
      </section>
    `;
  }

  private renderEndGameCard() {
    const score = this.mode === "timeAttack" ? this.timeAttackScore : this.survivalScore;
    const title = this.mode === "timeAttack" ? copy.timeUp : copy.gameOver;
    return `
      <section class="ag-end-card">
        <span>${title}</span>
        <strong>${score}</strong>
        <button class="ag-primary-btn" data-action="play-again">${copy.playAgain}</button>
      </section>
    `;
  }

  private renderStats() {
    const sortedNotes = [...allUniqueNoteNames].sort(compareFullNotes);
    const totals = Array.from(this.persistentStats.values()).reduce(
      (acc, stat) => ({
        correct: acc.correct + stat.correct,
        total: acc.total + stat.total,
      }),
      { correct: 0, total: 0 },
    );
    const totalAccuracy = totals.total === 0 ? 0 : totals.correct / totals.total;

    return `
      <section class="ag-stats">
        <div class="ag-section-head">
          <div>
            <p class="ag-kicker">${copy.history}</p>
            <h2>${copy.stats}</h2>
          </div>
          <span class="ag-count">${formatPercent(totalAccuracy)}</span>
        </div>
        <div class="ag-toolbar">
          <button class="ag-secondary-btn" data-action="clear-stats" ${this.persistentStats.size === 0 ? "disabled" : ""}>
            ${copy.clearStats}
          </button>
        </div>
        ${
          this.persistentStats.size === 0
            ? `<div class="ag-empty-state">${copy.emptyStats}</div>`
            : `<div class="ag-stats-list">
                ${sortedNotes
                  .map((note) => {
                    const stat = this.persistentStats.get(note) ?? { correct: 0, total: 0 };
                    const accuracy = stat.total === 0 ? 0 : stat.correct / stat.total;
                    return `
                      <article class="ag-stat-row">
                        <div>
                          <strong>${note}</strong>
                          <span>${stat.correct} / ${stat.total}</span>
                        </div>
                        <div class="ag-progress"><span style="width:${accuracy * 100}%"></span></div>
                        <em>${formatPercent(accuracy)}</em>
                      </article>
                    `;
                  })
                  .join("")}
              </div>`
        }
      </section>
    `;
  }

  private bindEvents() {
    this.appRoot.querySelectorAll<HTMLElement>("[data-action]").forEach((element) => {
      const action = element.dataset.action;
      element.addEventListener("click", () => {
        if (element instanceof HTMLButtonElement && element.disabled) return;
        this.handleAction(action, element);
      });
    });

    this.appRoot.querySelector<HTMLInputElement>('input[data-action="volume"]')?.addEventListener("input", (event) => {
      const input = event.currentTarget as HTMLInputElement;
      this.audioPlayer.setVolume(Number(input.value) / 100);
    });
  }

  private handleAction(action: string | undefined, element: HTMLElement) {
    switch (action) {
      case "back":
        this.goBack();
        break;
      case "stats":
        this.openStats();
        break;
      case "select-mode":
        this.openSelection(element.dataset.mode as GameMode);
        break;
      case "set-duration":
        this.timeAttackDuration = Number(element.dataset.duration) || 60;
        this.render();
        break;
      case "select-all":
        this.selectedIds = new Set(allSamples.map(sampleId));
        this.render();
        break;
      case "clear-selection":
        this.selectedIds.clear();
        this.render();
        break;
      case "toggle-string":
        this.toggleString(element.dataset.string ?? "");
        break;
      case "toggle-note":
        this.toggleNote(element.dataset.noteId ?? "");
        break;
      case "start-training":
        this.startTraining();
        break;
      case "new-note":
        void this.playNewNoteRequested();
        break;
      case "toggle-loop":
        this.loopEnabled = !this.loopEnabled;
        this.audioPlayer.setLooping(this.loopEnabled);
        this.render();
        break;
      case "answer":
        void this.answer(element.dataset.note ?? "");
        break;
      case "reset-session":
        this.resetClassicStats();
        this.feedback = { kind: "info", text: copy.sessionReset };
        this.render();
        break;
      case "play-again":
        this.resetTrainingState();
        this.render();
        break;
      case "clear-stats":
        this.statsRepository.clearStats();
        this.persistentStats = new Map();
        this.render();
        break;
    }
  }

  private goBack() {
    if (this.screen === "training") {
      this.stopTraining();
      this.screen = "menu";
    } else if (this.screen === "selection") {
      this.screen = "menu";
    } else if (this.screen === "stats") {
      this.screen = "menu";
    }
    this.render();
  }

  private openStats() {
    this.stopTraining();
    this.persistentStats = this.statsRepository.loadStats();
    this.screen = "stats";
    this.render();
  }

  private openSelection(mode: GameMode) {
    this.stopTraining();
    this.mode = mode;
    this.screen = "selection";
    this.selectedIds.clear();
    this.render();
  }

  private toggleString(stringName: string) {
    const notes = allSamples.filter((sample) => sample.stringName === stringName);
    const allSelected = notes.every((note) => this.selectedIds.has(sampleId(note)));
    notes.forEach((note) => {
      const id = sampleId(note);
      if (allSelected) {
        this.selectedIds.delete(id);
      } else {
        this.selectedIds.add(id);
      }
    });
    this.render();
  }

  private toggleNote(noteId: string) {
    if (this.selectedIds.has(noteId)) {
      this.selectedIds.delete(noteId);
    } else {
      this.selectedIds.add(noteId);
    }
    this.render();
  }

  private startTraining() {
    this.activeNotes = allSamples.filter((sample) => this.selectedIds.has(sampleId(sample)));
    if (this.activeNotes.length === 0) return;
    this.resetTrainingState();
    this.screen = "training";
    this.feedback = { kind: "info", text: copy.pressNewNote };
    this.render();
  }

  private resetTrainingState() {
    this.stopTimer();
    this.selector.reset();
    this.currentNote = null;
    this.soundPlaying = false;
    this.audioPlayer.stop();
    this.feedback = { kind: "info", text: copy.pressNewNote };

    if (this.mode === "classic") {
      this.resetClassicStats();
    }

    if (this.mode === "timeAttack") {
      this.remainingTime = this.timeAttackDuration;
      this.timeAttackScore = 0;
      this.timeAttackFinished = false;
    }

    if (this.mode === "survival") {
      this.remainingLives = 3;
      this.survivalScore = 0;
      this.survivalGameOver = false;
    }
  }

  private resetClassicStats() {
    this.consecutiveHits = 0;
    this.totalQuestionsAsked = 0;
    this.totalCorrectAnswers = 0;
    this.sessionStats.clear();
  }

  private stopTraining() {
    this.stopTimer();
    this.audioPlayer.stop();
    this.soundPlaying = false;
    this.currentNote = null;
    this.selector.reset();
  }

  private async playNewNoteRequested() {
    if (this.activeNotes.length === 0 || this.timeAttackFinished || this.survivalGameOver) return;

    this.audioPlayer.stop();
    this.soundPlaying = false;
    const nextNote = this.selector.getNextRandomNote(this.activeNotes);
    this.currentNote = nextNote;
    this.feedback = { kind: "info", text: copy.whatNote };

    if (this.mode === "timeAttack" && this.timerId === null) {
      this.startTimer();
    }

    this.render();

    if (!nextNote) return;
    const played = await this.audioPlayer.play(nextNote.filePath, this.loopEnabled, () => {
      if (!this.loopEnabled) {
        this.soundPlaying = false;
        this.render();
      }
    });

    this.soundPlaying = played && this.audioPlayer.isPlaying();
    if (!played) {
      this.feedback = { kind: "incorrect", text: copy.cannotLoad(nextNote.noteName) };
    }
    this.render();
  }

  private async answer(noteOption: string) {
    const notePlayed = this.currentNote;
    if (!notePlayed || this.timeAttackFinished || this.survivalGameOver) return;

    this.audioPlayer.stop();
    this.soundPlaying = false;
    const wasCorrect = noteBase(notePlayed.noteName) === noteOption;

    if (wasCorrect) {
      void this.audioPlayer.play("acierto.mp3");
      this.feedback = { kind: "correct", text: copy.correct(notePlayed.noteName) };
      this.applyCorrectAnswer();
    } else {
      void this.audioPlayer.play("error.mp3");
      this.feedback = { kind: "incorrect", text: copy.incorrect(notePlayed.noteName) };
      this.applyIncorrectAnswer();
    }

    this.updateSessionStats(notePlayed.noteName, wasCorrect);
    this.persistentStats = this.statsRepository.recordAnswer(notePlayed.noteName, wasCorrect);

    if (!this.survivalGameOver) {
      this.currentNote = null;
    }

    this.render();

    const shouldAutoAdvance =
      (this.mode === "timeAttack" && !this.timeAttackFinished) ||
      (this.mode === "survival" && !this.survivalGameOver);

    if (shouldAutoAdvance) {
      window.setTimeout(() => {
        void this.playNewNoteRequested();
      }, 400);
    }
  }

  private applyCorrectAnswer() {
    if (this.mode === "classic") {
      this.totalQuestionsAsked += 1;
      this.totalCorrectAnswers += 1;
      this.consecutiveHits += 1;
    }

    if (this.mode === "timeAttack") {
      this.timeAttackScore += 1;
    }

    if (this.mode === "survival") {
      this.survivalScore += 1;
    }
  }

  private applyIncorrectAnswer() {
    if (this.mode === "classic") {
      this.totalQuestionsAsked += 1;
      this.consecutiveHits = 0;
    }

    if (this.mode === "survival") {
      this.remainingLives -= 1;
      if (this.remainingLives <= 0) {
        this.remainingLives = 0;
        this.survivalGameOver = true;
        this.currentNote = null;
        this.feedback = { kind: "incorrect", text: copy.gameOverScore(this.survivalScore) };
      }
    }
  }

  private updateSessionStats(noteName: string, wasCorrect: boolean) {
    const previous = this.sessionStats.get(noteName) ?? { correct: 0, total: 0 };
    this.sessionStats.set(noteName, {
      correct: previous.correct + (wasCorrect ? 1 : 0),
      total: previous.total + 1,
    });
  }

  private startTimer() {
    this.stopTimer();
    this.remainingTime = this.timeAttackDuration;
    this.timeAttackFinished = false;
    this.timerId = window.setInterval(() => {
      this.remainingTime -= 1;
      if (this.remainingTime <= 0) {
        this.finishTimeAttack();
      } else {
        this.render();
      }
    }, 1000);
  }

  private finishTimeAttack() {
    this.stopTimer();
    this.remainingTime = 0;
    this.timeAttackFinished = true;
    this.currentNote = null;
    this.soundPlaying = false;
    this.audioPlayer.stop();
    this.feedback = { kind: "info", text: copy.timeUpScore(this.timeAttackScore) };
    this.render();
  }

  private stopTimer() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private trainingTitle() {
    if (this.mode === "timeAttack") return `${this.remainingTime || this.timeAttackDuration}s`;
    if (this.mode === "survival") return copy.livesTitle(this.remainingLives);
    return copy.classicTitle;
  }
}

function groupByString(samples: GuitarNoteSample[]) {
  const grouped = new Map<string, GuitarNoteSample[]>();
  samples.forEach((sample) => {
    const notes = grouped.get(sample.stringName) ?? [];
    notes.push(sample);
    grouped.set(sample.stringName, notes);
  });
  return grouped;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat(locale === "es" ? "es-MX" : "en-US", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function detectLocale(): Locale {
  const param = new URLSearchParams(window.location.search).get("lang");
  return param?.toLowerCase().startsWith("en") ? "en" : "es";
}

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

new AppController(root);
