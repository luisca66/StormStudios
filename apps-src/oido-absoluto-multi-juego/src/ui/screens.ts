import { GameState, GameStateManager } from "@/game/state";
import { COPY, GameCopy, getLocale } from "@/i18n";
import { WORLD_RANGES, completedInWorld, levelsOfWorld, getLevel, pitchName, pitchClassName, SequenceId } from "@/game/progression";

import { renderStatistics, downloadStatistics, sessionFigures, percentage, help } from "./statistics";

const worldIcons = ["🌾", "🌊", "🌌", "🐊", "🦄"];
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const button = (action: string, label: string, primary = false, data = "") =>
  `<button class="${primary ? "primary" : "secondary"}-button" data-action="${action}" ${data}>${label}</button>`;
const notation = (s: GameState, c: GameCopy) => `<button class="chip on" data-action="notation" aria-label="${c.notation}" aria-pressed="${s.accidentals === "flats"}">♯ / ♭ · ${s.accidentals === "sharps" ? "♯" : "♭"}</button>`;
const volume = (s: GameState, c: GameCopy) => `<label class="volume-control">🔊 ${c.volume}<input aria-label="${c.volume}" class="volume-slider" type="range" min="0" max="1" step="0.02" value="${s.volume}"></label>`;

export function mountUI(root: HTMLElement, manager: GameStateManager,
  onAnswerSelected: (correct: boolean) => void, onResetChallenge: () => void, triggerSpawn: () => void): void {
  const copy = COPY[getLocale()];
  const screenHost = document.createElement("div");
  const noticeHost = document.createElement("div");
  screenHost.className = noticeHost.className = "ui-screen-host";
  root.replaceChildren(screenHost, noticeHost);
  let noticeVisible = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const dismiss = () => {
    clearTimeout(timer);
    const state = manager.getState();
    if (!state.isPlaying || !state.feedback) return;
    const correct = state.feedback.correct;
    manager.dismissFeedback();
    if (correct) triggerSpawn(); else onResetChallenge();
  };
  manager.subscribe(state => {
    if (!state.feedback) clearTimeout(timer);
    // Keep level-list scroll position while toggling notation.
    const previous = screenHost.querySelector(".level-grid")?.scrollTop ?? 0;
    screenHost.innerHTML = render(state, manager, copy);
    // Keep the notice mounted across answers so assistive technology announces it only once.
    if (noticeVisible !== state.storageWarning) {
      noticeVisible = state.storageWarning;
      noticeHost.innerHTML = noticeVisible ? `<aside class="storage-notice" role="status"><span>${copy.stats.storageWarning}</span><button class="chip" data-action="dismiss-storage-warning" aria-label="${copy.stats.dismiss}">×</button></aside>` : "";
    }
    const grid = screenHost.querySelector(".level-grid"); if (grid) grid.scrollTop = previous;
  });
  root.addEventListener("input", event => {
    if ((event.target as HTMLElement).matches(".volume-slider"))
      manager.updateVolume(Number((event.target as HTMLInputElement).value));
  });
  root.addEventListener("change", event => {
    const target = event.target as HTMLSelectElement;
    if (target.matches('[data-action="stats-filter"]'))
      manager.setStatsLevel(target.value === "all" ? null : Number(target.value));
  });
  root.addEventListener("click", event => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!target) return;
    const id = Number(target.dataset.id);
    switch (target.dataset.action) {
      case "statistics": manager.openStatistics(); break;
      case "stats-back": manager.closeStatistics(); break;
      case "dismiss-storage-warning": manager.dismissStorageWarning(); break;
      case "export-csv": downloadStatistics(manager, copy); break;
      case "clear-stats":
        if (window.confirm(`${copy.sequenceNames[manager.getState().sequence]}: ${copy.stats.clearConfirm}`)) manager.clearStatistics();
        break;
      case "world": manager.selectWorld(id); break;
      case "level": manager.selectLevel(id); break;
      case "scenario": manager.selectScenario(id); break;
      case "sequence": manager.selectSequence(target.dataset.id as SequenceId); break;
      case "resume": manager.selectLevel(manager.continueLevel()); break;
      case "notation": manager.toggleAccidentals(); break;
      case "warmup-note": manager.warmupNote(id); break;
      case "start": manager.confirmWarmup(); break;
      case "menu": manager.backToMenu(); break;
      case "advance": manager.advanceLevel(); break;
      case "loop": manager.toggleLoop(); break;
      case "replay": manager.replay(); break;
      case "hear-answer": manager.hearAnswer(); break;
      case "dismiss": dismiss(); break;
      case "answer": {
        if (!manager.getState().currentChallenge || manager.getState().feedback) return;
        const correct = manager.checkAnswer(id);
        onAnswerSelected(correct);
        clearTimeout(timer);
        timer = setTimeout(dismiss, correct ? 1800 : 6000);
        break;
      }
    }
  });
}

