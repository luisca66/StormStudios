import { t, english } from "./i18n";

// ══════════════════════════════════════════════════════════════════════════════
//  GUITAR DATA
// ══════════════════════════════════════════════════════════════════════════════

const BASE = 'https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev/';

// Chromatic scale — canonical names always use sharps internally
const NOTES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

// Standard tuning open-string MIDI notes (index 0 = high e, index 5 = low E)
// E4=64, B3=59, G3=55, D3=50, A2=45, E2=40
const OPEN_MIDI = [64, 59, 55, 50, 45, 40];

// Open-string note indices into NOTES_SHARP (same data, used for noteAt())
const OPEN_IDX = [4, 11, 7, 2, 9, 4]; // E B G D A E

// Display labels (high e → low E)
const SNAMES = ['e','B','G','D','A','E'];

// Server folder names per string (same order)
const SFOLDER = [
  'E String high',   // string idx 0 = string 1 = high e  (E4–E5)
  'B String',        // string idx 1 = string 2 = B       (B3–B4)
  'G String',        // string idx 2 = string 3 = G       (G3–G4)
  'D String',        // string idx 3 = string 4 = D       (D3–D4)
  'A String',        // string idx 4 = string 5 = A       (A2–A3)
  'E String low',    // string idx 5 = string 6 = low E   (E2–E3)
];

const NFRETS = 12; // frets 0–12


// ══════════════════════════════════════════════════════════════════════════════
//  AUDIO  (Web Audio API — samples precargados, decodificados bajo demanda)
// ══════════════════════════════════════════════════════════════════════════════

// iOS 17+: sonar aunque el switch de silencio esté activado (como hacía <audio>)
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}

const AC = window.AudioContext || window.webkitAudioContext;
const audioCtx = AC ? new AC() : null;

const FEEDBACK_URLS = [BASE + 'acierto.mp3', BASE + 'error.mp3'];

// Compressed MP3 bytes for every sample (~120 KB each, ~10 MB total).
// Decoded buffers are ~2.5 MB each, so only a few are kept at once (LRU).
const rawCache = new Map();   // url → Promise<ArrayBuffer|null>
const decoded  = new Map();   // url → Promise<AudioBuffer|null>, oldest first
const MAX_DECODED = 12;
const PINNED = new Set(FEEDBACK_URLS);

let audioEnabled = false;

function fetchRaw(url) {
  if (!rawCache.has(url)) {
    rawCache.set(url, fetch(url)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .catch(err => {
        console.warn('[audio] no se pudo descargar', url, err);
        rawCache.delete(url); // allow a retry later
        return null;
      }));
  }
  return rawCache.get(url);
}

function decodeUrl(url) {
  if (decoded.has(url)) {
    const p = decoded.get(url);
    decoded.delete(url);
    decoded.set(url, p); // mark as most recently used
    return p;
  }
  const p = fetchRaw(url)
    .then(raw => {
      if (!raw) throw new Error('sin datos');
      // decodeAudioData detaches its input, so decode a copy; callback form for older Safari
      return new Promise((res, rej) => audioCtx.decodeAudioData(raw.slice(0), res, rej));
    })
    .catch(err => {
      console.warn('[audio] no se pudo decodificar', url, err);
      if (decoded.get(url) === p) decoded.delete(url);
      return null;
    });
  decoded.set(url, p);
  for (const key of decoded.keys()) {
    if (decoded.size <= MAX_DECODED) break;
    if (!PINNED.has(key)) decoded.delete(key);
  }
  return p;
}

// Download every sample in the background, a few at a time so the note
// the player needs right now isn't stuck behind 80 other requests.
function preloadSamples() {
  if (!audioCtx) return;
  FEEDBACK_URLS.forEach(decodeUrl);
  const urls = [];
  for (let s = 0; s < SFOLDER.length; s++)
    for (let f = 0; f <= NFRETS; f++)
      urls.push(sampleUrl(s, f));
  let i = 0;
  const worker = () => (i < urls.length ? fetchRaw(urls[i++]).then(worker) : null);
  for (let k = 0; k < 4; k++) worker();
}

// Decode a note ahead of time so it plays instantly when its round comes up
function primeNote(s, f) {
  if (audioCtx) decodeUrl(sampleUrl(s, f));
}

