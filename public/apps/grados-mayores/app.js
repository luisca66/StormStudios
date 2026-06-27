// app.js — UI y orquestación de "Grados Escala Mayor" (web).
import {
  SCALES, DIATONIC_DEGREES, CHROMATIC_DEGREES, ALL_DEGREES_OPTIONS,
  TIMBRES, RANDOM_TIMBRE, CHORD_TONICS, DEGREE_GLOSSARY, I18N,
  MODE_KEYS, TIME_ATTACK_OPTIONS, SURVIVAL_LIVES, scaleDegrees,
} from "./data.js";
import {
  audioUrl, buildQuestionSet, makeDegreeNoteSelector, getSupportAssetBaseDir,
  loadStats, saveStats, updateStats, clearStats,
  totalAttempts, totalCorrect, totalAccuracy, topPracticedDegree,
  sortDegrees, formatPercent,
} from "./engine.js";

/* ---------- helpers DOM ---------- */
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  return node;
}
const $ = (sel, root = document) => root.querySelector(sel);

/* ---------- audio ---------- */
class AudioPlayer {
  constructor() { this.el = null; }
  play(relPath, loop = false, onEnd) {
    this.stop();
    const a = new Audio(audioUrl(relPath));
    a.loop = !!loop;
    a.addEventListener("ended", () => {
      if (!a.loop && this.el === a) this.el = null;
      if (onEnd) onEnd();
    });
    this.el = a;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    return a;
  }
  setLooping(on) { if (this.el) this.el.loop = on; }
  stop() {
    if (this.el) {
      try { this.el.pause(); this.el.currentTime = 0; } catch (e) {}
      this.el = null;
    }
  }
  release() { this.stop(); }
}

/* ---------- estado global ---------- */
const params = new URLSearchParams(location.search);
const lang = (params.get("lang") || document.documentElement.lang || "es").startsWith("en") ? "en" : "es";
document.documentElement.lang = lang;

const state = {
  lang,
  t: I18N[lang],
  screen: "intro",
  mode: "CLASSIC",
  scale: "C",
  timbre: "Piano",
  timeAttackDuration: 90,
  selectedDegrees: new Set(DIATONIC_DEGREES),
  stats: loadStats(),
};

const root = () => document.getElementById("app");
let activeTraining = null;

function go(screen) {
  if (activeTraining) { activeTraining.destroy(); activeTraining = null; }
  state.screen = screen;
  render();
}

/* ---------- componentes compartidos ---------- */
function sectionCard(title, ...content) {
  return h("section", { class: "card section-card" },
    title ? h("h3", { class: "section-title" }, title) : null,
    h("div", { class: "section-body" }, ...content));
}
function metricCard(title, value) {
  return h("div", { class: "metric" },
    h("span", { class: "metric-label" }, title),
    h("span", { class: "metric-value" }, value));
}
function pill(title, value) {
  return h("div", { class: "pill" },
    h("span", { class: "pill-label" }, title),
    h("span", { class: "pill-value" }, value));
}
function summaryRow(lT, lV, rT, rV) {
  return h("div", { class: "summary-row" }, metricCard(lT, lV), metricCard(rT, rV));
}
function primaryButton(label, onClick, opts = {}) {
  return h("button", { class: "btn btn-primary" + (opts.block ? " block" : ""), onclick: onClick, disabled: opts.disabled }, label);
}
function outlineButton(label, onClick, opts = {}) {
  return h("button", { class: "btn btn-outline" + (opts.block ? " block" : "") + (opts.danger ? " danger" : ""), onclick: onClick, disabled: opts.disabled }, label);
}
function degreeLabel(degree) {
  const g = DEGREE_GLOSSARY[degree];
  return g ? `${degree} — ${g[state.lang]}` : degree;
}

/* ---------- pantalla: INTRO ---------- */
function IntroScreen() {
  const t = state.t;
  return h("div", { class: "screen intro" },
    h("div", { class: "intro-card card" },
      h("div", { class: "logo-badge" }, h("div", { class: "logo-mark" }, "♪")),
      h("h1", { class: "display" }, t.appTitle),
      h("p", { class: "lead" }, t.appTagline),
      h("div", { class: "credits card-inner" },
        h("h4", {}, t.creditsTitle),
        h("p", {}, t.creditsBody)),
      h("a", { class: "link-btn", href: "https://www.stormstudios.com.mx/", target: "_blank", rel: "noopener" }, t.visitWebsite),
      primaryButton(t.start, () => go("home"), { block: true })));
}

