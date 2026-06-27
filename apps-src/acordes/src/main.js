import './style.css';
import { GameEngine, GameMode, Instrument, SessionStatus } from './game-engine.js';
import { AudioPlayer } from './audio-player.js';
import { StatsRepository } from './stats-repository.js';
import { ChordTypeArray, ChordType } from './chord-types.js';
import { chromaticRange } from './music-theory.js';

const STRINGS = {
    es: {
        docTitle: "Acordes - Entrenamiento Auditivo",
        appName: "Acordes",
        appSub: "Entrenamiento Auditivo",
        modesTitle: "Modos de Juego",
        classicTitle: "Modo Clásico",
        classicSub: "10 rondas para practicar a tu ritmo",
        timeTitle: "Contrarreloj",
        timeSub: "Máximo puntaje antes del límite",
        survivalTitle: "Supervivencia",
        survivalSub: "3 errores y estás fuera",
        statsButton: "📊 Ver Estadísticas",
        setupEyebrow: "Configuración",
        setupTitle: "Opciones",
        timeTotal: "Tiempo Total",
        instrument: "Instrumento",
        noteRange: "Rango de Notas",
        to: "a",
        availableChords: "Acordes Disponibles",
        invertSelection: "Invertir Selección",
        volume: "Volumen Global",
        start: "Comenzar",
        exit: "< Salir",
        points: "Puntos",
        seconds: "Segundos",
        statsEyebrow: "Tu Rendimiento",
        statsTitle: "Estadísticas",
        totalAttempts: "Intentos Totales",
        chordAccuracy: "Precisión por Acorde",
        clearStats: "Borrar Estadísticas",
        confirmClear: "¿Estás seguro de que quieres borrar todas las estadísticas?",
        configError: "No se pudieron generar acordes con la configuración actual. Intenta ampliar el rango de notas.",
        unknownChord: "Desconocido",
        correct: "¡Correcto!",
        incorrect: "Incorrecto",
        wellDone: "¡Bien hecho!",
        expectedChord: (name) => `El acorde era ${name}.`,
        correctOf: (correct, total) => `${correct} de ${total} aciertos`,
        noStats: "Juega una partida para ver estadísticas detalladas.",
        timeOptions: ["60 Segundos", "90 Segundos", "120 Segundos"],
    },
    en: {
        docTitle: "Chords - Ear Training",
        appName: "Chords",
        appSub: "Ear Training",
        modesTitle: "Game Modes",
        classicTitle: "Classic Mode",
        classicSub: "10 rounds to practice at your own pace",
        timeTitle: "Time Attack",
        timeSub: "Max score before time runs out",
        survivalTitle: "Survival",
        survivalSub: "3 mistakes and you're out",
        statsButton: "📊 View Statistics",
        setupEyebrow: "Setup",
        setupTitle: "Options",
        timeTotal: "Total Time",
        instrument: "Instrument",
        noteRange: "Note Range",
        to: "to",
        availableChords: "Available Chords",
        invertSelection: "Invert Selection",
        volume: "Global Volume",
        start: "Start",
        exit: "< Exit",
        points: "Points",
        seconds: "Seconds",
        statsEyebrow: "Your Performance",
        statsTitle: "Statistics",
        totalAttempts: "Total Attempts",
        chordAccuracy: "Accuracy by Chord",
        clearStats: "Clear Statistics",
        confirmClear: "Are you sure you want to clear all statistics?",
        configError: "No chords could be generated with the current setup. Try widening the note range.",
        unknownChord: "Unknown",
        correct: "Correct!",
        incorrect: "Incorrect",
        wellDone: "Well done!",
        expectedChord: (name) => `The chord was ${name}.`,
        correctOf: (correct, total) => `${correct} correct of ${total}`,
        noStats: "Play a round to see detailed statistics.",
        timeOptions: ["60 Seconds", "90 Seconds", "120 Seconds"],
    },
};