function render(s: GameState, manager: GameStateManager, c: GameCopy): string {
  if (s.activeScreen === "statistics") return renderStatistics(s, manager, c);
  const stage = c.levels[s.level.world - 1];
  const scenario = c.levels[s.scenario - 1];
  if (s.activeScreen === "menu") return `<main class="screen">
    <header><div class="eyebrow">${c.eyebrow}</div><h1 class="title">${c.appTitle}</h1><p class="subtitle">${c.appSubtitle}</p></header>
    ${s.methodCompleted ? `<p role="status" class="completion-message">${c.methodCompleted}</p>` : ""}
    <section class="setup-section"><span class="section-label">${c.sequence}</span>
    <div class="chip-row">${(["Hombre", "Mujer"] as const).map(seq => `<button class="chip ${s.sequence === seq ? "on" : ""}" data-action="sequence" data-id="${seq}" aria-pressed="${s.sequence === seq}">${c.sequenceNames[seq]}</button>`).join("")}</div>
    <p class="subtitle">${c.sequenceHelp}</p></section>
    ${button("resume", `${c.continueLevel} ${manager.continueLevel()}`, true)}
    ${button("statistics", c.stats.title)}
    <section class="setup-section"><h2 class="section-label">${c.methodStages}</h2><p class="subtitle">${c.scenarioHelp}</p></section>
    <section class="mode-list">${c.levels.map((w, index) => {
      const id = index + 1, [first, last] = WORLD_RANGES[id];
      return `<button class="mode-card" data-action="world" data-id="${id}"><span class="accent-bar"></span><span class="mode-icon">${worldIcons[index]}</span><span class="mode-body"><span class="mode-title">${w.name}</span><span class="mode-subtitle">${w.menuSubtitle} · ${first}–${last}</span><span class="mode-subtitle">${completedInWorld(s.progress, id)} / ${last - first + 1} ${c.completed}</span></span><span class="mode-arrow">›</span></button>`;
    }).join("")}</section>${volume(s, c)}</main>`;
  if (s.activeScreen === "level-selection") return `<main class="screen level-screen">
    <header class="header-row">${button("menu", `‹ ${c.back}`)}<h1>${c.levels[s.selectedWorld - 1].name}</h1></header>
    ${button("statistics", c.stats.title)}
    <div class="toolbar"><h2>${c.chooseLevel} · ${c.sequenceNames[s.sequence]}</h2>${notation(s, c)}</div>
    <section class="level-grid">${levelsOfWorld(s.sequence, s.selectedWorld).map(level => `<button class="level-card ${s.progress.completed.includes(level.number) ? "completed" : ""}" data-action="level" data-id="${level.number}">
      <strong>${c.levelShort} ${level.number} ${s.progress.completed.includes(level.number) ? `✓ ${c.completedMark}` : ""}</strong>
      <span>${escape(getLocale() === "en" ? level.commentEnglish : level.comment)}</span>
      <span class="level-notes">${level.pitches.map(p => escape(pitchName(p, s.accidentals))).join(" · ")}</span>
      <span>${c.streak}: ${s.progress.streaks[level.number] ?? 0} / ${level.requiredStreak}</span></button>`).join("")}</section></main>`;
  if (s.activeScreen === "warmup") return `<main class="screen">
    <header class="header-row">${button("world", `‹ ${c.back}`, false, `data-id="${s.level.world}"`)}<span>${stage.name} · ${c.levelShort} ${s.levelNumber}</span></header>
    <h1 class="title">${c.warmupTitle}</h1><p class="subtitle">${c.warmupCopy}</p>
    <p class="subtitle">${escape(getLocale() === "en" ? s.level.commentEnglish : s.level.comment)}</p>
    ${notation(s, c)}<div class="keyboard-row">${s.level.pitches.map((pitch, index) => `<button class="key-btn" data-action="warmup-note" data-id="${index}">${escape(pitchName(pitch, s.accidentals))}</button>`).join("")}</div>
    <fieldset class="scenario-selector"><legend class="section-label">${c.chooseScenario}</legend>
    <div class="scenario-options">${c.levels.map((item, index) => `<button class="chip ${s.scenario === index + 1 ? "on" : ""}" data-action="scenario" data-id="${index + 1}" aria-pressed="${s.scenario === index + 1}"><span aria-hidden="true">${worldIcons[index]}</span> ${item.name}</button>`).join("")}</div></fieldset>
    ${volume(s, c)}${button("start", c.startGame, true)}</main>`;
  if (s.activeScreen === "victory") {
    const next = getLevel(s.sequence, s.levelNumber + 1);
    const nextLabel = next ? `${c.nextLevel}: ${next.number}` : c.finishMethod;
    return `<main class="screen victory-screen"><span class="trophy">🏆</span><h1 class="title">${c.victoryTitle}</h1><p>${c.levelShort} ${s.levelNumber} · ${scenario.name}</p><p class="subtitle">${c.victoryBody}</p>
    <section class="stats-card"><div class="metric-heading"><h2>${c.stats.sessionSummary}</h2>${help(c.stats.sessionSummary, c.stats.helpSession, c)}</div>${sessionFigures(s.sessionSummary, c)}</section>
    ${button("advance", nextLabel, true)}${button("world", c.chooseLevel, false, `data-id="${s.level.world}"`)}${button("menu", c.mainMenu)}</main>`;
  }
  const feedback = s.feedback;
  return `<div class="hud-wrapper"><div class="hud-top"><div class="hud-summary">
    <div class="hud-card"><div class="metric-heading"><span class="hud-label">${c.streak}</span>${help(c.streak, c.stats.helpStreak, c)}</div><strong class="hud-value">${s.streak} / ${s.level.requiredStreak}</strong></div>
    <div class="hud-card"><div class="metric-heading"><span class="hud-label">${c.stats.currentSession}</span>${help(c.stats.currentSession, c.stats.helpSession, c)}</div><strong class="hud-value">${percentage(s.sessionSummary?.percentage)}</strong></div>
    <div class="hud-card"><span class="hud-label">${scenario.name}</span><strong>${c.levelShort} ${s.levelNumber}</strong></div></div>
    <div class="hud-instruction">${c.instructions[s.scenario - 1]}</div></div>
    ${s.isGateUnlocked ? `<p class="portal-message" role="status">${c.portal}</p>` : ""}
    <div class="hud-bottom">${s.currentChallenge ? `<section class="answer-panel"><div class="eyebrow">${c.heardQuestion}</div><div class="answer-grid">${s.level.answerClasses.map(pc => `<button class="answer-btn" data-action="answer" data-id="${pc}">${escape(pitchClassName(pc, s.accidentals))}</button>`).join("")}</div></section>` : ""}
    <div class="game-toolbar">${volume(s, c)}${notation(s, c)}
    <button class="secondary-button" data-action="loop" aria-pressed="${s.loopNote}">🔁 ${c.loop}: ${s.loopNote ? c.on : c.off}</button>
    ${s.currentChallenge ? button("replay", c.replay) : ""}${button("menu", c.exitToMenu)}</div></div>
    ${feedback ? `<div class="feedback-toast show" role="${feedback.correct ? "status" : "alertdialog"}" aria-label="${feedback.correct ? c.correct : c.wrong}"><div class="feedback-icon">${feedback.correct ? "✅" : "❌"}</div><strong class="feedback-text">${feedback.correct ? c.correct : c.wrong}</strong>
      ${feedback.correct ? `<p>${c.correctSub}</p>` : `<p>${c.correctNote} <strong>${escape(pitchName(feedback.question.pitch, s.accidentals))}</strong> · ${c.instruments[feedback.question.timbre]}</p><p>${feedback.distance.semitones} ${c.semitones} ${feedback.distance.direction > 0 ? "↑" : feedback.distance.direction < 0 ? "↓" : ""}</p><div class="chip-row">${button("hear-answer", c.hearAnswer)}${button("dismiss", c.continue, true)}</div>`}</div>` : ""}
    <canvas id="radar-canvas" width="144" height="144"></canvas></div>`;
}