/* ---------- pantalla: HOME ---------- */
function modeCard(icon, title, subtitle, btnLabel, onClick) {
  return h("section", { class: "card mode-card" },
    h("div", { class: "mode-head" },
      h("div", { class: "mode-icon" }, icon),
      h("div", {}, h("h3", { class: "mode-title" }, title), h("p", { class: "mode-sub" }, subtitle))),
    primaryButton(btnLabel, onClick, { block: true }));
}
function HomeScreen() {
  const t = state.t, s = state.stats;
  const m = (k) => t.modes[k];
  return h("div", { class: "screen home" },
    h("h2", { class: "headline" }, t.chooseExperience),
    h("p", { class: "muted" }, t.chooseSubtitle),
    h("section", { class: "card summary-card" },
      h("h3", { class: "section-title" }, t.quickSummary),
      h("div", { class: "pill-row" },
        pill(t.attempts, String(totalAttempts(s))),
        pill(t.accuracy, formatPercent(totalAccuracy(s), state.lang)),
        pill(t.mostUsed, topPracticedDegree(s) || "--"))),
    modeCard("🎓", m("CLASSIC").title, m("CLASSIC").subtitle, t.configure, () => { state.mode = "CLASSIC"; go("setup"); }),
    modeCard("⏱️", m("TIME_ATTACK").title, m("TIME_ATTACK").subtitle, t.configure, () => { state.mode = "TIME_ATTACK"; go("setup"); }),
    modeCard("❤️", m("SURVIVAL").title, m("SURVIVAL").subtitle, t.configure, () => { state.mode = "SURVIVAL"; go("setup"); }),
    modeCard("📊", t.statsTitle, t.statsSubtitle, t.viewProgress, () => go("stats")));
}