const INSTRUMENT_LABELS = {
    es: {
        Piano: "Piano",
        Coro: "Coro",
        Corno: "Corno",
        Cello: "Cello",
        Fagot: "Fagot",
        Aleatorio: "Aleatorio",
    },
    en: {
        Piano: "Piano",
        Coro: "Choir",
        Corno: "Horn",
        Cello: "Cello",
        Fagot: "Bassoon",
        Aleatorio: "Random",
    },
};

function detectLang() {
    const params = new URLSearchParams(window.location.search);
    return params.get("lang") === "en" ? "en" : "es";
}

const lang = detectLang();
const copy = STRINGS[lang];

function chordLabel(chord) {
    return lang === "en" ? (chord.displayNameEn || chord.displayName) : chord.displayName;
}

function instrumentLabel(instrument) {
    return INSTRUMENT_LABELS[lang][instrument] || instrument;
}

function applyLanguage() {
    document.documentElement.lang = lang;
    document.title = copy.docTitle;

    const set = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    };

    set('#screen-splash .title', copy.appName);
    set('#screen-menu .eyebrow', copy.appSub);
    set('#screen-menu .title', copy.appName);
    set('#screen-menu .mode-list .screen-title', copy.modesTitle);
    set('[data-action="mode-classic"] .mode-title', copy.classicTitle);
    set('[data-action="mode-classic"] .mode-subtitle', copy.classicSub);
    set('[data-action="mode-time"] .mode-title', copy.timeTitle);
    set('[data-action="mode-time"] .mode-subtitle', copy.timeSub);
    set('[data-action="mode-survival"] .mode-title', copy.survivalTitle);
    set('[data-action="mode-survival"] .mode-subtitle', copy.survivalSub);
    set('[data-action="open-stats"]', copy.statsButton);

    set('#screen-config .eyebrow', copy.setupEyebrow);
    set('#screen-config .screen-title', copy.setupTitle);
    set('#time-limit-group .section-label', copy.timeTotal);
    set('#instrument-options', "");
    set('#range-start + .subtitle', copy.to);
    set('#btn-start-game', copy.start);

    const setupLabels = document.querySelectorAll('#screen-config .section-label');
    if (setupLabels[1]) setupLabels[1].textContent = copy.instrument;
    if (setupLabels[2]) setupLabels[2].textContent = copy.noteRange;
    if (setupLabels[3]) {
        setupLabels[3].innerHTML = `
            ${copy.availableChords}
            <button class="ghost-button" id="toggle-all-chords" style="font-size:0.8rem; min-height:auto; padding:2px 6px;">${copy.invertSelection}</button>
        `;
    }
    if (setupLabels[4]) setupLabels[4].textContent = copy.volume;

    const timeOptions = document.querySelectorAll('#time-limit-select option');
    timeOptions.forEach((option, index) => {
        option.textContent = copy.timeOptions[index] || option.textContent;
    });

    set('#screen-game [data-action="nav-back"] span', copy.exit);
    const gameLabels = document.querySelectorAll('#screen-game .stat-label');
    if (gameLabels[0]) gameLabels[0].textContent = copy.points;
    if (gameLabels[1]) gameLabels[1].textContent = copy.seconds;

    set('#screen-stats .eyebrow', copy.statsEyebrow);
    set('#screen-stats .screen-title', copy.statsTitle);
    const statsLabels = document.querySelectorAll('#screen-stats .stat-label');
    if (statsLabels[0]) statsLabels[0].textContent = copy.totalAttempts;
    set('#screen-stats .section-label', copy.chordAccuracy);
    set('#btn-clear-stats', copy.clearStats);
    set('#feedback-message', copy.correct);
}

// App State
const state = {
    screen: 'splash',
    lang,
    config: {
        mode: GameMode.CLASSIC,
        timeLimitSeconds: 60,
        volume: 0.8,
        rangeStart: 'C3',
        rangeEnd: 'C5',
        instrument: Instrument.PIANO,
        selectedChords: [ChordType.MAJOR.id, ChordType.MINOR.id]
    },
    gameSession: null,
    audio: new AudioPlayer(),
    statsRepo: new StatsRepository(),
    engine: null,
    timerInterval: null
};