// Browsers only allow audio to start from a user gesture. Not { once: true }:
// iOS suspends the context when the app goes to background or a call comes in.
function unlockAudio() {
  audioEnabled = true;
  if (!audioCtx || audioCtx.state === 'running') return;
  audioCtx.resume().catch(() => {});
  // Older iOS also needs a sound started inside the gesture
  const src = audioCtx.createBufferSource();
  src.buffer = audioCtx.createBuffer(1, 1, 22050);
  src.connect(audioCtx.destination);
  src.start(0);
}
['pointerdown', 'touchend', 'keydown'].forEach(ev =>
  document.addEventListener(ev, unlockAudio, { capture: true, passive: true }));

/**
 * Build the URL for a given string + fret.
 * MIDI → note name + octave → folder/file.mp3
 * '#' must be percent-encoded as %23 in URLs.
 */
function sampleUrl(s, f) {
  const midi = OPEN_MIDI[s] + f;
  const note = NOTES_SHARP[midi % 12];
  const oct  = Math.floor(midi / 12) - 1;           // MIDI 60 = C4
  const file = note + oct + '.mp3';
  return BASE + encodeURIComponent(SFOLDER[s]) + '/' + encodeURIComponent(file);
}

function playBuffer(buf, vol) {
  const src  = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  src.buffer = buf;
  gain.gain.value = vol;
  src.connect(gain);
  gain.connect(audioCtx.destination);
  src.start(0);
}

// maxWait (ms): skip the sound if it isn't ready in time, so it never plays late
function playUrl(url, vol = 1, maxWait = Infinity) {
  if (!audioCtx) {
    // Fallback for browsers without Web Audio
    try {
      const a = new Audio(url);
      a.volume = vol;
      a.play().catch(() => {});
    } catch (e) {}
    return;
  }
  if (audioCtx.state !== 'running') audioCtx.resume().catch(() => {});
  const t0 = performance.now();
  decodeUrl(url).then(buf => {
    if (buf && performance.now() - t0 <= maxWait) playBuffer(buf, vol);
  });
}

function playNote(s, f) {
  if (audioEnabled) playUrl(sampleUrl(s, f), 1, 1500);
}

function playFeedback(ok) {
  if (audioEnabled) playUrl(BASE + (ok ? 'acierto.mp3' : 'error.mp3'), 0.65, 500);
}

function replayNote() {
  audioEnabled = true; // clicking the button counts as interaction
  const btn = document.getElementById('play-btn');
  btn.classList.remove('ringing');
  void btn.offsetWidth; // force reflow to restart animation
  btn.classList.add('ringing');
  playUrl(sampleUrl(curS, curF));
}

// Start background loading only after the first gesture.
document.addEventListener('pointerdown', preloadSamples, {once:true});


// ══════════════════════════════════════════════════════════════════════════════
//  NOTE DISPLAY  (sharp / flat modes)
// ══════════════════════════════════════════════════════════════════════════════

let mode = 'sharp'; // 'sharp' | 'flat'

// Canonical note name (always sharp) → display name for current mode
function displayNote(sharp) {
  if (mode === 'flat') return NOTES_FLAT[NOTES_SHARP.indexOf(sharp)];
  return sharp;
}

// Note at string s, fret f — always returns a sharp name
function noteAt(s, f) {
  return NOTES_SHARP[(OPEN_IDX[s] + f) % 12];
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mbtn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === m)
  );
  // Update button labels without touching classes
  document.querySelectorAll('.nbtn').forEach(b => {
    b.textContent = displayNote(b.dataset.sharp);
  });
}


// ══════════════════════════════════════════════════════════════════════════════
//  BUILD UI
// ══════════════════════════════════════════════════════════════════════════════

function buildFretNums() {
  const row = document.getElementById('fret-nums');
  for (let f = 0; f <= NFRETS; f++) {
    const d = document.createElement('div');
    d.className = 'fn';
    d.textContent = f;
    row.appendChild(d);
  }
}