/* ---------- pantalla: SETUP ---------- */
function chip(label, selected, onClick, title) {
  return h("button", { class: "chip" + (selected ? " selected" : ""), onclick: onClick, title: title || "" }, label);
}
function selectField(label, value, options, onChange) {
  const sel = h("select", { class: "select", onchange: (e) => onChange(e.target.value) },
    ...options.map((o) => h("option", { value: o, selected: o === value }, o)));
  return h("div", { class: "field" }, h("label", {}, label), sel);
}
function SetupScreen() {
  const t = state.t;
  const mode = state.mode;
  const previewCount = buildQuestionSet(state.scale, state.selectedDegrees, state.timbre).length;
  const canStart = state.selectedDegrees.size > 0 && previewCount > 0;

  const screen = h("div", { class: "screen setup" });

  const topbar = h("div", { class: "topbar" },
    h("button", { class: "icon-btn", onclick: () => go("home"), "aria-label": t.back }, "←"),
    h("span", { class: "topbar-title" }, t.setupTitle));

  // modo + duración
  const modeSection = sectionCard(t.selectedMode,
    h("h2", { class: "headline" }, t.modes[mode].title),
    h("p", { class: "muted" }, t.modes[mode].subtitle),
    mode === "TIME_ATTACK"
      ? h("div", {},
          h("p", { class: "field-label" }, t.duration),
          h("div", { class: "chip-row" }, ...TIME_ATTACK_OPTIONS.map((d) =>
            chip(`${d} s`, state.timeAttackDuration === d, () => { state.timeAttackDuration = d; rerender(); }))))
      : null);

  // tonalidad + timbre
  const timbreOptions = TIMBRES.map((x) => x === RANDOM_TIMBRE ? t.randomTimbre : x);
  const currentTimbreLabel = state.timbre === RANDOM_TIMBRE ? t.randomTimbre : state.timbre;
  const keySection = sectionCard(t.keyAndTimbre,
    selectField(t.majorScale, state.scale, SCALES, (v) => { state.scale = v; rerender(); }),
    selectField(t.timbre, currentTimbreLabel, timbreOptions, (v) => {
      state.timbre = v === t.randomTimbre ? RANDOM_TIMBRE : v; rerender();
    }));

  // grados diatónicos
  const toggleDegree = (deg) => {
    if (state.selectedDegrees.has(deg)) state.selectedDegrees.delete(deg);
    else state.selectedDegrees.add(deg);
    rerender();
  };
  const diatonicSection = sectionCard(t.diatonicDegrees,
    h("div", { class: "chip-row" }, ...DIATONIC_DEGREES.map((d) =>
      chip(d, state.selectedDegrees.has(d), () => toggleDegree(d), DEGREE_GLOSSARY[d][state.lang]))));

  // cromáticos + presets
  const chromaticSection = sectionCard(t.chromaticColor,
    h("div", { class: "chip-row" }, ...CHROMATIC_DEGREES.map((d) =>
      chip(d, state.selectedDegrees.has(d), () => toggleDegree(d), DEGREE_GLOSSARY[d][state.lang]))),
    h("div", { class: "stack" },
      outlineButton(t.onlyDiatonic, () => { state.selectedDegrees = new Set(DIATONIC_DEGREES); rerender(); }, { block: true }),
      outlineButton(t.all, () => { state.selectedDegrees = new Set(ALL_DEGREES_OPTIONS); rerender(); }, { block: true })));

  // resumen
  const activeList = sortDegrees([...state.selectedDegrees]).join(", ");
  const summarySection = sectionCard(t.sessionSummary,
    summaryRow(t.mode, t.modes[mode].title, t.samples, String(previewCount)),
    summaryRow(t.key, state.scale, t.timbre, currentTimbreLabel),
    h("p", { class: state.selectedDegrees.size === 0 ? "warn" : "muted" },
      state.selectedDegrees.size === 0 ? t.selectAtLeastOne : `${t.activeDegrees}: ${activeList}`));

  const startBtn = primaryButton(
    `${t.startSession} ${t.modes[mode].title.toLowerCase()}`,
    () => {
      const questions = buildQuestionSet(state.scale, state.selectedDegrees, state.timbre);
      if (!questions.length) return;
      state._questions = questions;
      go("training");
    },
    { block: true, disabled: !canStart });

  screen.append(topbar, modeSection, keySection, diatonicSection, chromaticSection, summarySection, startBtn, legendCard());
  return screen;

  function rerender() {
    const fresh = SetupScreen();
    screen.replaceWith(fresh);
  }
}

function legendCard() {
  const t = state.t;
  return h("section", { class: "card legend-card" },
    h("h3", { class: "section-title" }, t.legend),
    h("div", { class: "legend-grid" },
      ...ALL_DEGREES_OPTIONS.map((d) =>
        h("div", { class: "legend-item" },
          h("span", { class: "legend-code" }, d),
          h("span", { class: "legend-name" }, DEGREE_GLOSSARY[d][state.lang])))));
}