// DOM Elements
const screens = {
    splash: document.getElementById('screen-splash'),
    menu: document.getElementById('screen-menu'),
    config: document.getElementById('screen-config'),
    game: document.getElementById('screen-game'),
    stats: document.getElementById('screen-stats')
};

// Initialize App
function initApp() {
    applyLanguage();
    setupEventListeners();
    populateConfigUI();
    void state.audio.preloadEffects();

    // Simulate loading
    setTimeout(() => {
        navigateTo('menu');
    }, 650);
}

function navigateTo(screenId) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
        if (screen) screen.classList.add('hidden');
    });

    const target = screens[screenId];
    if (target) {
        target.classList.remove('hidden');
        setTimeout(() => target.classList.add('active'), 10);
    }
    state.screen = screenId;
}

function setupEventListeners() {
    // Menu
    document.querySelector('[data-action="mode-classic"]').addEventListener('click', () => {
        state.config.mode = GameMode.CLASSIC;
        updateConfigUI();
        navigateTo('config');
    });

    document.querySelector('[data-action="mode-time"]').addEventListener('click', () => {
        state.config.mode = GameMode.TIME_ATTACK;
        state.config.timeLimitSeconds = 60;
        updateConfigUI();
        navigateTo('config');
    });

    document.querySelector('[data-action="mode-survival"]').addEventListener('click', () => {
        state.config.mode = GameMode.SURVIVAL;
        updateConfigUI();
        navigateTo('config');
    });

    document.querySelector('[data-action="open-stats"]').addEventListener('click', () => {
        renderStats();
        navigateTo('stats');
    });

    // Navigation Back
    document.querySelectorAll('[data-action="nav-back"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.screen === 'game') {
                endGameSession();
            }
            navigateTo('menu');
        });
    });

    // Config Actions
    document.getElementById('btn-start-game').addEventListener('click', startGame);
    document.getElementById('toggle-all-chords').addEventListener('click', () => {
        if (state.config.selectedChords.length === ChordTypeArray.length) {
            state.config.selectedChords = [];
        } else {
            state.config.selectedChords = ChordTypeArray.map(c => c.id);
        }
        updateConfigUI();
    });

    // Game Actions
    document.getElementById('btn-play-sound').addEventListener('click', () => {
        playCurrentQuestion();
    });

    // Stats Actions
    document.getElementById('btn-clear-stats').addEventListener('click', () => {
        if (confirm(copy.confirmClear)) {
            state.statsRepo.clear();
            renderStats();
        }
    });

    // Volume Actions
    const volumeSliders = document.querySelectorAll('.volume-slider');
    volumeSliders.forEach(slider => {
        slider.value = state.config.volume;
        slider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            state.config.volume = vol;
            // Update display
            const display = document.getElementById('config-volume-display');
            if (display) display.textContent = Math.round(vol * 100) + '%';

            // Sync all other sliders
            volumeSliders.forEach(s => {
                if (s !== e.target) s.value = vol;
            });
        });
    });
}

function populateConfigUI() {
    // Instruments
    const instContainer = document.getElementById('instrument-options');
    Object.values(Instrument).forEach(inst => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.type = 'button';
        btn.textContent = instrumentLabel(inst);
        btn.dataset.instrument = inst;
        btn.onclick = () => {
            state.config.instrument = inst;
            updateConfigUI();
        };
        instContainer.appendChild(btn);
    });

    // Ranges
    const rangeOptions = chromaticRange('C2', 'C6').filter(n => !n.includes('#') && !n.includes('b'));
    const startSelect = document.getElementById('range-start');
    const endSelect = document.getElementById('range-end');

    rangeOptions.forEach(note => {
        startSelect.add(new Option(note, note));
        endSelect.add(new Option(note, note));
    });

    startSelect.value = state.config.rangeStart;
    endSelect.value = state.config.rangeEnd;

    startSelect.onchange = (e) => state.config.rangeStart = e.target.value;
    endSelect.onchange = (e) => state.config.rangeEnd = e.target.value;

    // Time Limit
    const timeLimitSelect = document.getElementById('time-limit-select');
    timeLimitSelect.value = state.config.timeLimitSeconds;
    timeLimitSelect.onchange = (e) => state.config.timeLimitSeconds = parseInt(e.target.value, 10);

    // Chords
    const chordsContainer = document.getElementById('chords-options');
    ChordTypeArray.forEach(chord => {
        const btn = document.createElement('button');
        btn.className = 'chip chord-btn';
        btn.type = 'button';
        btn.textContent = chordLabel(chord);
        btn.dataset.chordId = chord.id;
        btn.onclick = () => {
            const idx = state.config.selectedChords.indexOf(chord.id);
            if (idx >= 0) {
                state.config.selectedChords.splice(idx, 1);
            } else {
                state.config.selectedChords.push(chord.id);
            }
            updateConfigUI();
        };
        chordsContainer.appendChild(btn);
    });

    updateConfigUI();
}