function buildNeck() {
  const neck  = document.getElementById('neck');
  const thick = [1, 1.5, 2, 2.5, 3, 3.5]; // px — high e is thinnest
  const alpha = [0.58, 0.62, 0.66, 0.70, 0.74, 0.78];

  for (let s = 0; s < 6; s++) {
    const row = document.createElement('div');
    row.className = 'srow';

    // String name label
    const lbl = document.createElement('div');
    lbl.className = 'slabel';
    lbl.textContent = SNAMES[s];
    row.appendChild(lbl);

    // Cell container
    const cells = document.createElement('div');
    cells.className = 'fcells';

    // The physical string line (CSS only, runs full width)
    const line = document.createElement('div');
    line.style.cssText = [
      'position:absolute', 'top:50%', 'left:0', 'right:0',
      `height:${thick[s]}px`,
      'transform:translateY(-50%)',
      `background:linear-gradient(90deg,
        rgba(235,215,165,${alpha[s]-0.12}),
        rgba(255,235,180,${alpha[s]}),
        rgba(235,215,165,${alpha[s]-0.12}))`,
      'box-shadow:0 0 2px rgba(245,225,175,.22),0 1px 2px rgba(0,0,0,.5)',
      'pointer-events:none', 'z-index:1'
    ].join(';');
    cells.appendChild(line);

    // Fret cells (0 = nut/open, 1–12 = frets)
    for (let f = 0; f <= NFRETS; f++) {
      const cell = document.createElement('div');
      cell.id        = `c-${s}-${f}`;
      cell.className = 'fc ' + (f === 0 ? 'nut' : 'fw');

      const dot = document.createElement('div');
      dot.id        = `d-${s}-${f}`;
      dot.className = 'pdot';
      cell.appendChild(dot);

      cells.appendChild(cell);
    }

    row.appendChild(cells);
    neck.appendChild(row);
  }
}

// Inlay position markers (must run after layout)
function buildInlays() {
  const neck  = document.getElementById('neck');
  const layer = document.getElementById('inlay-layer');
  layer.innerHTML = '';
  const nRect = neck.getBoundingClientRect();
  const nH    = neck.offsetHeight;

  function addDot(fret, yFrac, size) {
    const cell = document.getElementById(`c-0-${fret}`);
    if (!cell) return;
    const cr = cell.getBoundingClientRect();
    const x  = cr.left - nRect.left + cr.width / 2;
    const y  = nH * yFrac;
    const el = document.createElement('div');
    el.className = 'inlay';
    el.style.cssText = `left:${x-size/2}px;top:${y-size/2}px;width:${size}px;height:${size}px`;
    layer.appendChild(el);
  }

  [3, 5, 7, 9].forEach(f => addDot(f, 0.5, 13));  // single dots
  addDot(12, 0.27, 11);                            // double dot (high side)
  addDot(12, 0.73, 11);                            // double dot (low side)
}

function buildButtons() {
  const grid = document.getElementById('note-grid');
  NOTES_SHARP.forEach(sharp => {
    const btn = document.createElement('button');
    btn.className      = 'nbtn';
    btn.dataset.sharp  = sharp;          // canonical ID — never changes
    btn.textContent    = displayNote(sharp); // respects current mode
    btn.title          = sharp;
    btn.onclick        = () => answer(sharp); // always passes canonical sharp
    grid.appendChild(btn);
  });
}

function buildTimeOptions() {
  const select = document.getElementById('time-limit');
  for (let seconds = 5; seconds <= 20; seconds++) {
    const option = document.createElement('option');
    option.value = seconds;
    option.textContent = `${seconds} ${english ? "seconds" : "segundos"}`;
    if (seconds === 10) option.selected = true;
    select.appendChild(option);
  }
}

function centerCurrentFret(behavior = 'smooth') {
  const scroller = document.querySelector('.fb-scroll');
  const cell = document.getElementById(`c-${curS}-${curF}`);
  if (!scroller || !cell) return;

  const scrollerRect = scroller.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();
  const targetLeft =
    scroller.scrollLeft +
    (cellRect.left + cellRect.width / 2) -
    (scrollerRect.left + scroller.clientWidth / 2);

  scroller.scrollTo({
    left: Math.max(0, targetLeft),
    behavior
  });
}


// ══════════════════════════════════════════════════════════════════════════════
//  GAME LOGIC
// ══════════════════════════════════════════════════════════════════════════════

const GAME_SECTION_IDS = [
  'session-bar',
  'scorebar',
  'question-box',
  'fretboard-scroll',
  'fretboard-hint',
  'answer-area',
  'feedback-zone',
  'streak-box',
  'key-hint'
];

let curS = 0;
let curF = 0;
let hits = 0;

// Shuffle bag: all (string, fret) combos visited once before repeating
let bag = [];
function refillBag() {
  bag = [];
  for (let s = 0; s < 6; s++)
    for (let f = 0; f <= NFRETS; f++)
      bag.push([s, f]);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}
function pickFromBag() {
  if (bag.length === 0) refillBag();
  return bag.pop();
}
let total = 0;
let streak = 0;
let strikes = 0;
let done = false;
let sessionActive = false;
let gameMode = 'classic';
let timeLimit = 10;
let timerLeft = 10;
let roundTimer = 0;
let autoAdvanceTimer = 0;
let primaryAction = 'next';