/* ---------- pantalla: TRAINING ---------- */
function TrainingScreen() {
  const t = state.t;
  const mode = state.mode;
  const scale = state.scale;
  const timbre = state.timbre;
  const questions = state._questions || [];
  const allowedDegrees = sortDegrees([...state.selectedDegrees]);
  const degMap = scaleDegrees[scale] || {};

  const player = new AudioPlayer();
  const selector = makeDegreeNoteSelector();

  // estado de sesión
  const ts = {
    currentQuestion: null,
    currentCorrectDegree: "",
    feedbackText: t.promptStart,
    feedbackTone: "idle",
    loop: true,
    // clásico
    totalAsked: 0, totalCorrect: 0, consecutiveHits: 0,
    // time attack
    remainingTime: mode === "TIME_ATTACK" ? state.timeAttackDuration : 0,
    timeScore: 0, timeFinished: false, timerId: null,
    // survival
    lives: SURVIVAL_LIVES, survivalScore: 0, survivalFinished: false,
    // por sesión
    sessionAcc: {},
  };

  const isFinished = () => ts.timeFinished || ts.survivalFinished;

  // refs DOM que se actualizan en sitio
  const refs = {};

  const screen = h("div", { class: "screen training" });
  const topbar = h("div", { class: "topbar" },
    h("button", { class: "icon-btn", onclick: () => go("setup"), "aria-label": t.back }, "←"),
    h("span", { class: "topbar-title" }, `${t.sessionPrefix} ${t.modes[mode].title.toLowerCase()}`));

  // contexto
  const contextSection = sectionCard(t.context,
    summaryRow(t.key, scale, t.timbre, timbre === RANDOM_TIMBRE ? t.randomTimbre : timbre),
    summaryRow(t.mode, t.modes[mode].title, t.samples, String(questions.length)));

  // marcadores
  refs.scoreboard = h("div", { class: "section-body" });
  const scoreboardSection = h("section", { class: "card section-card" },
    h("h3", { class: "section-title" }, t.markers), refs.scoreboard);

  // controles
  refs.playBtn = primaryButton("▶  " + t.listenNew, () => playNew(), { block: true });
  refs.replayBtn = outlineButton("↻  " + t.replay, () => replay(), { block: true, disabled: true });
  const loopToggle = h("label", { class: "switch-row" },
    h("span", {}, t.loopActive),
    h("input", { type: "checkbox", checked: true, onchange: (e) => { ts.loop = e.target.checked; player.setLooping(ts.loop); } }));
  const controlsSection = sectionCard(t.controls,
    h("div", { class: "stack" }, refs.playBtn, refs.replayBtn), loopToggle);

  // feedback
  refs.feedbackTitle = h("h3", { class: "feedback-title idle" }, t.answer);
  refs.feedbackBody = h("p", { class: "feedback-body" }, ts.feedbackText);
  const feedbackSection = h("section", { class: "card feedback-card" }, refs.feedbackTitle, refs.feedbackBody);

  // botones de respuesta
  refs.answerWrap = h("div", { class: "chip-row answers" });
  refs.answerButtons = allowedDegrees.map((deg) => {
    const b = h("button", { class: "btn btn-answer", disabled: true, onclick: () => registerAnswer(deg), title: DEGREE_GLOSSARY[deg][state.lang] }, deg);
    refs.answerWrap.appendChild(b);
    return { deg, b };
  });
  const answersSection = sectionCard(t.pickAnswer, refs.answerWrap);

  // precisión de sesión
  refs.sessionAccWrap = h("div", { class: "section-body" });
  refs.sessionAccSection = h("section", { class: "card section-card hidden" },
    h("h3", { class: "section-title" }, t.sessionAccuracy), refs.sessionAccWrap);

  // centro tonal
  const tonalRow = h("div", { class: "chip-row scroll-x" },
    ...CHORD_TONICS.map((tonic) =>
      h("button", { class: "chip chord-chip", onclick: () => playChord(tonic) }, "♪ " + tonic)));
  const tonalSection = sectionCard(t.tonalCenter, h("p", { class: "muted" }, t.tonalCenterHelp), tonalRow);

  // finalizado
  refs.finishedSection = h("section", { class: "card finished-card hidden" });

  const exitBtn = outlineButton(t.exitSession, () => go("setup"), { block: true });

  screen.append(topbar, contextSection, scoreboardSection, controlsSection, feedbackSection,
    answersSection, refs.sessionAccSection, tonalSection, refs.finishedSection, exitBtn);

  /* ----- lógica ----- */
  function stopPlayback() { player.stop(); }

  function startTimerIfNeeded() {
    if (mode !== "TIME_ATTACK" || ts.timerId != null || ts.timeFinished) return;
    ts.timerId = setInterval(() => {
      ts.remainingTime -= 1;
      if (ts.remainingTime <= 0) {
        ts.remainingTime = 0;
        clearInterval(ts.timerId); ts.timerId = null;
        ts.timeFinished = true;
        ts.currentQuestion = null;
        stopPlayback();
        setFeedback(t.timeUp, "error");
        updateUI();
      } else {
        renderScoreboard();
      }
    }, 1000);
  }

  function playNew() {
    if (isFinished()) return;
    if (!questions.length) { setFeedback(t.noSamples, "error"); updateUI(); return; }
    const q = selector.next(questions);
    ts.currentQuestion = q;
    ts.currentCorrectDegree = (q && degMap[q.pitchClass]) || "";
    setFeedback(t.promptListen, "idle");
    if (q) player.play(q.filePath, ts.loop);
    startTimerIfNeeded();
    updateUI();
  }

  function replay() {
    if (ts.currentQuestion) player.play(ts.currentQuestion.filePath, ts.loop);
  }

  function playChord(tonic) {
    const base = getSupportAssetBaseDir(timbre, ts.currentQuestion);
    player.play(`${base}/Major Chords/${tonic}major.mp3`, false);
  }

  function registerAnswer(selected) {
    const q = ts.currentQuestion;
    if (!q) return;
    const correct = ts.currentCorrectDegree;
    const wasCorrect = selected === correct;
    stopPlayback();

    if (mode === "CLASSIC") {
      ts.totalAsked += 1;
      if (wasCorrect) { ts.totalCorrect += 1; ts.consecutiveHits += 1; } else { ts.consecutiveHits = 0; }
    } else if (mode === "TIME_ATTACK") {
      if (wasCorrect) ts.timeScore += 1;
    } else if (mode === "SURVIVAL") {
      if (wasCorrect) ts.survivalScore += 1;
      else { ts.lives -= 1; if (ts.lives <= 0) ts.survivalFinished = true; }
    }

    const prev = ts.sessionAcc[correct] || { correct: 0, total: 0 };
    ts.sessionAcc[correct] = { correct: prev.correct + (wasCorrect ? 1 : 0), total: prev.total + 1 };

    state.stats = updateStats(state.stats, correct, wasCorrect);
    saveStats(state.stats);

    const base = getSupportAssetBaseDir(timbre, q);
    player.play(`${base}/${wasCorrect ? "acierto" : "error"}.mp3`, false);
    setFeedback((wasCorrect ? t.correctMsg : t.wrongMsg)(q.pitchClass, correct), wasCorrect ? "success" : "error");

    ts.currentQuestion = null;

    const autoAdvance = (mode === "TIME_ATTACK" && !ts.timeFinished) || (mode === "SURVIVAL" && !ts.survivalFinished);
    updateUI();
    if (autoAdvance) setTimeout(() => { if (!isFinished()) playNew(); }, 350);
  }

  function setFeedback(text, tone) { ts.feedbackText = text; ts.feedbackTone = tone; }

  /* ----- render en sitio ----- */
  function renderScoreboard() {
    const sb = refs.scoreboard;
    sb.textContent = "";
    if (mode === "CLASSIC") {
      const acc = ts.totalAsked === 0 ? 0 : ts.totalCorrect / ts.totalAsked;
      sb.append(
        summaryRow(t.attempts, String(ts.totalAsked), t.accuracy, formatPercent(acc, state.lang)),
        h("div", { style: { height: "10px" } }),
        summaryRow(t.hits, String(ts.totalCorrect), t.streak, String(ts.consecutiveHits)));
    } else if (mode === "TIME_ATTACK") {
      sb.append(summaryRow(t.time, `${ts.remainingTime}s`, t.points, String(ts.timeScore)));
    } else {
      const hearts = h("div", { class: "hearts" },
        ...Array.from({ length: SURVIVAL_LIVES }, (_, i) =>
          h("span", { class: "heart" + (i < ts.lives ? "" : " lost") }, "❤")));
      sb.append(h("div", { class: "survival-row" }, pill(t.points, String(ts.survivalScore)), hearts));
    }
  }

  function renderSessionAcc() {
    const keys = Object.keys(ts.sessionAcc);
    if (!keys.length) { refs.sessionAccSection.classList.add("hidden"); return; }
    refs.sessionAccSection.classList.remove("hidden");
    refs.sessionAccWrap.textContent = "";
    for (const [deg, stat] of sortDegrees(keys).map((d) => [d, ts.sessionAcc[d]])) {
      const pct = stat.total === 0 ? 0 : stat.correct / stat.total;
      refs.sessionAccWrap.append(
        h("div", { class: "acc-item" },
          h("span", {}, `${deg} · ${stat.correct}/${stat.total}`),
          h("div", { class: "bar" }, h("div", { class: "bar-fill", style: { width: `${Math.round(pct * 100)}%` } }))));
    }
  }

  function renderFinished() {
    if (!isFinished()) { refs.finishedSection.classList.add("hidden"); return; }
    refs.finishedSection.classList.remove("hidden");
    refs.finishedSection.textContent = "";
    let msg;
    if (mode === "CLASSIC") msg = t.classicOpen;
    else if (mode === "TIME_ATTACK") msg = t.timeAttackDone(ts.timeScore);
    else msg = t.survivalDone(ts.survivalScore);
    refs.finishedSection.append(
      h("h3", { class: "section-title" }, t.sessionFinished),
      h("p", { class: "muted" }, msg),
      h("div", { class: "summary-row" },
        primaryButton(t.restart, () => restart()),
        outlineButton(t.back, () => go("setup"))));
  }

  function updateUI() {
    const finished = isFinished();
    refs.feedbackTitle.textContent = t.answer;
    refs.feedbackTitle.className = "feedback-title " + ts.feedbackTone;
    refs.feedbackBody.textContent = ts.feedbackText;
    refs.playBtn.disabled = !questions.length || finished;
    refs.replayBtn.disabled = !ts.currentQuestion || finished;
    for (const { b } of refs.answerButtons) b.disabled = !ts.currentQuestion || finished;
    renderScoreboard();
    renderSessionAcc();
    renderFinished();
  }

  function restart() {
    // reconstruye preguntas (timbre aleatorio cambia muestras) y reinicia
    state._questions = buildQuestionSet(state.scale, state.selectedDegrees, state.timbre);
    go("training");
  }

  // primer render
  renderScoreboard();
  updateUI();

  activeTraining = {
    destroy() {
      if (ts.timerId != null) { clearInterval(ts.timerId); ts.timerId = null; }
      player.release();
    },
  };

  return screen;
}

