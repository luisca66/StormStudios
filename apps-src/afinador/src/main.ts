import './style.css';
import { language, t } from './i18n';
import { Microphone, type Reading } from './audio/Microphone';
import { AccidentalStyle, MusicalNote } from './dsp/PitchDetectionResult';
import { meterMarkup, moveNeedle } from './meter';
import { InstrumentModes } from './dsp/InstrumentMode';

document.documentElement.lang = language;
document.title = t.title;
let accidental = AccidentalStyle.Sharps;
try { if (localStorage.getItem('storm.afinador.accidental') === AccidentalStyle.Flats) accidental = AccidentalStyle.Flats; } catch {}
// Instrumento y calibración, como en la app Android (A4 de 430 a 450 Hz).
let mode = InstrumentModes.Chromatic, a4 = 440;
try {
  mode = InstrumentModes.byId(localStorage.getItem('storm.afinador.mode'));
  const saved = Number(localStorage.getItem('storm.afinador.a4'));
  if (saved >= 430 && saved <= 450) a4 = Math.round(saved);
} catch {}
const lowestMidi = () => Math.min(36, ...mode.targets.map(target => target.midi));
const noteName = (midi: number) => ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'][midi % 12] + String(Math.floor(midi / 12) - 1);
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="tuner" aria-label="${t.title}">
    <header class="topbar"><div class="badge"><span class="badge-dot"></span><span id="badge-text">${t.stopped}</span></div>
      <div class="acc-wrap" role="group" aria-label="${t.sharps} / ${t.flats}"><button id="sharps" aria-label="${t.sharps}">♯</button><button id="flats" aria-label="${t.flats}">♭</button></div>
    </header>
    <section class="instrument">
      <div class="note-section"><div class="halo"></div><button id="mode-chip" class="mode-chip" aria-haspopup="dialog" title="${t.modeHint}"></button><div class="note-row" aria-hidden="true"><span id="letter">—</span><span id="accidental"></span><span id="octave"></span></div>
        <div class="freq-line"><span id="hz">— Hz</span><span class="a4-text"></span></div>
        <div class="cents-row"><span id="cents">—</span><span class="cents-unit">ct</span></div>
        <p class="status-txt" id="status" role="status">${t.noNote}</p><p class="hint">${t.hint}</p>
      </div>
      <div class="meter-wrap">${meterMarkup(t.meter)}<div class="meter-caption"><span>${t.low}</span><span id="range"></span><span>${t.high}</span></div></div>
    </section>
    <footer class="panels"><div class="panel"><div class="panel-head"><label for="signal">${t.signal}</label><span id="signal-pct">0%</span></div><meter id="signal" min="0" max="1" value="0"></meter><div class="panel-track"><div id="signal-fill"></div></div></div>
      <div class="panel"><div class="panel-head"><label for="confidence">${t.confidence}</label><span id="confidence-pct">0%</span></div><meter id="confidence" min="0" max="1" value="0"></meter><div class="panel-track"><div id="confidence-fill"></div></div></div>
      <button id="stop" class="quiet">${t.stop}</button>
    </footer>
  </main>
  <section id="permission" class="permission" aria-labelledby="permission-title">
    <div class="permission-card"><div class="mic-icon" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="15" y="5" width="10" height="19" rx="5"/><path d="M10 19a10 10 0 0 0 20 0M20 29v6m-6 0h12"/></svg></div>
      <h1 id="permission-title">${t.permissionTitle}</h1><p>${t.permissionBody}</p><p id="error" role="alert"></p>
      <button id="start" class="primary">${t.start}</button><span class="permission-meta"><span class="range-text"></span> <span>·</span> <span class="a4-text"></span></span>
    </div>
  </section>
  <dialog id="mode-panel" class="mode-panel" aria-labelledby="mode-title">
    <h2 id="mode-title">${t.mode}</h2>
    <div class="mode-list" role="radiogroup" aria-labelledby="mode-title">${InstrumentModes.all.map(m => `
      <button class="mode-row" role="radio" data-mode="${m.id}"><span><strong>${t.instruments[m.id]}</strong>${m.isChromatic ? '' : `<small>${t.standard}</small>`}</span>
        <code>${m.isChromatic ? t.allNotes : m.targets.map(target => target.label).join('  ')}</code></button>`).join('')}
    </div>
    <h2>${t.calibration}</h2>
    <div class="calibration"><button id="a4-down" aria-label="${t.lower}">−1 Hz</button><output id="a4-value" aria-live="polite"></output><button id="a4-up" aria-label="${t.higher}">+1 Hz</button></div>
    <button id="mode-close" class="primary">${t.close}</button>
  </dialog>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const tuner = document.querySelector<HTMLElement>('.tuner')!;
