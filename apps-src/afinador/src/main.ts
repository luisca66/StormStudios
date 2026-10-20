import './style.css';
import { language, t } from './i18n';
import { Microphone, type Reading } from './audio/Microphone';
import { AccidentalStyle, MusicalNote } from './dsp/PitchDetectionResult';
import { meterMarkup, moveNeedle } from './meter';

document.documentElement.lang = language;
document.title = t.title;
let accidental = AccidentalStyle.Sharps;
try { if (localStorage.getItem('storm.afinador.accidental') === AccidentalStyle.Flats) accidental = AccidentalStyle.Flats; } catch {}
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="tuner" aria-label="${t.title}">
    <header class="topbar"><div class="badge"><span class="badge-dot"></span><span id="badge-text">${t.stopped}</span></div>
      <div class="acc-wrap" role="group" aria-label="${t.sharps} / ${t.flats}"><button id="sharps" aria-label="${t.sharps}">♯</button><button id="flats" aria-label="${t.flats}">♭</button></div>
    </header>
    <section class="instrument">
      <div class="note-section"><div class="halo"></div><div class="note-row" aria-hidden="true"><span id="letter">—</span><span id="accidental"></span><span id="octave"></span></div>
        <div class="freq-line"><span id="hz">— Hz</span><span> A4 = 440 Hz</span></div>
        <div class="cents-row"><span id="cents">—</span><span class="cents-unit">ct</span></div>
        <p class="status-txt" id="status" role="status">${t.noNote}</p><p class="hint">${t.hint}</p>
      </div>
      <div class="meter-wrap">${meterMarkup(t.meter)}<div class="meter-caption"><span>${t.low}</span><span>${t.range}</span><span>${t.high}</span></div></div>
    </section>
    <footer class="panels"><div class="panel"><div class="panel-head"><label for="signal">${t.signal}</label><span id="signal-pct">0%</span></div><meter id="signal" min="0" max="1" value="0"></meter><div class="panel-track"><div id="signal-fill"></div></div></div>
      <div class="panel"><div class="panel-head"><label for="confidence">${t.confidence}</label><span id="confidence-pct">0%</span></div><meter id="confidence" min="0" max="1" value="0"></meter><div class="panel-track"><div id="confidence-fill"></div></div></div>
      <button id="stop" class="quiet">${t.stop}</button>
    </footer>
  </main>
  <section id="permission" class="permission" aria-labelledby="permission-title">
    <div class="permission-card"><div class="mic-icon" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="15" y="5" width="10" height="19" rx="5"/><path d="M10 19a10 10 0 0 0 20 0M20 29v6m-6 0h12"/></svg></div>
      <h1 id="permission-title">${t.permissionTitle}</h1><p>${t.permissionBody}</p><p id="error" role="alert"></p>
      <button id="start" class="primary">${t.start}</button><span class="permission-meta">C2–C7 <span>·</span> A4 = 440 Hz</span>
    </div>
  </section>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const tuner = document.querySelector<HTMLElement>('.tuner')!;
const permission = $('permission'), start = $<HTMLButtonElement>('start');
const microphone = new Microphone();
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
  $('hz').textContent = note ? `${next.result.frequencyHz!.toFixed(1)} Hz` : '— Hz';
  $('cents').textContent = cents === null ? '—' : `${cents >= 0 ? '+' : ''}${cents.toFixed(Math.abs(cents) < 10 ? 1 : 0)}`;
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
  lastAnnouncement = ''; setBar('signal', 0); setBar('confidence', 0); moveNeedle(0, false);
}
function stop(message = '') {
  session++; active = pending = false; microphone.stop(); cancelAnimationFrame(raf); lastTime = 0;
  tuner.classList.remove('listening'); empty(); permission.hidden = false; tuner.inert = true;
  start.disabled = false; start.textContent = t.start; $('error').textContent = message;
}
function failure(code: string) { stop(t[code as keyof typeof t] ?? t.capture); start.textContent = t.retry; start.focus(); }
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
