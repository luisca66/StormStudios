(() => {
  const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";
  const STATS_KEY = "storm.intervalos.reconocimiento.stats.v1";
  const RECORD_KEY = "storm.intervalos.reconocimiento.record.v1";
  const VOLUME_KEY = "storm.intervalos.reconocimiento.volume.v1";

  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang") === "en" ? "en" : "es";
  document.documentElement.lang = lang;

  const text = {
    es: {
      appName: "Intervalos",
      appSub: "Reconocimiento auditivo",
      menuTitle: "Elige modo",
      classic: "Clásico",
      classicSub: "Construye tu mejor racha",
      timeAttack: "Contrarreloj",
      timeAttackSub: "Suma tantos aciertos como puedas",
      survival: "Supervivencia",
      survivalSub: "3 vidas. ¿Hasta dónde llegas?",
      stats: "Estadísticas",
      setup: "Configuración",
      timbre: "Timbre",
      intervals: "Intervalos a practicar",
      playback: "Modo de reproducción",
      volume: "Volumen",
      startDisabled: "Selecciona al menos un grupo",
      startTraining: "Comenzar entrenamiento",
      back: "Volver",
      play: "Tocar",
      repeat: "Repetir",
      loading: "Cargando sonidos...",
      pressPlay: "Presiona Tocar para empezar",
      identify: "Identifica el intervalo",
      correct: "Correcto",
      itWas: "Era",
      gameOver: "Fin del juego",
      timesUp: "Tiempo",
      finalScore: "Puntuación final",
      streak: "Racha",
      record: "Récord",
      score: "Puntos",
      time: "Tiempo",
      best: "Mejor",
      overall: "Precisión general",
      correctOf: "aciertos de",
      correctSlash: "aciertos",
      intervalsCount: "ints",
      noStats: "Aún no hay datos. Juega una partida para ver tu progreso.",
      clearStats: "Borrar estadísticas",
      confirmClear: "¿Seguro? Esto no se puede deshacer.",
      cancel: "Cancelar",
      clear: "Borrar",
      all: "Todos",
      piano: "Piano",
      choir: "Coro",
      horn: "Corno",
      cello: "Cello",
      bassoon: "Fagot",
      harmonic: "Armónico",
      melodic: "Melódico",
      mixed: "Mixto",
      seconds: "2das",
      thirds: "3ras",
      sixths: "6tas",
      sevenths: "7mas",
      fourthFifthOctave: "4 · 5 · 8va",
      fourthFifthDiminished: "4 · 5 · d5",
      modeLine: "Escucha · Reconoce · Responde",
    },
    en: {
      appName: "Intervals",
      appSub: "Ear recognition",
      menuTitle: "Choose mode",
      classic: "Classic",
      classicSub: "Build your best streak",
      timeAttack: "Time Attack",
      timeAttackSub: "Score as many correct answers as you can",
      survival: "Survival",
      survivalSub: "3 lives. How far can you go?",
      stats: "Statistics",
      setup: "Setup",
      timbre: "Timbre",
      intervals: "Intervals to practice",
      playback: "Playback mode",
      volume: "Volume",
      startDisabled: "Select at least one group",
      startTraining: "Start training",
      back: "Back",
      play: "Play",
      repeat: "Repeat",
      loading: "Loading sounds...",
      pressPlay: "Press Play to start",
      identify: "Identify the interval",
      correct: "Correct",
      itWas: "It was",
      gameOver: "Game over",
      timesUp: "Time",
      finalScore: "Final score",
      streak: "Streak",
      record: "Best",
      score: "Score",
      time: "Time",
      best: "Best",
      overall: "Overall accuracy",
      correctOf: "correct of",
      correctSlash: "correct",
      intervalsCount: "ints",
      noStats: "No data yet. Play a round to see your progress.",
      clearStats: "Clear statistics",
      confirmClear: "Are you sure? This cannot be undone.",
      cancel: "Cancel",
      clear: "Clear",
      all: "All",
      piano: "Piano",
      choir: "Choir",
      horn: "Horn",
      cello: "Cello",
      bassoon: "Bassoon",
      harmonic: "Harmonic",
      melodic: "Melodic",
      mixed: "Mixed",
      seconds: "2nds",
      thirds: "3rds",
      sixths: "6ths",
      sevenths: "7ths",
      fourthFifthOctave: "4 · 5 · 8ve",
      fourthFifthDiminished: "4 · 5 · d5",
      modeLine: "Listen · Recognize · Answer",
    },
  }[lang];

  const NOTES = [
    "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
    "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4",
  ];

  const TIMBRES = [
    { id: "piano", folder: "Piano", label: text.piano },
    { id: "choir", folder: "Coro", label: text.choir },
    { id: "horn", folder: "Corno", label: text.horn },
    { id: "cello", folder: "Cello", label: text.cello },
    { id: "bassoon", folder: "Fagot", label: text.bassoon },
    { id: "all", folder: null, label: text.all },
  ];

  const INTERVALS = [
    { id: "MINOR_SECOND", short: "m2", semitones: 1, es: "2da menor", en: "minor 2nd" },
    { id: "MAJOR_SECOND", short: "M2", semitones: 2, es: "2da mayor", en: "major 2nd" },
    { id: "MINOR_THIRD", short: "m3", semitones: 3, es: "3ra menor", en: "minor 3rd" },
    { id: "MAJOR_THIRD", short: "M3", semitones: 4, es: "3ra mayor", en: "major 3rd" },
    { id: "PERFECT_FOURTH", short: "P4", semitones: 5, es: "4ta justa", en: "perfect 4th" },
    { id: "DIMINISHED_FIFTH", short: "d5", semitones: 6, es: "5ta disminuida", en: "diminished 5th" },
    { id: "PERFECT_FIFTH", short: "P5", semitones: 7, es: "5ta justa", en: "perfect 5th" },
    { id: "MINOR_SIXTH", short: "m6", semitones: 8, es: "6ta menor", en: "minor 6th" },
    { id: "MAJOR_SIXTH", short: "M6", semitones: 9, es: "6ta mayor", en: "major 6th" },
    { id: "MINOR_SEVENTH", short: "m7", semitones: 10, es: "7ma menor", en: "minor 7th" },
    { id: "MAJOR_SEVENTH", short: "M7", semitones: 11, es: "7ma mayor", en: "major 7th" },
    { id: "PERFECT_OCTAVE", short: "P8", semitones: 12, es: "Octava", en: "octave" },
  ];

  const intervalById = Object.fromEntries(INTERVALS.map((interval) => [interval.id, interval]));
  const timbreById = Object.fromEntries(TIMBRES.map((timbre) => [timbre.id, timbre]));

  const GROUPS = [
    { id: "SECOND", label: text.seconds, intervalIds: ["MAJOR_SECOND", "MINOR_SECOND"] },
    { id: "THIRD", label: text.thirds, intervalIds: ["MAJOR_THIRD", "MINOR_THIRD"] },
    { id: "SIXTH", label: text.sixths, intervalIds: ["MAJOR_SIXTH", "MINOR_SIXTH"] },
    { id: "SEVENTH", label: text.sevenths, intervalIds: ["MAJOR_SEVENTH", "MINOR_SEVENTH"] },
    { id: "FOURTH_FIFTH_OCTAVE", label: text.fourthFifthOctave, intervalIds: ["PERFECT_FOURTH", "PERFECT_FIFTH", "PERFECT_OCTAVE"] },
    { id: "FOURTH_FIFTH_DIMINISHED", label: text.fourthFifthDiminished, intervalIds: ["PERFECT_FOURTH", "PERFECT_FIFTH", "DIMINISHED_FIFTH"] },
    { id: "ALL", label: text.all, intervalIds: INTERVALS.map((interval) => interval.id) },
  ];

  const ANSWER_PAIRS = [
    ["MINOR_SECOND", "MAJOR_SECOND"],
    ["MINOR_THIRD", "MAJOR_THIRD"],
    ["PERFECT_FOURTH", "DIMINISHED_FIFTH"],
    ["PERFECT_FIFTH", "PERFECT_OCTAVE"],
    ["MINOR_SIXTH", "MAJOR_SIXTH"],
    ["MINOR_SEVENTH", "MAJOR_SEVENTH"],
  ];

  const PLAYBACK_OPTIONS = [
    { id: "harmonic", label: `≈ ${text.harmonic}` },
    { id: "melodic", label: `→ ${text.melodic}` },
    { id: "mixed", label: `⁜ ${text.mixed}` },
  ];

  const state = {
    screen: "menu",
    selectedMode: "classic",
    selectedDuration: 60,
    selectedGroups: new Set(),
    selectedTimbre: "all",
    selectedPlayback: "mixed",
    volume: loadVolume(),
    confirmClear: false,
    loadToken: 0,
    game: null,
  };

  const audioCache = new Map();
  const app = document.getElementById("app");

  function tInterval(interval) {
    return interval[lang];
  }

  function modeLabel(mode) {
    if (mode === "classic") return text.classic;
    if (mode === "time") return text.timeAttack;
    return text.survival;
  }

  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY) || "{}") || {};
    } catch {
      return {};
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {}
  }

  function loadRecord() {
    const raw = Number(localStorage.getItem(RECORD_KEY) || "0");
    return Number.isFinite(raw) ? raw : 0;
  }

  function loadVolume() {
    const raw = Number(localStorage.getItem(VOLUME_KEY) || "0.8");
    return Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0.8;
  }

  function saveVolume(volume) {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {}
  }

  function saveRecord(record) {
    try {
      localStorage.setItem(RECORD_KEY, String(record));
    } catch {}
  }

  function recordAnswer(intervalId, wasCorrect) {
    const stats = loadStats();
    const current = stats[intervalId] || { correct: 0, total: 0 };
    stats[intervalId] = {
      correct: current.correct + (wasCorrect ? 1 : 0),
      total: current.total + 1,
    };
    saveStats(stats);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function selectedIntervalTypes() {
    if (state.selectedGroups.has("ALL")) return INTERVALS;
    const ids = [];
    GROUPS.forEach((group) => {
      if (!state.selectedGroups.has(group.id)) return;
      group.intervalIds.forEach((id) => {
        if (!ids.includes(id)) ids.push(id);
      });
    });
    return ids.map((id) => intervalById[id]).filter(Boolean);
  }

  function generateInterval() {
    const active = selectedIntervalTypes();
    const intervalType = randomItem(active);
    let mode = "harmonic";

    if (state.selectedPlayback === "harmonic") {
      mode = "harmonic";
    } else if (state.selectedPlayback === "melodic") {
      mode = Math.random() < 0.5 ? "melodicAscending" : "melodicDescending";
    } else {
      mode = randomItem(["harmonic", "melodicAscending", "melodicDescending"]);
    }

    const distance = intervalType.semitones;
    if (mode === "melodicDescending") {
      const start = distance + Math.floor(Math.random() * (NOTES.length - distance));
      return {
        note1: NOTES[start],
        note2: NOTES[start - distance],
        intervalType,
        mode,
      };
    }

    const start = Math.floor(Math.random() * (NOTES.length - distance));
    return {
      note1: NOTES[start],
      note2: NOTES[start + distance],
      intervalType,
      mode,
    };
  }

  function getTimbreFolder() {
    if (state.selectedTimbre === "all") {
      return randomItem(TIMBRES.filter((timbre) => timbre.id !== "all")).folder;
    }
    return timbreById[state.selectedTimbre].folder;
  }

  function sampleUrl(folder, note) {
    return `${AUDIO_BASE}/${folder}/${encodeURIComponent(note)}.mp3`;
  }

  function preloadAudio(url) {
    if (audioCache.has(url)) return Promise.resolve();

    return new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("canplaythrough", done);
        audio.removeEventListener("error", done);
        audioCache.set(url, audio);
        resolve();
      };
      audio.preload = "auto";
      audio.src = url;
      audio.addEventListener("canplaythrough", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      setTimeout(done, 2500);
    });
  }

  function playUrl(url, volume = 1) {
    const cached = audioCache.get(url);
    const audio = cached ? cached.cloneNode(true) : new Audio(url);
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  async function preloadGameSounds(token) {
    const folders = state.selectedTimbre === "all"
      ? TIMBRES.filter((timbre) => timbre.id !== "all").map((timbre) => timbre.folder)
      : [timbreById[state.selectedTimbre].folder];
    const urls = folders.flatMap((folder) => NOTES.map((note) => sampleUrl(folder, note)));
    urls.push(`${AUDIO_BASE}/acierto.mp3`, `${AUDIO_BASE}/error.mp3`);

    let loaded = 0;
    for (const url of urls) {
      await preloadAudio(url);
      loaded += 1;
      if (state.game && state.loadToken === token) {
        state.game.loadingProgress = Math.round((loaded / urls.length) * 100);
        render();
      }
    }

    if (state.game && state.loadToken === token) {
      state.game.soundsLoading = false;
      state.game.phase = "idle";
      render();
    }
  }

  function playInterval(interval) {
    const folder = getTimbreFolder();
    playUrl(sampleUrl(folder, interval.note1), state.volume);
    if (interval.mode === "harmonic") {
      playUrl(sampleUrl(folder, interval.note2), state.volume);
      return;
    }
    setTimeout(() => playUrl(sampleUrl(folder, interval.note2), state.volume), 400);
  }

  function playFeedback(wasCorrect) {
    playUrl(`${AUDIO_BASE}/${wasCorrect ? "acierto" : "error"}.mp3`, state.volume * 0.8);
  }

  function clearGameTimers() {
    if (!state.game) return;
    if (state.game.timerId) clearInterval(state.game.timerId);
    if (state.game.feedbackTimeout) clearTimeout(state.game.feedbackTimeout);
    state.game.timerId = null;
    state.game.feedbackTimeout = null;
  }

  function startTimer() {
    const game = state.game;
    if (!game || game.timerId || game.mode !== "time") return;
    game.timerId = setInterval(() => {
      if (!state.game || state.game !== game) return;
      game.remainingTime -= 1;
      if (game.remainingTime <= 0) {
        game.remainingTime = 0;
        game.phase = "timeout";
        game.currentInterval = null;
        clearInterval(game.timerId);
        game.timerId = null;
      }
      render();
    }, 1000);
  }

  function startGame() {
    if (state.selectedGroups.size === 0) return;
    clearGameTimers();
    state.loadToken += 1;
    state.game = {
      mode: state.selectedMode,
      phase: "loading",
      soundsLoading: true,
      loadingProgress: 0,
      currentInterval: null,
      answeredType: null,
      streak: 0,
      record: loadRecord(),
      score: 0,
      remainingTime: state.selectedDuration,
      lives: 3,
      timerId: null,
      feedbackTimeout: null,
    };
    state.screen = "game";
    render();
    preloadGameSounds(state.loadToken);
  }

  function playNewInterval() {
    const game = state.game;
    if (!game || game.soundsLoading || game.phase !== "idle") return;
    const interval = generateInterval();
    game.currentInterval = interval;
    game.answeredType = null;
    game.phase = "playing";
    playInterval(interval);
    startTimer();
    render();
  }

  function repeatInterval() {
    const game = state.game;
    if (!game || !game.currentInterval || game.phase !== "playing") return;
    playInterval(game.currentInterval);
  }

  function processAnswer(intervalId) {
    const game = state.game;
    if (!game || game.phase !== "playing" || !game.currentInterval) return;

    const wasCorrect = game.currentInterval.intervalType.id === intervalId;
    game.answeredType = intervalId;
    game.phase = wasCorrect ? "correct" : "incorrect";
    recordAnswer(game.currentInterval.intervalType.id, wasCorrect);
    playFeedback(wasCorrect);

    if (wasCorrect) {
      if (game.mode === "classic") {
        game.streak += 1;
        if (game.streak > game.record) {
          game.record = game.streak;
          saveRecord(game.record);
        }
      } else {
        game.score += 1;
      }
    } else if (game.mode === "classic") {
      game.streak = 0;
    } else if (game.mode === "survival") {
      game.lives -= 1;
    }

    if (game.feedbackTimeout) clearTimeout(game.feedbackTimeout);
    game.feedbackTimeout = setTimeout(() => {
      if (!state.game || state.game !== game) return;
      game.feedbackTimeout = null;
      if (game.mode === "survival" && game.lives <= 0) {
        game.phase = "gameover";
      } else if (game.mode === "time" && game.remainingTime <= 0) {
        game.phase = "timeout";
      } else {
        game.phase = "idle";
        game.currentInterval = null;
        game.answeredType = null;
      }
      render();
    }, 1300);

    render();
  }

  function goMenu() {
    clearGameTimers();
    state.game = null;
    state.screen = "menu";
    state.confirmClear = false;
    render();
  }

  function openSetup(mode) {
    clearGameTimers();
    state.selectedMode = mode;
    state.screen = "setup";
    state.confirmClear = false;
    render();
  }

  function openStats() {
    clearGameTimers();
    state.screen = "stats";
    state.confirmClear = false;
    render();
  }

  function toggleGroup(groupId) {
    if (groupId === "ALL") {
      state.selectedGroups = state.selectedGroups.has("ALL") ? new Set() : new Set(["ALL"]);
      return;
    }

    const next = new Set([...state.selectedGroups].filter((id) => id !== "ALL"));
    if (next.has(groupId)) next.delete(groupId);
    else next.add(groupId);
    state.selectedGroups = next;
  }

  function accuracyColor(percent) {
    if (percent >= 80) return "var(--correct)";
    if (percent >= 55) return "var(--accent)";
    return "var(--error)";
  }

  function logoMarkup() {
    return `
      <div class="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 76 76" role="img">
          <circle cx="38" cy="38" r="34" fill="none" stroke="rgba(201,168,108,0.25)" />
          <circle cx="38" cy="38" r="25" fill="none" stroke="rgba(201,168,108,0.18)" />
          <polyline points="8,38 13,26 18,48 23,22 28,54 33,34 38,38 43,26 48,50 53,30 58,44 63,36 68,38"
            fill="none" stroke="#c9a86c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    `;
  }

  function renderMenu() {
    app.innerHTML = `
      <main class="screen">
        <header class="topline">
          <div class="brand-lockup">
            ${logoMarkup()}
            <div>
              <div class="eyebrow">${text.appSub}</div>
              <h1 class="title">${text.appName}</h1>
              <p class="subtitle">${text.modeLine}</p>
            </div>
          </div>
        </header>

        <section class="mode-list" aria-label="${text.menuTitle}">
          <h2 class="screen-title">${text.menuTitle}</h2>
          ${modeCard("classic", "◈", text.classic, text.classicSub, "amber", loadRecord() > 0 ? `${text.best}: ${loadRecord()}` : "")}
          ${modeCard("time", "◷", text.timeAttack, text.timeAttackSub, "blue", "", durationButtons())}
          ${modeCard("survival", "♥", text.survival, text.survivalSub, "rose")}
          <button class="stats-button" type="button" data-action="stats">
            <span class="brand-lockup">
              <span class="bars-icon" aria-hidden="true"><span></span><span></span><span></span></span>
              <span>${text.stats}</span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        </section>
      </main>
    `;
  }

  function modeCard(mode, icon, title, subtitle, accent, footer = "", extra = "") {
    return `
      <div class="mode-card" role="button" tabindex="0" data-action="mode" data-mode="${mode}" data-accent="${accent}">
        <span class="mode-icon" aria-hidden="true">${icon}</span>
        <span class="mode-body">
          <span class="mode-title">${title}</span>
          <span class="mode-subtitle">${subtitle}</span>
          ${footer ? `<span class="small-muted" style="display:block;margin-top:8px;">${footer}</span>` : ""}
          ${extra}
        </span>
      </div>
    `;
  }

  function durationButtons() {
    return `
      <span class="mode-duration-row">
        ${[60, 90, 120].map((duration) => `
          <button class="pill ${state.selectedDuration === duration ? "is-selected" : ""}"
            type="button" data-action="duration" data-duration="${duration}">${duration}s</button>
        `).join("")}
      </span>
    `;
  }

  function renderSetup() {
    const selected = selectedIntervalTypes();
    app.innerHTML = `
      <main class="screen">
        <header class="header-row">
          <button class="back-button" type="button" data-action="menu">
            <span class="back-chevron" aria-hidden="true">‹</span>
            <span>${text.back}</span>
          </button>
          <div class="screen-heading">
            <div class="eyebrow">${text.setup}</div>
            <h1 class="screen-title">${modeLabel(state.selectedMode)}</h1>
          </div>
        </header>

        <section class="setup-list">
          <div class="setup-section">
            <div class="section-label">${text.timbre}</div>
            <div class="chip-row">
              ${TIMBRES.map((timbre) => `
                <button type="button" class="chip ${state.selectedTimbre === timbre.id ? "is-selected" : ""}"
                  data-action="timbre" data-timbre="${timbre.id}">${timbre.label}</button>
              `).join("")}
            </div>
          </div>

          <div class="setup-section">
            <div class="section-label">${text.intervals}</div>
            <div class="chip-row">
              ${GROUPS.map((group) => `
                <button type="button"
                  class="chip mono ${state.selectedGroups.has(group.id) ? (group.id === "ALL" ? "is-selected" : "is-soft-selected") : ""}"
                  data-action="group" data-group="${group.id}">${group.label}</button>
              `).join("")}
            </div>
            ${selected.length > 0 ? `<div class="preview-line">${selected.map((interval) => interval.short).join(" · ")}</div>` : ""}
          </div>

          <div class="setup-section">
            <div class="section-label">${text.playback}</div>
            <div class="playback-grid">
              ${PLAYBACK_OPTIONS.map((option) => `
                <button type="button" class="playback-option ${state.selectedPlayback === option.id ? "is-selected" : ""}"
                  data-action="playback" data-playback="${option.id}">${option.label}</button>
              `).join("")}
            </div>
          </div>

          <div class="setup-section">
            <div class="volume-head">
              <div class="section-label">${text.volume}</div>
              <div class="volume-value">${Math.round(state.volume * 100)}%</div>
            </div>
            <input class="volume-slider" type="range" min="0" max="100" step="1" value="${Math.round(state.volume * 100)}" data-action="volume" aria-label="${text.volume}" />
          </div>
        </section>

        <div class="sticky-action">
          <button class="primary-button" type="button" data-action="start" ${state.selectedGroups.size === 0 ? "disabled" : ""}>
            ${state.selectedGroups.size === 0 ? text.startDisabled : `${text.startTraining} →`}
          </button>
        </div>
      </main>
    `;
  }

  function renderGame() {
    const game = state.game;
    if (!game) return renderMenu();
    const phase = game.phase;
    const finalScore = game.mode === "classic" ? game.record : game.score;

    app.innerHTML = `
      <main class="screen game-screen">
        <header class="game-toolbar">
          <button class="back-button" type="button" data-action="menu">
            <span class="back-chevron" aria-hidden="true">‹</span>
            <span>${text.back}</span>
          </button>
          <span class="mode-name">${modeLabel(game.mode)}</span>
          <div class="stat-cluster">
            ${game.mode === "classic" ? `
              ${statPill(text.streak, game.streak, false)}
              ${statPill(text.record, game.record, true)}
            ` : ""}
            ${game.mode === "time" ? `
              ${statPill(text.score, game.score, false)}
              ${statPill(text.time, `${game.remainingTime}s`, false, game.remainingTime <= 10)}
            ` : ""}
            ${game.mode === "survival" ? `
              ${statPill(text.score, game.score, false)}
              <span class="hearts" aria-label="lives">${[0, 1, 2].map((index) => `<span class="${index >= game.lives ? "lost" : ""}">♥</span>`).join("")}</span>
            ` : ""}
          </div>
        </header>

        ${feedbackPanel(game, phase, finalScore)}

        ${phase === "gameover" || phase === "timeout" ? `
          <div style="margin-top:auto;">
            <button class="primary-button" type="button" data-action="menu">${text.back}</button>
          </div>
        ` : `
          <div class="button-row">
            <button class="primary-button" type="button" data-action="play" ${game.soundsLoading || phase !== "idle" ? "disabled" : ""}>▶ ${text.play}</button>
            <button class="secondary-button" type="button" data-action="repeat" ${!game.currentInterval || phase !== "playing" ? "disabled" : ""}>↺ ${text.repeat}</button>
          </div>
          ${answerGrid(game)}
        `}
      </main>
    `;
  }

  function statPill(label, value, muted, danger = false) {
    return `
      <span class="stat-pill">
        <span class="stat-value ${muted ? "muted" : ""} ${danger ? "danger" : ""}">${value}</span>
        <span class="stat-label">${label}</span>
      </span>
    `;
  }

  function feedbackPanel(game, phase, finalScore) {
    const interval = game.currentInterval;
    let content = "";
    if (game.soundsLoading) {
      content = `<div><div class="loading-line">${text.loading}</div><div class="preview-line">${game.loadingProgress}%</div></div>`;
    } else if (phase === "idle") {
      content = `<div class="loading-line">${interval ? text.identify : text.pressPlay}</div>`;
    } else if (phase === "playing") {
      content = `<div class="wave-bars" aria-label="${text.identify}"><span></span><span></span><span></span><span></span><span></span></div>`;
    } else if (phase === "correct" && interval) {
      content = `
        <div>
          <div class="feedback-title correct-color">✓ ${text.correct}</div>
          <div class="feedback-detail">${interval.intervalType.short} — ${tInterval(interval.intervalType)}</div>
        </div>
      `;
    } else if (phase === "incorrect" && interval) {
      content = `
        <div>
          <div class="feedback-title error-color">✕ ${text.itWas}</div>
          <div class="feedback-code">${interval.intervalType.short}</div>
          <div class="feedback-detail">${tInterval(interval.intervalType)}</div>
        </div>
      `;
    } else if (phase === "gameover" || phase === "timeout") {
      content = `
        <div>
          <div class="feedback-title accent-color">${phase === "timeout" ? text.timesUp : text.gameOver}</div>
          <div class="feedback-detail">${text.finalScore}: ${finalScore}</div>
        </div>
      `;
    }

    return `<section class="feedback-panel ${phase}">${content}</section>`;
  }

  function answerGrid(game) {
    const activeIds = selectedIntervalTypes().map((interval) => interval.id);
    const rows = ANSWER_PAIRS.map(([left, right]) => {
      const showLeft = activeIds.includes(left);
      const showRight = activeIds.includes(right);
      if (!showLeft && !showRight) return "";
      return `
        <div class="answer-row">
          <div class="answer-slot">${showLeft ? answerButton(game, left) : `<div class="answer-button spacer"></div>`}</div>
          <div class="answer-slot">${showRight ? answerButton(game, right) : `<div class="answer-button spacer"></div>`}</div>
        </div>
      `;
    }).join("");

    return `<section class="answer-grid">${rows}</section>`;
  }

  function answerButton(game, intervalId) {
    const interval = intervalById[intervalId];
    const enabled = game.phase === "playing";
    let statusClass = "";
    if (game.phase === "correct" && game.answeredType === intervalId) statusClass = "correct";
    if (game.phase === "incorrect" && game.answeredType === intervalId) statusClass = "wrong";
    if (game.phase === "incorrect" && game.currentInterval?.intervalType.id === intervalId) statusClass = "revealed";

    return `
      <button class="answer-button ${statusClass}" type="button" data-action="answer" data-answer="${intervalId}" ${enabled ? "" : "disabled"}>
        <span class="answer-short">${interval.short}</span>
        <span class="answer-full">${tInterval(interval)}</span>
      </button>
    `;
  }

  function renderStats() {
    const stats = loadStats();
    const entries = INTERVALS
      .map((interval) => [interval, stats[interval.id] || { correct: 0, total: 0 }])
      .filter(([, stat]) => stat.total > 0)
      .sort(([, a], [, b]) => (b.correct / b.total) - (a.correct / a.total));

    const totalCorrect = entries.reduce((sum, [, stat]) => sum + stat.correct, 0);
    const totalAnswers = entries.reduce((sum, [, stat]) => sum + stat.total, 0);
    const percent = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null;

    app.innerHTML = `
      <main class="screen">
        <header class="header-row">
          <button class="back-button" type="button" data-action="menu">
            <span class="back-chevron" aria-hidden="true">‹</span>
            <span>${text.back}</span>
          </button>
          <h1 class="screen-title">${text.stats}</h1>
        </header>

        <section class="stats-list">
          ${percent === null ? `<div class="empty-state">${text.noStats}</div>` : `
            <div class="stat-card">
              <div class="stat-card-grid">
                <div>
                  <div class="section-label">${text.overall}</div>
                  <div class="overall-percent">${percent}%</div>
                  <div class="small-muted">${totalCorrect} / ${totalAnswers} ${text.correctSlash}</div>
                </div>
                <div class="donut" style="--pct:${percent};--donut-color:${accuracyColor(percent)}">
                  <span>${entries.length} ${text.intervalsCount}</span>
                </div>
              </div>
            </div>
            ${entries.map(([interval, stat]) => statRow(interval, stat)).join("")}
            ${state.confirmClear ? confirmClearMarkup() : `<button class="danger-button" type="button" data-action="ask-clear">${text.clearStats}</button>`}
          `}
        </section>
      </main>
    `;
  }

  function statRow(interval, stat) {
    const percent = Math.round((stat.correct / stat.total) * 100);
    return `
      <div class="stat-row-card">
        <div class="stat-topline">
          <div>
            <span class="interval-id">${interval.short}</span>
            <span class="small-muted">${tInterval(interval)}</span>
          </div>
          <strong style="color:${accuracyColor(percent)};font-family:var(--font-mono);">${percent}%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${percent}%;--bar-color:${accuracyColor(percent)}"></div>
        </div>
        <div class="small-muted">${stat.correct} ${text.correctOf} ${stat.total}</div>
      </div>
    `;
  }

  function confirmClearMarkup() {
    return `
      <div class="confirm-panel">
        <div class="loading-line" style="color:var(--error);">${text.confirmClear}</div>
        <div class="confirm-row">
          <button class="secondary-button" type="button" data-action="cancel-clear">${text.cancel}</button>
          <button class="danger-solid" type="button" data-action="clear-stats">${text.clear}</button>
        </div>
      </div>
    `;
  }

  function render() {
    if (state.screen === "setup") renderSetup();
    else if (state.screen === "game") renderGame();
    else if (state.screen === "stats") renderStats();
    else renderMenu();
  }

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    if (action === "duration") {
      state.selectedDuration = Number(target.dataset.duration);
      render();
      return;
    }

    if (action === "mode") openSetup(target.dataset.mode);
    else if (action === "stats") openStats();
    else if (action === "menu") goMenu();
    else if (action === "timbre") {
      state.selectedTimbre = target.dataset.timbre;
      render();
    } else if (action === "group") {
      toggleGroup(target.dataset.group);
      render();
    } else if (action === "playback") {
      state.selectedPlayback = target.dataset.playback;
      render();
    } else if (action === "start") {
      startGame();
    } else if (action === "play") {
      playNewInterval();
    } else if (action === "repeat") {
      repeatInterval();
    } else if (action === "answer") {
      processAnswer(target.dataset.answer);
    } else if (action === "ask-clear") {
      state.confirmClear = true;
      render();
    } else if (action === "cancel-clear") {
      state.confirmClear = false;
      render();
    } else if (action === "clear-stats") {
      saveStats({});
      state.confirmClear = false;
      render();
    }
  });

  app.addEventListener("input", (event) => {
    const target = event.target.closest('[data-action="volume"]');
    if (!target) return;
    state.volume = Number(target.value) / 100;
    saveVolume(state.volume);
    const section = target.closest(".setup-section");
    const value = section && section.querySelector(".volume-value");
    if (value) value.textContent = `${Math.round(state.volume * 100)}%`;
  });

  app.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target.closest('[role="button"][data-action="mode"]');
    if (!target) return;
    event.preventDefault();
    openSetup(target.dataset.mode);
  });

  render();
})();