function updateScoreboard() {
  document.getElementById('s-ok').textContent = hits;
  document.getElementById('s-tot').textContent = total;
  document.getElementById('s-pct').textContent = total ? Math.round(hits / total * 100) + '%' : '—';
  document.getElementById('streak-v').textContent = streak;
}

function updateSessionBar() {
  const isTimeAttack = gameMode === 'time';
  const modeLabel = isTimeAttack ? 'Time Attack' : t("Clásico");
  document.getElementById('game-mode-v').textContent = modeLabel;
  document.getElementById('timer-chip').hidden = !isTimeAttack;
  document.getElementById('strike-chip').hidden = !isTimeAttack;
  document.getElementById('timer-v').textContent = `${isTimeAttack ? timerLeft : timeLimit}s`;
  document.getElementById('strikes-v').textContent = `${strikes}/3`;
  document.getElementById('strikes-v').classList.toggle('danger', strikes >= 2);
}

function setSectionsVisible(visible) {
  GAME_SECTION_IDS.forEach(id => {
    document.getElementById(id).hidden = !visible;
  });
  document.getElementById('setup-card').hidden = visible;
}

function setGameMode(nextMode) {
  gameMode = nextMode;
  document.querySelectorAll('.setup-option').forEach(option => {
    option.classList.toggle('active', option.dataset.gameMode === nextMode);
  });
  document.getElementById('timer-config').hidden = nextMode !== 'time';
  timerLeft = timeLimit;
  updateSessionBar();
}

function setTimeLimit(value) {
  timeLimit = Number(value);
  timerLeft = timeLimit;
  updateSessionBar();
}

function clearTimers() {
  clearInterval(roundTimer);
  clearTimeout(autoAdvanceTimer);
  roundTimer = 0;
  autoAdvanceTimer = 0;
}

function setPrimaryAction(action, label, show) {
  if (show && !sessionActive) return;
  primaryAction = action;
  const btn = document.getElementById('next-btn');
  btn.textContent = label;
  btn.className = show ? 'next-btn show' : 'next-btn';
}

function handlePrimaryAction() {
  if (primaryAction === 'restart') {
    startSession();
    return;
  }
  if (done) nextQ();
}

function queueNextRound(delay) {
  clearTimeout(autoAdvanceTimer);
  autoAdvanceTimer = setTimeout(() => {
    if (sessionActive) nextQ();
  }, delay);
}

function startRoundTimer() {
  clearInterval(roundTimer);
  roundTimer = 0;
  if (gameMode !== 'time' || !sessionActive) return;

  timerLeft = timeLimit;
  updateSessionBar();
  roundTimer = setInterval(() => {
    timerLeft--;
    updateSessionBar();
    if (timerLeft <= 0) {
      clearInterval(roundTimer);
      roundTimer = 0;
      resolveAnswer(null, { timedOut: true });
    }
  }, 1000);
}

function startSession() {
  clearTimers();
  sessionActive = true;
  hits = 0;
  total = 0;
  streak = 0;
  strikes = 0;
  timerLeft = timeLimit;
  done = false;
  updateScoreboard();
  updateSessionBar();
  document.getElementById('fb-msg').textContent = '';
  document.getElementById('fb-msg').className = 'fb-msg';
  setPrimaryAction('next', t("Siguiente →"), false);
  setSectionsVisible(true);
  nextQ();
}

function goToSetup() {
  clearTimers();
  sessionActive = false;
  done = false;
  document.getElementById(`d-${curS}-${curF}`)?.classList.remove('on');
  document.getElementById('fb-msg').textContent = '';
  document.getElementById('fb-msg').className = 'fb-msg';
  setPrimaryAction('next', t("Siguiente →"), false);
  setSectionsVisible(false);
  updateSessionBar();
}

function nextQ() {
  if (!sessionActive || (gameMode === 'time' && strikes >= 3)) return;
  clearTimers();

  // Remove old dot
  document.getElementById(`d-${curS}-${curF}`)?.classList.remove('on');

  // Reset buttons
  document.querySelectorAll('.nbtn').forEach(b => {
    b.disabled = false;
    b.classList.remove('is-ok', 'is-err');
  });

  // Hide feedback
  document.getElementById('fb-msg').className = 'fb-msg';
  document.getElementById('fb-msg').textContent = '';
  document.getElementById('next-btn').className = 'next-btn';

  // New position from shuffle bag (no repeats until all visited)
  [curS, curF] = pickFromBag();
  if (bag.length) primeNote(...bag[bag.length - 1]); // next round's note
  done = false;

  document.getElementById('q-str').textContent  = curS + 1;
  document.getElementById('q-fret').textContent = curF;

  requestAnimationFrame(() => {
    document.getElementById(`d-${curS}-${curF}`)?.classList.add('on');
    centerCurrentFret(total ? 'smooth' : 'auto');
    startRoundTimer();
    setTimeout(() => playNote(curS, curF), 80); // slight delay so dot appears first
  });
}

