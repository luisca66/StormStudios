import './styles.css';
import { AssetAudioPlayer } from './audio-player';
import { AppState, restProgress } from './state';
import { COPY, getLocale } from './i18n';
import { renderStatistics, downloadStatistics, help, percentage } from './statistics';
import { WORLD_RANGES, completedInWorld, levelsOfWorld, pitchClassName, pitchName, sampleName, type Question } from '../../ap-core/progression';

const en = getLocale() === 'en';
const c = COPY[getLocale()];
const t = (es: string, english: string) => en ? english : es;
const stages = en ? ['Preparatory exercises and tritones', 'Major thirds', 'Minor thirds', 'Major seconds', 'Semitones'] : ['Preparatorios y tritonos', 'Terceras mayores', 'Terceras menores', 'Segundas mayores', 'Semitonos'];
const state = new AppState();
const audio = new AssetAudioPlayer();
audio.setVolume(state.volume);
const app = document.querySelector<HTMLDivElement>('#app')!;
const esc = (value: string) => value.replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[x]!);
let audioError = '';
let playbackVersion = 0;
const button = (action: string, label: string, primary = false, disabled = false) => `<button class="${primary ? 'ag-primary-btn' : 'ag-secondary-btn'}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const levelTitle = () => `${c.levelShort} ${state.level.number} · ${stages[state.level.world - 1]}`;
const notation = () => `<button class="ag-secondary-btn" data-action="notation" aria-label="${c.notation}" aria-pressed="${state.accidentals === 'flats'}">♯ / ♭ · ${state.accidentals === 'sharps' ? '♯' : '♭'}</button>`;
const controls = () => `<div class="controls">${notation()}<label>${c.volume} <input data-action="volume" aria-label="${c.volume}" type="range" min="0" max="1" step="0.01" value="${state.volume}"></label></div>`;
const noteList = () => state.level.pitches.map(p => pitchName(p, state.accidentals)).join(' · ');

function menu() {
  return `<div class="menu-layout"><aside class="brand-art"><img src="${import.meta.env.BASE_URL}brand/app-ap-multi.png" alt="${t('Oído Absoluto Multi', 'Absolute Pitch Multi')}"><p>AP Super · Storm Studios</p></aside><section class="panel"><h2>${t('Tu oído, paso a paso', 'Train your ear, step by step')}</h2><label>${c.sequence}<select data-action="sequence">${(['Hombre', 'Mujer'] as const).map(s => `<option value="${s}" ${s === state.sequence ? 'selected' : ''}>${c.sequenceNames[s]}</option>`).join('')}</select></label><p class="muted">${c.sequenceHelp}</p>${button('continue', `${c.continueLevel} ${state.continueLevel()}`, true)}<h3>${t('Etapas del método', 'Method stages')}</h3><div class="stage-list">${stages.map((name, i) => {
    const [first, last] = WORLD_RANGES[i + 1];
    return `<button class="stage-card" data-action="world" data-value="${i + 1}"><strong>${name}</strong><span>${first}–${last} · ${completedInWorld(state.progress, i + 1)} / ${last - first + 1} ${c.completed}</span></button>`;
  }).join('')}</div>${button('statistics', c.stats.title)}<p class="muted small">${t('La app AP Super para Android añade contrarreloj y modo Avanzado.', 'AP Super for Android adds time trials and Advanced mode.')}</p></section></div>`;
}

function levels() {
  return `<section class="panel"><div class="header-row">${button('menu', `‹ ${c.back}`)}<h2>${stages[state.selectedWorld - 1]}</h2>${button('statistics', c.stats.title)}</div><p class="muted">${t('Puedes elegir cualquier nivel. La racha se guarda entre sesiones.', 'Choose any level. Your streak is saved between sessions.')}</p><div class="level-list">${levelsOfWorld(state.sequence, state.selectedWorld).map(l => `<button class="level-card" data-action="level" data-value="${l.number}"><strong>${c.levelShort} ${l.number} ${state.progress.completed.includes(l.number) ? `· ✓ ${c.completedMark}` : ''}</strong><span>${esc(en ? l.commentEnglish : l.comment)}</span><span class="notes">${l.pitches.map(p => pitchName(p, state.accidentals)).join(' · ')}</span><span>${c.streak}: ${state.progress.streaks[l.number] ?? 0} / ${l.requiredStreak}</span></button>`).join('')}</div></section>`;
}

function warmup() {
  return `<section class="panel training"><div class="header-row">${button('levels', `‹ ${c.chooseLevel}`)}<h2>${c.warmupTitle}</h2></div><p class="kicker">${levelTitle()}</p><p>${esc(en ? state.level.commentEnglish : state.level.comment)}</p><p class="muted">${c.warmupCopy}</p>${controls()}<div class="keys">${state.level.pitches.map((p, i) => `<button class="note-key" data-action="warmup-note" data-value="${i}">${pitchName(p, state.accidentals)}</button>`).join('')}</div><p class="muted">${t('Pon tu música de fondo antes de comenzar.', 'Put on your background music before starting.')}</p>${button('start', t('Comenzar', 'Start training'), true)}</section>`;
}

function feedback() {
  const f = state.feedback; if (!f) return '';
  const direction = f.distance.direction > 0 ? t('por arriba ↑', 'above ↑') : f.distance.direction < 0 ? t('por abajo ↓', 'below ↓') : t('(tritono, sin dirección)', '(tritone, no direction)');
  return `<div class="feedback ${f.correct ? 'correct' : 'wrong'}" role="status"><strong>${f.correct ? c.correct : c.wrong}</strong>${f.correct ? '' : `<p>${c.correctNote} <b>${pitchName(f.question.pitch, state.accidentals)}</b> · ${c.instruments[f.question.timbre]}. ${t('Tu respuesta quedó a', 'Your answer was')} ${f.distance.semitones} ${f.distance.semitones === 1 ? t('semitono', 'semitone') : c.semitones} ${direction}.</p>${button('hear', c.hearAnswer)}`}</div>`;
}

function training() {
  return `<section class="panel training session-screen"><div class="header-row">${button('levels', `‹ ${c.chooseLevel}`)}<h2>${levelTitle()}</h2></div><div class="hud"><span>${c.streak} <strong>${state.streak} / ${state.level.requiredStreak}</strong>${help(c.streak, c.stats.helpStreak, c)}</span><span>${c.stats.currentSession} <strong>${percentage(state.sessionSummary?.percentage)}</strong>${help(c.stats.currentSession, c.stats.helpSession, c)}</span></div>${controls()}<div class="controls">${button('loop', `${c.loop}: ${state.loopNote ? c.on : c.off}`)}${help(c.loop, t('Encendido, la nota se repite hasta que respondas. Apagado, suena una sola vez.', 'When on, the note repeats until you answer. When off, it plays once.'), c)}${button('replay', c.replay, false, !state.question)}</div><p>${state.question ? c.heardQuestion : t('Pide una nota cuando estés listo.', 'Ask for a note when you are ready.')}</p><div class="orbit" id="rest-ring"><button class="new-note" data-action="new" ${state.question ? 'disabled' : ''}>${t('Nueva nota', 'New note')}</button></div><p class="rest-time" id="rest-time"></p><p class="muted">${t('Después de responder, olvida la nota escuchando música por lo menos 60 segundos. El anillo es un recordatorio; puedes continuar cuando quieras.', 'After answering, forget the note by listening to music for at least 60 seconds. The ring is a reminder; you can continue whenever you wish.')}</p>${feedback()}<div class="keys answer-keys">${state.level.answerClasses.map(pc => `<button class="note-key" data-action="answer" data-value="${pc}" ${state.question ? '' : 'disabled'}>${pitchClassName(pc, state.accidentals)}</button>`).join('')}</div><details class="notes-help"><summary>${t('Notas en juego', 'Notes in this level')}</summary><p>${noteList()}</p></details></section>`;
}

function victory() {
  const next = state.nextLevel();
  return `<section class="panel training"><p class="kicker">${levelTitle()}</p><h2>${c.victoryTitle}</h2><p>${c.victoryBody}</p><p>${c.streak}: ${state.streak} / 20 · ${c.stats.currentSession}: ${percentage(state.sessionSummary?.percentage)}</p>${feedback()}${next ? `${button('next', `${c.nextLevel}: ${next.number}`, true)}<p>${next.world !== state.level.world ? t('Nueva etapa', 'New stage') + ': ' : ''}${stages[next.world - 1]}</p>` : `<p class="method-complete">${c.methodCompleted}</p>`}<div class="controls">${button('levels', c.chooseLevel)}${button('menu', c.mainMenu)}</div></section>`;
}

function render() {
  const active = document.activeElement as HTMLElement | null;
  const focusAction = active?.dataset.action, focusValue = active?.dataset.value;
  document.documentElement.lang = en ? 'en' : 'es';
  document.querySelector('meta[name=description]')?.setAttribute('content', t('AP Super: 147 niveles de oído absoluto con seis timbres, de E2 a E5.', 'AP Super: 147 absolute pitch levels with six timbres, from E2 to E5.'));
  document.title = 'AP Super · ' + t('Oído Absoluto Multi', 'Absolute Pitch Multi');
  app.innerHTML = `<div class="ag-shell"><header class="ag-topbar"><div class="ag-brand"><img src="${import.meta.env.BASE_URL}brand/storm-studios-logo.png" alt="Storm Studios"><div><p class="kicker">AP Super · 2D</p><h1>${t('Oído Absoluto Multi', 'Absolute Pitch Multi')}</h1></div></div>${state.screen !== 'menu' ? button('menu', t('Menú', 'Menu')) : ''}</header>${state.storageWarning ? `<aside class="notice" role="alert"><p>${t('No se pudieron guardar algunos datos en este dispositivo. El progreso y las respuestas de esta sesión siguen en memoria. Exporta tus estadísticas a CSV antes de salir.', 'Some data could not be saved on this device. This session’s progress and answers remain in memory. Export your statistics to CSV before leaving.')}</p>${button('dismiss-warning', c.stats.dismiss)}</aside>` : ''}<div id="audio-status" role="status">${esc(audioError)}</div>${state.screen === 'menu' ? menu() : state.screen === 'levels' ? levels() : state.screen === 'warmup' ? warmup() : state.screen === 'training' ? training() : state.screen === 'victory' ? victory() : renderStatistics(state, c)}</div>`;
  if (focusAction) Array.from(app.querySelectorAll<HTMLElement>('[data-action]')).find(e => e.dataset.action === focusAction && e.dataset.value === focusValue)?.focus({ preventScroll: true });
  updateRing();
}

function updateRing() {
  const ring = document.querySelector<HTMLElement>('#rest-ring');
  const time = document.querySelector<HTMLElement>('#rest-time');
  if (!ring || !time) return;
  const progress = restProgress(state.answeredAt);
  ring.style.setProperty('--rest', `${progress * 360}deg`);
  ring.classList.toggle('rest-complete', progress === 1);
  time.textContent = state.answeredAt === null ? '' : `${Math.floor(progress * 60)} / 60 ${t('segundos', 'seconds')}${progress === 1 ? ' ✓' : ''}`;
}

async function play(question: Question | null, loop = false) {
  if (!question) return;
  const version = ++playbackVersion;
  audioError = '';
  const status = document.querySelector('#audio-status'); if (status) status.textContent = '';
  const result = await audio.play(`${question.timbre}/${sampleName(question.pitch)}.mp3`, loop);
  if (version !== playbackVersion) return;
  if (result !== 'playing') {
    audioError = t('No se pudo reproducir el audio. Revisa tu conexión y toca de nuevo para reintentar.', 'Audio could not play. Check your connection and tap again to retry.');
    const element = document.querySelector('#audio-status'); if (element) element.textContent = audioError;
  }
}
function stop() { playbackVersion++; audio.stop(); audioError = ''; }
function selectLevel(number: number) { stop(); audio.cancelPreload(); state.selectLevel(number); void audio.preload(state.level.pitches); }

app.addEventListener('click', event => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  if (!target || target.disabled) return;
  const action = target.dataset.action, value = Number(target.dataset.value);
  switch (action) {
    case 'menu': stop(); audio.cancelPreload(); state.navigate('menu'); break;
    case 'continue': selectLevel(state.continueLevel()); break;
    case 'world': stop(); state.selectWorld(value); break;
    case 'levels': stop(); audio.cancelPreload(); state.selectWorld(state.selectedWorld); break;
    case 'level': selectLevel(value); break;
    case 'notation': state.toggleAccidentals(); break;
    case 'warmup-note': void play(state.warmupQuestion(value)); return;
    case 'start': stop(); state.startTraining(); break;
    case 'new': { const question = state.newQuestion(); if (question) void play(question, state.loopNote); break; }
    case 'replay': void play(state.question, state.loopNote); return;
    case 'loop': state.toggleLoop(); audio.setLooping(state.loopNote); if (state.question && !audio.isPlaying()) void play(state.question, state.loopNote); break;
    case 'answer': if (state.answer(value)) stop(); break;
    case 'hear': void play(state.feedback?.question ?? null); return;
    case 'next': stop(); state.advanceLevel(); void audio.preload(state.level.pitches); break;
    case 'statistics': stop(); audio.cancelPreload(); state.openStatistics(); break;
    case 'stats-back': state.navigate(state.statsReturn); break;
    case 'export-csv': downloadStatistics(state, c); return;
    case 'clear-stats': if (window.confirm(c.stats.clearConfirm)) state.clearStatistics(); break;
    case 'dismiss-warning': state.storageWarning = false; break;
    default: return;
  }
  render();
});
app.addEventListener('change', event => {
  const target = event.target as HTMLSelectElement;
  if (target.dataset.action === 'sequence') { stop(); state.selectSequence(target.value === 'Mujer' ? 'Mujer' : 'Hombre'); render(); }
  if (target.dataset.action === 'stats-filter') { state.statsLevel = target.value === 'all' ? null : Number(target.value); render(); }
});
app.addEventListener('input', event => {
  const target = event.target as HTMLInputElement;
  if (target.dataset.action === 'volume') { state.setVolume(Number(target.value)); audio.setVolume(state.volume); }
});
window.addEventListener('storage', event => { if (event.key === null || event.key.startsWith('walking-ap:')) { state.refreshSharedData(); render(); } });
window.addEventListener('pagehide', () => { stop(); audio.cancelPreload(); });
setInterval(updateRing, 250);
render();