function updateConfigUI() {
    // Update Instruments
    document.querySelectorAll('#instrument-options .chip').forEach(btn => {
        btn.classList.toggle('is-selected', btn.dataset.instrument === state.config.instrument);
    });

    // Update Chords
    document.querySelectorAll('.chord-btn').forEach(btn => {
        btn.classList.toggle('is-selected', state.config.selectedChords.includes(btn.dataset.chordId));
    });

    // Update Time Limit visibility
    const timeGroup = document.getElementById('time-limit-group');
    if (state.config.mode === GameMode.TIME_ATTACK) {
        timeGroup.classList.remove('hidden');
    } else {
        timeGroup.classList.add('hidden');
    }

    const startBtn = document.getElementById('btn-start-game');
    startBtn.disabled = state.config.selectedChords.length === 0;
}

// Game Logic
async function startGame() {
    state.engine = new GameEngine(state.config);
    state.gameSession = state.engine.start();

    if (!state.gameSession.question) {
        alert(copy.configError);
        return;
    }

    navigateTo('game');
    setupGameAnswers();
    updateGameUI();

    // Start Audio Context if suspended
    if (state.audio.audioContext && state.audio.audioContext.state === 'suspended') {
        await state.audio.audioContext.resume();
    }

    playCurrentQuestion();

    if (state.config.mode === GameMode.TIME_ATTACK) {
        startTimer();
    }
}

function setupGameAnswers() {
    const grid = document.getElementById('answers-grid');
    grid.innerHTML = '';

    // Only show answers that are selected in config
    const availableChords = ChordTypeArray.filter(c => state.config.selectedChords.includes(c.id));

    availableChords.forEach(chord => {
        const btn = document.createElement('button');
        btn.className = 'secondary-button answer-btn';
        btn.textContent = chordLabel(chord);
        btn.onclick = () => handleAnswer(chord.id, btn);
        grid.appendChild(btn);
    });
}

function handleAnswer(chordId, buttonEl) {
    if (state.gameSession.status !== SessionStatus.PLAYING) return;

    const result = state.engine.submitAnswer(state.gameSession, chordId);
    state.gameSession = result.state;

    // Record Stats
    if (result.answeredChord) {
        state.statsRepo.record(result.answeredChord, result.wasCorrect);
    }

    // UI Feedback
    buttonEl.style.borderColor = result.wasCorrect ? 'var(--correct)' : 'var(--error)';
    buttonEl.style.color = result.wasCorrect ? 'var(--correct)' : 'var(--error)';
    buttonEl.style.background = result.wasCorrect ? 'var(--correct-dim)' : 'var(--error-dim)';

    if (result.wasCorrect) {
        state.audio.playCorrectEffect(state.config.volume);
    } else {
        state.audio.playIncorrectEffect(state.config.volume);
    }

    showResultOverlay(result.wasCorrect, result.answeredChord);

    // Next round logic
    if (state.gameSession.status === SessionStatus.PLAYING) {
        setTimeout(() => {
            buttonEl.style = ''; // Reset inline styles
            hideResultOverlay();
            state.gameSession = state.engine.nextQuestion(state.gameSession);
            updateGameUI();
            playCurrentQuestion();
        }, 1200);
    } else {
        setTimeout(() => {
            hideResultOverlay();
            endGameSession();
            renderStats();
            navigateTo('stats');
        }, 1500);
    }
}