const permission = $('permission'), start = $<HTMLButtonElement>('start');
const microphone = new Microphone();
const panel = $<HTMLDialogElement>('mode-panel');
function renderMode(stringLabel: string | null = null) {
  const name = t.instruments[mode.id].toUpperCase();
  const chip = $('mode-chip');
  chip.textContent = mode.isChromatic ? name : `${name} · ${stringLabel ?? t.standard.toUpperCase()}`;
  chip.classList.toggle('on-string', stringLabel !== null);
  const range = `${noteName(lowestMidi())}–C7`;
  $('range').textContent = range;
  document.querySelectorAll('.range-text').forEach(el => { el.textContent = range; });
  document.querySelectorAll('.a4-text').forEach(el => { el.textContent = `A4 = ${a4} Hz`; });
  $('a4-value').textContent = `A4 = ${a4} Hz`;
  document.querySelectorAll<HTMLElement>('.mode-row').forEach(row => row.setAttribute('aria-checked', String(row.dataset.mode === mode.id)));
}
function applySettings() {
  microphone.configure({ a4, lowestMidi: lowestMidi() });
  try { localStorage.setItem('storm.afinador.mode', mode.id); localStorage.setItem('storm.afinador.a4', String(a4)); } catch {}
  renderMode();
}
$('mode-chip').addEventListener('click', () => panel.showModal());
$('mode-close').addEventListener('click', () => panel.close());
panel.addEventListener('click', event => { if (event.target === panel) panel.close(); });
document.querySelectorAll<HTMLElement>('.mode-row').forEach(row => row.addEventListener('click', () => {
  mode = InstrumentModes.byId(row.dataset.mode); applySettings();
}));
$('a4-down').addEventListener('click', () => { a4 = Math.max(430, a4 - 1); applySettings(); });
$('a4-up').addEventListener('click', () => { a4 = Math.min(450, a4 + 1); applySettings(); });
applySettings();
let active = false, pending = false, session = 0, reading: Reading | null = null;
let displayedCents = 0, targetCents = 0, lastTime = 0, raf = 0, lastAnnouncement = '';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function updateAccidental() {
  for (const style of [AccidentalStyle.Sharps, AccidentalStyle.Flats]) $(style).setAttribute('aria-pressed', String(style === accidental));
  if (reading) updateReading(reading);
}
for (const style of [AccidentalStyle.Sharps, AccidentalStyle.Flats]) $(style).addEventListener('click', () => {
  accidental = style;
  try { localStorage.setItem('storm.afinador.accidental', style); } catch {}
  updateAccidental();
});
function setBar(id: string, value: number) {
  value = Math.max(0, Math.min(1, value));
  $(id).setAttribute('value', String(value)); $(id + '-pct').textContent = `${Math.round(value * 100)}%`;
  $(id + '-fill').style.width = `${value * 100}%`;
}
function updateReading(next: Reading) {
  reading = next;
  const hasNote = next.hasPitch && next.result.note !== null;
  const note = hasNote ? next.result.note! : null;
  const cents = note?.cents ?? null;
  // A held frame is visibly provisional and can never show the in-tune indicator.
  const state = cents === null ? 'empty' : next.held ? 'held' : Math.abs(cents) <= 5 ? 'tuned' : cents < 0 ? 'low' : 'high';
  tuner.dataset.state = state;
  targetCents = cents ?? 0;
  const named = note ? new MusicalNote(note.midi, note.pitchClass, note.octave, note.frequencyHz, note.cents).name(accidental) : '';
  $('letter').textContent = named ? named[0] : '—';
  $('accidental').textContent = named.includes('#') ? '♯' : named.includes('b') ? '♭' : '';
  $('octave').textContent = note ? String(note.octave) : '';
  renderMode(note && !next.held ? mode.match(note)?.label ?? null : null);
  $('hz').textContent = note ? `${next.result.frequencyHz!.toFixed(1)} Hz` : '— Hz';
  // Sin «−0.0»: lo que redondea a cero se muestra +0.0.
  const shown = cents !== null && Math.abs(cents) < 0.05 ? 0 : cents;
  $('cents').textContent = shown === null ? '—' : `${shown >= 0 ? '+' : ''}${shown.toFixed(Math.abs(shown) < 10 ? 1 : 0)}`;
  const status = state === 'empty' ? t.noNote : state === 'held' ? t.checking : state === 'tuned' ? `✦ ${t.inTune}` : state === 'low' ? `▾ ${t.low}` : `▴ ${t.high}`;
  // Only announce note/status transitions, never every numeric frame.
  const announcement = `${named.replace('#', '♯').replace('b', '♭')} ${status}`.trim();
  if (announcement !== lastAnnouncement) { $('status').textContent = announcement; lastAnnouncement = announcement; }
  $('badge-text').textContent = !active ? t.stopped : state === 'held' ? t.checking : hasNote ? t.detecting : t.listening;
  setBar('signal', next.rms * 3); setBar('confidence', next.confidence);
}
function animate(now: number) {
  const dt = lastTime ? Math.min(100, now - lastTime) : 16.67; lastTime = now;
  const diff = targetCents - displayedCents;
  // 15% at 60fps, time-corrected for high refresh displays and dropped frames.
  displayedCents = reducedMotion.matches || Math.abs(diff) < 0.07 ? targetCents : displayedCents + diff * (1 - 0.85 ** (dt / 16.67));
  moveNeedle(displayedCents, reading?.hasPitch ?? false);
  raf = requestAnimationFrame(animate);
}
function empty() {
  reading = null; displayedCents = targetCents = 0;
  tuner.dataset.state = 'empty'; $('badge-text').textContent = t.stopped;
  $('letter').textContent = '—'; $('accidental').textContent = $('octave').textContent = '';
  $('hz').textContent = '— Hz'; $('cents').textContent = '—'; $('status').textContent = t.noNote;
  lastAnnouncement = ''; setBar('signal', 0); setBar('confidence', 0); moveNeedle(0, false); renderMode();
}
function stop(message = '') {
  session++; active = pending = false; microphone.stop(); cancelAnimationFrame(raf); lastTime = 0;
  tuner.classList.remove('listening'); empty(); permission.hidden = false; tuner.inert = true;
  start.disabled = false; start.textContent = t.start; $('error').textContent = message;
}
function failure(code: string) {
  const message = t[code as keyof typeof t];
  stop(typeof message === 'string' ? message : t.capture); start.textContent = t.retry; start.focus();
}
start.addEventListener('click', async () => {
  if (pending) return;
  pending = true; const token = ++session;
  start.disabled = true; start.textContent = t.waiting; $('error').textContent = '';
  try {
    await microphone.start(next => { if (active) updateReading(next); }, failure);
    if (token !== session) return;
    pending = false; active = true; permission.hidden = true; tuner.inert = false; tuner.classList.add('listening');
    $('badge-text').textContent = t.listening; raf = requestAnimationFrame(animate); $('stop').focus();
  } catch (error) {
    if (token !== session) return;
    const name = error instanceof Error ? error.name : '';
    const code = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'noDevice' : name === 'NotReadableError' ? 'busy' : error instanceof Error ? error.message : 'capture';
    failure(code);
  }
});
$('stop').addEventListener('click', () => { stop(); start.focus(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && (active || pending)) stop(t.paused); });
window.addEventListener('pagehide', () => stop());
updateAccidental(); stop();
