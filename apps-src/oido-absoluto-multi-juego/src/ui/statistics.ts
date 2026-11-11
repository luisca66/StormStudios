import type { GameState, GameStateManager } from "@/game/state";
import { getLevels } from "@/game/progression";
import { sessionHistory, sessionComparison, errorDistanceStats, errorDrift,
  accuracyByPitchClass, accuracyByTimbre, exportAttemptsToCsv, filterAttempts, CSV_LABELS_ES, CSV_LABELS_EN, type SessionSummary } from "@/game/stats";
import { getLocale, type GameCopy } from "@/i18n";

const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const decimal = (value: number) => new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(value);
export const percentage = (value: number | null | undefined): string => value == null ? "—" : `${decimal(value)} %`;
export const distance = (value: number | null | undefined, c: GameCopy): string => value == null ? "—" : `${decimal(value)} ${c.semitones}`;
export const help = (label: string, text: string, c: GameCopy): string => `<details class="metric-help"><summary aria-label="${escape(c.stats.help + ": " + label)}">?</summary><p>${escape(text)}</p></details>`;
const heading = (label: string, text: string, c: GameCopy) => `<div class="metric-heading"><h2>${label}</h2>${help(label, text, c)}</div>`;

export function sessionFigures(summary: SessionSummary | null, c: GameCopy): string {
  if (!summary) return `<p class="subtitle">${c.stats.noSession}</p>`;
  return `<dl class="session-figures"><div><dt class="metric-heading">${c.stats.attempts}${help(c.stats.attempts, c.stats.helpHistory, c)}</dt><dd>${summary.total}</dd></div><div><dt class="metric-heading">${c.stats.accuracy}${help(c.stats.accuracy, c.stats.helpSession, c)}</dt><dd>${percentage(summary.percentage)}</dd></div><div><dt class="metric-heading">${c.stats.avgDistance}${help(c.stats.avgDistance, c.stats.helpDistance, c)}</dt><dd>${distance(summary.avgDistance, c)}</dd></div></dl>`;
}
const bar = (label: string, percent: number, detail: string) => `<div class="accuracy-row"><span>${escape(label)}</span><div class="accuracy-track" role="meter" aria-label="${escape(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="${escape(percentage(percent) + " · " + detail)}"><span style="width:${percent}%"></span></div><span class="accuracy-value">${percentage(percent)} <small>${detail}</small></span></div>`;

export function renderStatistics(s: GameState, manager: GameStateManager, c: GameCopy): string {
  const t = c.stats, all = manager.getAttempts(), level = s.statsLevel;
  const overall = errorDistanceStats(all, s.sequence, level);
  const comparison = sessionComparison(all, s.sequence, level,
    level === s.levelNumber && s.sessionId !== null ? s.sessionId : undefined);
  const drift = errorDrift(all, s.sequence, level);
  const notes = accuracyByPitchClass(all, s.sequence, level, s.accidentals);
  const timbres = accuracyByTimbre(all, s.sequence, level);
  const sessions = sessionHistory(all, s.sequence, level);
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium", timeStyle: "short" });
  return `<main class="screen statistics-screen"><header class="header-row"><button class="secondary-button" data-action="stats-back">‹ ${c.back}</button><h1 class="title">${t.title}</h1></header>
    <div class="stats-filters"><span>${c.sequence}: <strong>${c.sequenceNames[s.sequence]}</strong></span><label>${t.levelFilter}<select data-action="stats-filter"><option value="all" ${level === null ? "selected" : ""}>${t.allLevels}</option>${getLevels(s.sequence).map(l => `<option value="${l.number}" ${level === l.number ? "selected" : ""}>${c.levelShort} ${l.number}</option>`).join("")}</select></label></div>
    <div class="chip-row"><button class="secondary-button" data-action="export-csv" ${overall.total ? "" : "disabled"}>${t.exportCsv}</button><button class="secondary-button" data-action="clear-stats">${t.clear}</button></div><p class="subtitle">${t.csvHint}</p>
    ${overall.total === 0 ? `<p class="stats-empty" role="status">${t.empty}</p>` : `<div class="stats-grid">
      <section class="stats-card">${heading(t.currentSession, t.helpSession, c)}${comparison.current ? `<p class="subtitle">${c.levelShort} ${comparison.current.level}</p>` : ""}${sessionFigures(comparison.current, c)}</section>
      <section class="stats-card">${heading(t.previousSession, t.helpSession, c)}${comparison.previous ? `<p class="subtitle">${c.levelShort} ${comparison.previous.level}</p>` : ""}${sessionFigures(comparison.previous, c)}</section>
      <section class="stats-card">${heading(t.avgDistance, t.helpDistance, c)}<strong class="metric-value">${distance(overall.avgDistance, c)}</strong>${overall.errors ? "" : `<p class="subtitle">${t.noErrors}</p>`}</section>
      <section class="stats-card">${heading(t.last50, t.helpLast50, c)}<strong class="metric-value">${distance(overall.last50AvgDistance, c)}</strong></section>
      <section class="stats-card stats-wide">${heading(t.drift, t.helpDrift, c)}${drift.directionalErrors ? bar("↑", drift.abovePercent!, String(drift.errorsAbove)) + bar("↓", drift.belowPercent!, String(drift.errorsBelow)) : `<p class="subtitle">${t.noDirected}</p>`}</section>
      <section class="stats-card">${heading(t.byNote, t.helpNote, c)}${notes.map(n => bar(n.name, n.percentage, `${n.correct} / ${n.total}`)).join("")}</section>
      <section class="stats-card">${heading(t.byTimbre, t.helpTimbre, c)}${timbres.map(i => bar(c.instruments[i.timbre], i.percentage, `${i.correct} / ${i.total}`)).join("")}</section>
      <section class="stats-card stats-wide">${heading(t.history, t.helpHistory, c)}<div class="session-history" tabindex="0" role="region" aria-label="${t.history}"><table><caption class="sr-only">${t.history}</caption><thead><tr><th scope="col">${t.date}</th><th scope="col">${c.levelShort}</th><th scope="col">${t.attempts}</th><th scope="col">${t.accuracy}</th><th scope="col">${t.avgDistance}</th></tr></thead><tbody>${sessions.map(row => `<tr><td>${date.format(row.timestamp)}</td><td>${row.level}</td><td>${row.total}</td><td>${percentage(row.percentage)}</td><td>${distance(row.avgDistance, c)}</td></tr>`).join("")}</tbody></table></div></section>
    </div>`}</main>`;
}

export function downloadStatistics(manager: GameStateManager, c: GameCopy): void {
  const s = manager.getState();
  const attempts = filterAttempts(manager.getAttempts(), s.sequence, s.statsLevel);
  const labels = getLocale() === "en" ? CSV_LABELS_EN : CSV_LABELS_ES;
  const csv = exportAttemptsToCsv(attempts, { ...labels, timbres: c.instruments });
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `walking-ap-${s.sequence}-${s.statsLevel ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
