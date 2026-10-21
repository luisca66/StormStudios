// music.ts — La música de Mutación (compuesta por Luis): 20 pistas en R2 que suenan SOLO mientras se juega,
// siempre en orden
// aleatorio y sin repetir hasta agotar la lista; al volver a barajar, la primera nunca es la que
// acaba de sonar. Control de volumen y silencio en una franja fija bajo el juego (fuera de #app,
// que se redibuja con cada cambio de estado), recordados en este dispositivo.

import { detectLang } from "./i18n";

const BASE = "https://samples.stormstudios.com.mx/music/mutacion";
// Versión de la música: cambiarla si Luis reemplaza pistas (y evita respuestas viejas guardadas en el CDN).
const VERSION = "1";
export const TRACKS = Array.from({ length: 20 }, (_, i) => `${BASE}/mutacion-${String(i + 1).padStart(2, "0")}.mp3?v=${VERSION}`);
const VOLUME_KEY = "mutacion.music.volume";
const MUTED_KEY = "mutacion.music.muted";

const labels = detectLang() === "en"
  ? { mute: "Mute music", unmute: "Unmute music", volume: "Music volume", music: "Music" }
  : { mute: "Silenciar música", unmute: "Activar música", volume: "Volumen de la música", music: "Música" };

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* sin almacenamiento: se usa el valor en memoria */ }
}

export function shuffled(previous: string | null): string[] {
  const bag = [...TRACKS];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  // Al empezar una vuelta nueva, que no se repita la última pista de la vuelta anterior.
  if (previous && bag[0] === previous) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
  return bag;
}

const ICON_ON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

/** Devuelve el control para que el juego diga cuándo se está jugando (sólo entonces suena). */
export function startMusic(): { setPlaying(playing: boolean): void } {
  const audio = new Audio();
  audio.preload = "auto";
  // Solo en desarrollo: para comprobar desde la consola que la música suena.
  if (import.meta.env.DEV) (window as unknown as { mutacionMusic: HTMLAudioElement }).mutacionMusic = audio;
  let volume = Number(read(VOLUME_KEY) ?? "0.5");
  if (!Number.isFinite(volume) || volume < 0 || volume > 1) volume = 0.5;
  let muted = read(MUTED_KEY) === "1";
  let queue: string[] = [];
  let current: string | null = null;
  let unlocked = false;   // el navegador sólo deja sonar audio después de un gesto del usuario
  let playing = false;    // en partida, sin pausa ni fin de juego
  let failures = 0;

  const dock = document.createElement("div");
  dock.className = "music-dock";
  dock.innerHTML = `
    <span class="music-label">${labels.music}</span>
    <button type="button" class="music-mute"></button>
    <input type="range" class="music-volume" min="0" max="1" step="0.01" aria-label="${labels.volume}">`;
  document.body.appendChild(dock);
  const muteBtn = dock.querySelector<HTMLButtonElement>(".music-mute")!;
  const slider = dock.querySelector<HTMLInputElement>(".music-volume")!;

  function apply(): void {
    audio.volume = volume;
    audio.muted = muted || volume === 0;
    slider.value = String(volume);
    slider.style.setProperty("--fill", `${Math.round(volume * 100)}%`);
    const silent = muted || volume === 0;
    muteBtn.innerHTML = silent ? ICON_OFF : ICON_ON;
    muteBtn.setAttribute("aria-label", silent ? labels.unmute : labels.mute);
    muteBtn.setAttribute("aria-pressed", String(silent));
    dock.classList.toggle("is-muted", silent);
  }

  function playNext(): void {
    if (queue.length === 0) queue = shuffled(current);
    current = queue.shift()!;
    audio.src = current;
    if (playing && unlocked && !document.hidden) void audio.play().catch(() => { /* se reintenta en el siguiente gesto */ });
  }

  audio.addEventListener("ended", () => { failures = 0; playNext(); });
  audio.addEventListener("playing", () => { failures = 0; });
  audio.addEventListener("error", () => {
    // Una pista que no carga no detiene la música, pero tampoco se reintenta sin fin.
    if (++failures < TRACKS.length) playNext();
  });

  // Suena sólo en partida, con la pestaña visible y después de un gesto; si no, en pausa en su lugar.
  function update(): void {
    if (!(playing && unlocked && !document.hidden)) { audio.pause(); return; }
    if (!current) playNext();
    else if (audio.paused) void audio.play().catch(() => {});
  }
  const unlock = (): void => { if (!unlocked) { unlocked = true; update(); } };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);

  muteBtn.addEventListener("click", () => {
    if (!muted && volume === 0) volume = 0.5;   // si el volumen estaba en cero, el botón lo devuelve
    else muted = !muted;
    write(MUTED_KEY, muted ? "1" : "0");
    write(VOLUME_KEY, String(volume));
    apply();
  });
  slider.addEventListener("input", () => {
    volume = Number(slider.value);
    if (volume > 0 && muted) { muted = false; write(MUTED_KEY, "0"); }
    write(VOLUME_KEY, String(volume));
    apply();
  });

  // Fuera de la pestaña no suena; al volver sigue la misma pista.
  document.addEventListener("visibilitychange", update);

  apply();
  return { setPlaying(next: boolean) { if (next !== playing) { playing = next; update(); } } };
}
