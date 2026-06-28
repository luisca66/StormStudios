import "./styles.css";
import { AssetAudioPlayer } from "./audio-player";
import {
  allSamples,
  allUniqueNoteNames,
  answerOptions,
  compareFullNotes,
  instruments,
  noteBase,
  noteOctave,
  randomInstrument,
} from "./catalog";
import { NoteSelector } from "./note-selector";
import { StatsRepository } from "./stats-repository";
import type { FeedbackState, GameMode, NoteSample, NoteStat, ScreenName } from "./types";

type Locale = "es" | "en";

type Copy = {
  appTitle: string;
  subtitle: string;
  modeLabels: Record<GameMode, string>;
  modeBadges: Record<GameMode, string>;
  modeDescriptions: Record<GameMode, string>;
  instrumentLabels: Record<string, string>;
  back: string;
  stats: string;
  timeAttackDurationLabel: string;
  noteSelection: string;
  instrument: string;
  selected: string;
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
  loop: string;
  classicTitle: string;
  totalNotes: (count: number) => string;
  cannotLoad: (note: NoteSample) => string;
  correct: (note: NoteSample) => string;
  incorrect: (note: NoteSample) => string;
  sessionReset: string;
  gameOverScore: (score: number) => string;
  timeUpScore: (score: number) => string;
  livesTitle: (lives: number) => string;
};

const STRINGS: Record<Locale, Copy> = {
  es: {
    appTitle: "Oído Absoluto Multi",
    subtitle: "Piano, cello, corno, coro y fagot",
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
    modeDescriptions: {
      classic: "Sesiones sin límite, precisión visible por nota y repetición controlada.",
      timeAttack: "Responde tantas notas como puedas antes de que el reloj llegue a cero.",
      survival: "Tres vidas, avance automático y final inmediato cuando se agotan.",
    },
    instrumentLabels: {
      Cello: "Cello",
      Piano: "Piano",
      Corno: "Corno",
      Coro: "Coro",
      Fagot: "Fagot",
      [randomInstrument]: "Aleatorio",
    },
    back: "Volver",
    stats: "Estadísticas",
    timeAttackDurationLabel: "Duración contrarreloj",
    noteSelection: "Selección de notas",
    instrument: "Instrumento",
    selected: "Seleccionadas",
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
    loop: "Loop",
    classicTitle: "Sesión clásica",
    totalNotes: (count) => `${count} ${count === 1 ? "nota" : "notas"}`,
    cannotLoad: (note) => `No se pudo cargar ${note.noteName} en ${note.instrument}.`,
    correct: (note) => `Correcto. Era ${note.noteName} (${note.instrument}).`,
    incorrect: (note) => `Incorrecto. Era ${note.noteName} (${note.instrument}).`,
    sessionReset: "Sesión reiniciada.",
    gameOverScore: (score) => `Juego terminado. Puntuación: ${score}.`,
    timeUpScore: (score) => `Tiempo agotado. Puntuación final: ${score}.`,
    livesTitle: (lives) => `${lives} vidas`,
  },
  en: {
    appTitle: "Perfect Pitch Multi",
    subtitle: "Piano, cello, horn, choir, and bassoon",
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
    modeDescriptions: {
      classic: "Untimed sessions with visible per-note accuracy and controlled repetition.",
      timeAttack: "Answer as many notes as possible before the clock reaches zero.",
      survival: "Three lives, automatic advance, and an immediate ending when they run out.",
    },
    instrumentLabels: {
      Cello: "Cello",
      Piano: "Piano",
      Corno: "Horn",
      Coro: "Choir",
      Fagot: "Bassoon",
      [randomInstrument]: "Random",
    },
    back: "Back",
    stats: "Stats",
    timeAttackDurationLabel: "Time attack duration",
    noteSelection: "Note selection",
    instrument: "Instrument",
    selected: "Selected",
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
    loop: "Loop",
    classicTitle: "Classic session",
    totalNotes: (count) => `${count} ${count === 1 ? "note" : "notes"}`,
    cannotLoad: (note) => `Could not load ${note.noteName} on ${copyInstrument(note.instrument)}.`,
    correct: (note) => `Correct. It was ${note.noteName} (${copyInstrument(note.instrument)}).`,
    incorrect: (note) => `Incorrect. It was ${note.noteName} (${copyInstrument(note.instrument)}).`,
    sessionReset: "Session reset.",
    gameOverScore: (score) => `Game over. Score: ${score}.`,
    timeUpScore: (score) => `Time up. Final score: ${score}.`,
    livesTitle: (lives) => `${lives} ${lives === 1 ? "life" : "lives"}`,
  },
};