function showResultOverlay(isCorrect, chordId) {
    const overlay = document.getElementById('feedback-overlay');
    const icon = document.getElementById('feedback-icon');
    const title = document.getElementById('feedback-message');
    const desc = document.getElementById('feedback-sub');

    const chord = ChordTypeArray.find(c => c.id === chordId);
    const chordName = chord ? chordLabel(chord) : copy.unknownChord;

    icon.textContent = isCorrect ? '✅' : '❌';
    title.textContent = isCorrect ? copy.correct : copy.incorrect;
    title.style.color = isCorrect ? 'var(--correct)' : 'var(--error)';
    desc.textContent = isCorrect ? copy.wellDone : copy.expectedChord(chordName);

    overlay.classList.remove('hidden');
}

function hideResultOverlay() {
    document.getElementById('feedback-overlay').classList.add('hidden');
}

function updateGameUI() {
    const scoreBadge = document.getElementById('game-score');
    const timerBadge = document.getElementById('game-timer');
    const timerContainer = document.getElementById('game-timer-container');
    const livesBadge = document.getElementById('game-lives');
    const livesContainer = document.getElementById('game-lives-container');

    scoreBadge.textContent = `${state.gameSession.score}`;

    if (state.config.mode === GameMode.TIME_ATTACK) {
        timerContainer.classList.remove('hidden');
        timerBadge.textContent = `${state.gameSession.timeLeft}`;
    } else {
        timerContainer.classList.add('hidden');
    }

    if (state.config.mode === GameMode.SURVIVAL) {
        livesContainer.classList.remove('hidden');
        const heartsHTML = '❤️'.repeat(state.gameSession.lives) + '<span class="lost">❤️</span>'.repeat(3 - state.gameSession.lives);
        livesBadge.innerHTML = heartsHTML;
    } else {
        livesContainer.classList.add('hidden');
    }
}

function playCurrentQuestion() {
    const q = state.gameSession.question;
    if (q) {
        state.audio.playChord(q.notes, q.instrument, state.config.volume);
    }
}

function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        if (!state.engine || !state.gameSession) return clearInterval(state.timerInterval);

        state.gameSession = state.engine.tick(state.gameSession);
        updateGameUI();

        if (state.gameSession.status !== SessionStatus.PLAYING) {
            clearInterval(state.timerInterval);
            endGameSession();
            renderStats();
            navigateTo('stats');
        }
    }, 1000);
}

function endGameSession() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.audio.stopChord();
    state.engine = null;
}

// Stats UI
function renderStats() {
    const list = document.getElementById('stats-chords-list');
    const totalGames = document.getElementById('stat-total-games');

    const stats = state.statsRepo.load();
    let totalAttempts = 0;

    list.innerHTML = '';

    ChordTypeArray.forEach(chord => {
        const stat = stats[chord.id];
        if (!stat || stat.total === 0) return;

        totalAttempts += stat.total;
        const accuracy = Math.round((stat.correct / stat.total) * 100);

        const el = document.createElement('div');
        el.className = 'stat-row-card';
        el.style.padding = '12px 16px';
        el.style.display = 'flex';
        el.style.justifyContent = 'space-between';
        el.style.alignItems = 'center';

        el.innerHTML = `
            <div>
                <div class="stat-name" style="font-weight:700;">${chordLabel(chord)}</div>
                <div class="stat-details small-muted">${copy.correctOf(stat.correct, stat.total)}</div>
            </div>
            <div class="stat-accuracy" style="font-family:var(--font-display); font-size:1.2rem; font-weight:800; color: ${accuracy >= 80 ? 'var(--correct)' : accuracy <= 40 ? 'var(--error)' : 'var(--accent)'}">${accuracy}%</div>
        `;
        list.appendChild(el);
    });

    if (totalAttempts === 0) {
        list.innerHTML = `<div class="small-muted" style="padding:16px;">${copy.noStats}</div>`;
    }

    totalGames.textContent = totalAttempts;
}

// Boot
window.addEventListener('DOMContentLoaded', initApp);