function answer(sharp) {
  resolveAnswer(sharp);
}

function resolveAnswer(sharp, { timedOut = false } = {}) {
  if (!sessionActive || done) return;
  done = true;
  clearInterval(roundTimer);
  roundTimer = 0;

  const correct = noteAt(curS, curF);
  const ok      = !timedOut && sharp === correct;

  total++;
  if (ok) {
    hits++;
    streak++;
  } else {
    streak = 0;
    if (gameMode === 'time') strikes++;
  }
  updateScoreboard();
  updateSessionBar();
  try { localStorage.setItem('storm-diapason-progress', JSON.stringify({hits,total,streak,strikes})); } catch {}

  // Mark buttons — use data-sharp attribute for lookup
  document.querySelectorAll('.nbtn').forEach(b => b.disabled = true);
  document.querySelector(`.nbtn[data-sharp="${correct}"]`).classList.add('is-ok');
  if (!ok && sharp) document.querySelector(`.nbtn[data-sharp="${sharp}"]`)?.classList.add('is-err');

  // Feedback text
  const fb = document.getElementById('fb-msg');
  if (ok) {
    const msgs = [t("¡Correcto!"), t("¡Exacto!"), t("¡Muy bien!"), t("¡Perfecto!"), t("¡Excelente!")];
    fb.textContent = msgs[Math.floor(Math.random() * msgs.length)];
    fb.className   = 'fb-msg ok show';
  } else if (timedOut) {
    fb.textContent = gameMode === 'time'
      ? (english ? `Time’s up — strike ${strikes} of 3` : `Tiempo agotado — strike ${strikes} de 3`)
      : (english ? `Time’s up — it was ${displayNote(correct)}` : `Tiempo agotado — era ${displayNote(correct)}`);
    fb.className = 'fb-msg err show';
  } else if (gameMode === 'time') {
    fb.textContent = (english ? `Strike ${strikes} of 3 — it was ${displayNote(correct)}` : `Strike ${strikes} de 3 — era ${displayNote(correct)}`);
    fb.className   = 'fb-msg err show';
  } else {
    fb.textContent = (english ? `Incorrect — it was ${displayNote(correct)}` : `Incorrecto — era ${displayNote(correct)}`);
    fb.className   = 'fb-msg err show';
  }

  // Audio feedback
  playFeedback(ok);

  if (gameMode === 'time') {
    if (!ok && strikes >= 3) {
      fb.textContent = t("Game over — 3 strikes. Intenta de nuevo.");
      fb.className = 'fb-msg err show';
      autoAdvanceTimer = setTimeout(() => {
        setPrimaryAction('restart', t("Intenta de nuevo"), true);
      }, 280);
      return;
    }
    queueNextRound(ok ? 700 : 1100);
    return;
  }

  // Show "Next" button with slight delay
  autoAdvanceTimer = setTimeout(() => {
    setPrimaryAction('next', t("Siguiente →"), true);
  }, 400);
}


// ══════════════════════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════════════════════

buildFretNums();
buildNeck();
buildButtons();
buildTimeOptions();
document.body.classList.add('app-ready');
setGameMode('classic');
goToSetup();

// Inlays need the DOM fully laid out
requestAnimationFrame(() => requestAnimationFrame(buildInlays));

let layoutTimer = 0;
function refreshMobileLayout() {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => {
    buildInlays();
    centerCurrentFret('auto');
  }, 120);
}

window.addEventListener('resize', refreshMobileLayout);
window.addEventListener('orientationchange', refreshMobileLayout);

// Keyboard: Enter or Space advances to next question
document.addEventListener('keydown', e => {
  if (e.target instanceof Element && e.target.closest('button, select, input')) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (!document.getElementById('setup-card').hidden) {
    e.preventDefault();
    startSession();
    return;
  }
  if (done) {
    e.preventDefault();
    handlePrimaryAction();
  }
});

Object.assign(window, {setGameMode, setTimeLimit, startSession, goToSetup, replayNote, setMode, handlePrimaryAction});
export {playNote, unlockAudio, buildInlays, centerCurrentFret};