const locale = detectLocale();
const copy = STRINGS[locale];
document.documentElement.lang = locale;
document.title = `${copy.appTitle} | Storm Studios`;

const root = document.getElementById("app");
if (!root) throw new Error("No se encontró el contenedor #app");

class AppController {
  private screen: ScreenName = "menu";
  private mode: GameMode = "classic";
  private timeAttackDuration = 60;
  private selectedInstrument = instruments[0].displayName;
  private selectedNoteNames = new Set<string>();
  private activeNotes: NoteSample[] = [];
  private currentNote: NoteSample | null = null;
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
  private readonly selector = new NoteSelector();
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
            <h1>${copy.appTitle}</h1>
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
            <img src="${import.meta.env.BASE_URL}brand/app-ap-multi.png" alt="${copy.appTitle}" />
            <div class="ag-orchestra" aria-hidden="true">
              ${instruments
                .map(
                  (instrument, index) => `
                    <span style="--i:${index + 1}">
                      ${copy.instrumentLabels[instrument.displayName] ?? instrument.displayName}
                    </span>
                  `,
                )
                .join("")}
            </div>
          </div>
          <div class="ag-mode-grid">
            <section class="ag-intro-card">
              <p class="ag-kicker">Studio Edition</p>
              <h2>${copy.appTitle}</h2>
              <p>${copy.subtitle}</p>
            </section>
            ${(["classic", "timeAttack", "survival"] as GameMode[])
              .map(
                (mode) => `
                  <button class="ag-mode-card" data-action="select-mode" data-mode="${mode}">
                    <span>${copy.modeBadges[mode]}</span>
                    <strong>${copy.modeLabels[mode]}</strong>
                    <em>${copy.modeDescriptions[mode]}</em>
                  </button>
                `,
              )
              .join("")}
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
        </div>
      </section>
    `;
  }

  private renderSelection() {
    const notesByOctave = groupByOctave(allUniqueNoteNames);
    const selectedCount = this.selectedNoteNames.size;
    const instrumentChoices = [...instruments.map((instrument) => instrument.displayName), randomInstrument];

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
        <section class="ag-instrument-panel">
          <div>
            <p class="ag-kicker">${copy.instrument}</p>
            <strong>${copy.instrumentLabels[this.selectedInstrument] ?? this.selectedInstrument}</strong>
          </div>
          <div class="ag-instrument-grid">
            ${instrumentChoices
              .map((instrument) => {
                const selected = this.selectedInstrument === instrument;
                return `
                  <button
                    class="ag-instrument-chip ${selected ? "is-selected" : ""}"
                    data-action="set-instrument"
                    data-instrument="${escapeAttr(instrument)}"
                    aria-pressed="${selected}"
                  >
                    ${copy.instrumentLabels[instrument] ?? instrument}
                  </button>
                `;
              })
              .join("")}
          </div>
        </section>
        <div class="ag-strings">
          ${Array.from(notesByOctave.entries())
            .map(([octave, notes]) => {
              const activeInOctave = notes.filter((note) => this.selectedNoteNames.has(note)).length;
              return `
                <section class="ag-string-block">
                  <div class="ag-string-head">
                    <h3>Octava ${octave}</h3>
                    <button class="ag-mini-btn" data-action="toggle-octave" data-octave="${octave}">
                      ${activeInOctave === notes.length ? copy.remove : copy.choose}
                    </button>
                  </div>
                  <div class="ag-note-grid">
                    ${notes
                      .map((note) => {
                        const checked = this.selectedNoteNames.has(note);
                        return `
                          <button
                            class="ag-note-toggle ${checked ? "is-selected" : ""}"
                            data-action="toggle-note"
                            data-note-name="${escapeAttr(note)}"
                            aria-pressed="${checked}"
                          >
                            ${note}
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
          <div class="ag-resonator" data-playing="${this.soundPlaying}">
            ${instruments.map((instrument, index) => `<span class="ag-wave" style="--i:${index + 1}">${instrument.displayName}</span>`).join("")}
          </div>
          <p class="ag-feedback" data-kind="${this.feedback.kind}">${this.feedback.text}</p>
          <div class="ag-training-actions">
            <button class="ag-primary-btn" data-action="new-note" ${this.activeNotes.length === 0 || isFinished ? "disabled" : ""}>
              ${copy.newNote}
            </button>
            <button class="ag-secondary-btn ${this.loopEnabled ? "is-active" : ""}" data-action="toggle-loop" aria-pressed="${this.loopEnabled}">
              ${copy.loop}
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
                ${allUniqueNoteNames
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
      case "set-instrument":
        this.selectedInstrument = element.dataset.instrument || instruments[0].displayName;
        this.render();
        break;
      case "select-all":
        this.selectedNoteNames = new Set(allUniqueNoteNames);
        this.render();
        break;
      case "clear-selection":
        this.selectedNoteNames.clear();
        this.render();
        break;
      case "toggle-octave":
        this.toggleOctave(Number(element.dataset.octave) || 0);
        break;
      case "toggle-note":
        this.toggleNote(element.dataset.noteName ?? "");
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
    this.selectedInstrument = instruments[0].displayName;
    this.selectedNoteNames.clear();
    this.render();
  }

  private toggleOctave(octave: number) {
    const notes = allUniqueNoteNames.filter((note) => noteOctave(note) === octave);
    const allSelected = notes.every((note) => this.selectedNoteNames.has(note));
    notes.forEach((note) => {
      if (allSelected) {
        this.selectedNoteNames.delete(note);
      } else {
        this.selectedNoteNames.add(note);
      }
    });
    this.render();
  }

  private toggleNote(noteName: string) {
    if (this.selectedNoteNames.has(noteName)) {
      this.selectedNoteNames.delete(noteName);
    } else {
      this.selectedNoteNames.add(noteName);
    }
    this.render();
  }

  private startTraining() {
    const selectedNotes = this.selectedNoteNames;
    this.activeNotes =
      this.selectedInstrument === randomInstrument
        ? allSamples.filter((sample) => selectedNotes.has(sample.noteName))
        : allSamples.filter(
            (sample) => sample.instrument === this.selectedInstrument && selectedNotes.has(sample.noteName),
          );

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
    const playStatus = await this.audioPlayer.play(nextNote.filePath, this.loopEnabled, () => {
      if (!this.loopEnabled) {
        this.soundPlaying = false;
        this.render();
      }
    });

    this.soundPlaying = playStatus === "playing" && this.audioPlayer.isPlaying();
    if (playStatus === "failed") {
      this.feedback = { kind: "incorrect", text: copy.cannotLoad(nextNote) };
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
      this.feedback = { kind: "correct", text: copy.correct(notePlayed) };
      this.applyCorrectAnswer();
    } else {
      void this.audioPlayer.play("error.mp3");
      this.feedback = { kind: "incorrect", text: copy.incorrect(notePlayed) };
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
    return copy.totalNotes(this.activeNotes.length);
  }
}

function groupByOctave(notes: string[]) {
  const grouped = new Map<number, string[]>();
  notes.forEach((note) => {
    const octave = noteOctave(note);
    const group = grouped.get(octave) ?? [];
    group.push(note);
    grouped.set(octave, group.sort(compareFullNotes));
  });
  return new Map([...grouped.entries()].sort(([a], [b]) => a - b));
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

function copyInstrument(instrument: string) {
  return STRINGS.en.instrumentLabels[instrument] ?? instrument;
}

new AppController(root);