/* ---------- pantalla: STATS ---------- */
function StatsScreen() {
  const t = state.t, s = state.stats;
  const screen = h("div", { class: "screen stats" });
  const topbar = h("div", { class: "topbar" },
    h("button", { class: "icon-btn", onclick: () => go("home"), "aria-label": t.back }, "←"),
    h("span", { class: "topbar-title" }, t.statsTitle));

  const summary = sectionCard(t.historyTitle,
    summaryRow(t.attempts, String(totalAttempts(s)), t.accuracy, formatPercent(totalAccuracy(s), state.lang)),
    summaryRow(t.hits, String(totalCorrect(s)), t.mostPracticed, topPracticedDegree(s) || "--"));

  const cards = [];
  if (totalAttempts(s) === 0) {
    cards.push(sectionCard(t.noProgressTitle, h("p", { class: "muted" }, t.noProgressBody)));
  } else {
    for (const deg of ALL_DEGREES_OPTIONS) {
      const stat = s[deg] || { correct: 0, total: 0 };
      if (stat.total > 0) {
        const pct = stat.correct / stat.total;
        cards.push(h("section", { class: "card stat-card" },
          h("div", { class: "stat-head" },
            h("span", { class: "stat-deg" }, degreeLabel(deg)),
            h("span", { class: "stat-frac" }, `${stat.correct}/${stat.total}`)),
          h("div", { class: "bar" }, h("div", { class: "bar-fill", style: { width: `${Math.round(pct * 100)}%` } })),
          h("p", { class: "muted small" }, `${t.accuracy} ${formatPercent(pct, state.lang)}`)));
      }
    }
  }

  const clearBtn = outlineButton(t.clearStats, () => openClearDialog(), { block: true, danger: true });
  screen.append(topbar, summary, ...cards, clearBtn);
  return screen;
}

function openClearDialog() {
  const t = state.t;
  const overlay = h("div", { class: "overlay", onclick: (e) => { if (e.target === overlay) overlay.remove(); } },
    h("div", { class: "dialog card" },
      h("h3", {}, t.clearConfirmTitle),
      h("p", { class: "muted" }, t.clearConfirmBody),
      h("div", { class: "dialog-actions" },
        outlineButton(t.cancel, () => overlay.remove()),
        primaryButton(t.delete, () => { clearStats(); state.stats = {}; overlay.remove(); render(); }))));
  document.body.appendChild(overlay);
}

/* ---------- router ---------- */
function render() {
  const r = root();
  r.textContent = "";
  let view;
  switch (state.screen) {
    case "intro": view = IntroScreen(); break;
    case "home": view = HomeScreen(); break;
    case "setup": view = SetupScreen(); break;
    case "training": view = TrainingScreen(); break;
    case "stats": view = StatsScreen(); break;
    default: view = IntroScreen();
  }
  r.appendChild(view);
  r.scrollTop = 0;
}

render();
