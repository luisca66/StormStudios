// Reproductor de samples (PLAN §3.3) — port TS del audio-player.js de la webapp seria,
// tomado del port ya probado de Batisfera (apps-src/acordes-juego/src/audio/samples.ts).
// HTMLAudioElement con cache y clonado para solapar notas (patrón de la casa).

import { AUDIO_BASE, INSTRUMENTS, type Instrument, type InstrumentChoice } from "@/config";

// WAV PCM de cuatro muestras silenciosas. Se reproduce durante el primer gesto para
// dejar habilitado HTMLAudioElement antes de cualquier espera de red.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";

export function resolveInstrument(choice: InstrumentChoice): Instrument {
  if (choice !== "Aleatorio") return choice;
  return INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)];
}

interface PlaylistEntry {
  audio: HTMLAudioElement;
  urls: string[];
  order: number[];
  cursor: number;
  index: number;
  volumeScale: number;
  currentScale: number;
  fadeToken: number;
  stopped: boolean;
}

/** Baraja un ciclo completo y evita repetir entre el final y el inicio de ciclos. */
export function shuffleTrackIndices(
  length: number,
  previous = -1,
  random: () => number = Math.random,
): number[] {
  const order = Array.from({ length: Math.max(0, length) }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.length > 1 && order[0] === previous) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

export class SamplePlayer {
  private cache = new Map<string, HTMLAudioElement>();
  private activeAudios: HTMLAudioElement[] = [];
  private loops = new Map<string, { audio: HTMLAudioElement; volumeScale: number }>();
  private playlists = new Map<string, PlaylistEntry>();
  private volume = 0.8;
  private unlocked = false;
  private unlockAudio: HTMLAudioElement | null = null;
  private loopRetryArmed = false;

  /** Llamar sincrónicamente desde un click/keydown real antes de cualquier await. */
  unlock(): void {
    if (this.unlocked || this.unlockAudio) return;
    const audio = new Audio(SILENT_WAV);
    audio.volume = 0;
    this.unlockAudio = audio;
    void audio.play().then(() => {
      this.unlocked = true;
      audio.pause();
      this.unlockAudio = null;
    }).catch(() => {
      // Otro gesto (por ejemplo amarrar una cuerda) volverá a intentarlo.
      this.unlockAudio = null;
    });
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    for (const entry of this.playlists.values()) {
      entry.audio.volume = Math.max(0, Math.min(1, this.volume * entry.currentScale));
    }
  }

  getVolume(): number {
    return this.volume;
  }

  noteUrl(note: string, instrument: Instrument): string {
    // El "#" de los sostenidos DEBE ir URL-encoded (%23).
    const safeNote = note.replace("#", "%23");
    return `${AUDIO_BASE}/${instrument}/${safeNote}.mp3`;
  }

  preload(url: string): Promise<HTMLAudioElement> {
    const cached = this.cache.get(url);
    if (cached) return Promise.resolve(cached);

    return new Promise((resolve) => {
      const audio = new Audio();
      let settled = false;
      let timeoutId = 0;

      const done = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        audio.removeEventListener("canplaythrough", done);
        audio.removeEventListener("loadeddata", done);
        audio.removeEventListener("error", done);
        this.cache.set(url, audio);
        resolve(audio);
      };

      timeoutId = window.setTimeout(done, 3500);
      audio.addEventListener("canplaythrough", done);
      audio.addEventListener("loadeddata", done);
      audio.addEventListener("error", done);
      audio.src = url;
      audio.load();
    });
  }

  async preloadEffects(): Promise<void> {
    await Promise.all([
      this.preload(`${AUDIO_BASE}/acierto.mp3`),
      this.preload(`${AUDIO_BASE}/error.mp3`),
    ]);
  }

  /** track=false: SFX (acierto/error) que stopChord NO debe cortar — sin él,
   * el stopChord() del acorde armónico mataba el acierto.mp3 en el mismo tick. */
  private playUrl(url: string, volume: number, track = true): void {
    const base = this.cache.get(url);
    const audio = base ? (base.cloneNode() as HTMLAudioElement) : new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err: unknown) => {
      // NotAllowedError es recuperable con el siguiente gesto; no es un fallo del asset.
      if (!this.isAutoplayBlock(err)) console.warn("Audio no disponible:", err);
    });
    if (!track) return;
    this.activeAudios.push(audio);
    audio.addEventListener(
      "ended",
      () => {
        this.activeAudios = this.activeAudios.filter((a) => a !== audio);
      },
      { once: true },
    );
  }

  // Nota suelta: referencia al amarrar y confirmación al encender cada linterna
  // (PLAN §3.3). Se solapa con lo que ya suene (no corta el acorde ni otras notas).
  async playNote(note: string, instrument: Instrument): Promise<void> {
    this.unlock();
    const url = this.noteUrl(note, instrument);
    await this.preload(url);
    this.playUrl(url, this.volume);
  }

  // Acorde armónico: todas las notas simultáneas (PLAN §3.3).
  async playChord(notes: string[], instrument: Instrument): Promise<void> {
    this.unlock();
    this.stopChord();
    const urls = notes.map((n) => this.noteUrl(n, instrument));
    await Promise.all(urls.map((u) => this.preload(u)));
    urls.forEach((u) => this.playUrl(u, this.volume));
  }

  stopChord(): void {
    for (const audio of this.activeAudios) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch {
        // ya detenido
      }
    }
    this.activeAudios = [];
  }

  playCorrect(): void {
    this.playUrl(`${AUDIO_BASE}/acierto.mp3`, this.volume, false);
  }

  playIncorrect(): void {
    this.playUrl(`${AUDIO_BASE}/error.mp3`, this.volume, false);
  }

  // Sonido ambiental en loop. Requiere gesto previo del usuario (autoplay policy) —
  // llamar desde el inicio del ascenso, no antes.
  startLoop(name: string, url: string, volumeScale = 1): void {
    this.unlock();
    let entry = this.loops.get(name);
    if (!entry) {
      const audio = new Audio(url);
      audio.loop = true;
      audio.preload = "auto";
      entry = { audio, volumeScale };
      this.loops.set(name, entry);
    }
    entry.audio.volume = Math.max(0, Math.min(1, volumeScale));
    if (entry.audio.paused) {
      entry.audio.play().catch((err: unknown) => {
        if (this.isAutoplayBlock(err)) this.armLoopRetry();
        else console.warn(`Loop "${name}" no disponible:`, err);
      });
    }
  }

  private isAutoplayBlock(error: unknown): boolean {
    return error instanceof DOMException && error.name === "NotAllowedError";
  }

  /** Si el navegador no reconoció el primer gesto, reintenta en el siguiente real. */
  private armLoopRetry(): void {
    if (this.loopRetryArmed) return;
    this.loopRetryArmed = true;
    const retry = () => {
      window.removeEventListener("pointerdown", retry, true);
      window.removeEventListener("keydown", retry, true);
      this.loopRetryArmed = false;
      for (const [name, entry] of this.loops) {
        if (!entry.audio.paused) continue;
        entry.audio.play().catch((err: unknown) => {
          if (this.isAutoplayBlock(err)) this.armLoopRetry();
          else console.warn(`Loop "${name}" no disponible:`, err);
        });
      }
      for (const [name, entry] of this.playlists) {
        if (!entry.audio.paused || entry.currentScale === 0 || entry.stopped) continue;
        entry.audio.play().catch((err: unknown) => {
          if (this.isAutoplayBlock(err)) this.armLoopRetry();
          else console.warn(`Música "${name}" no disponible:`, err);
        });
      }
    };
    window.addEventListener("pointerdown", retry, { capture: true, once: true });
    window.addEventListener("keydown", retry, { capture: true, once: true });
  }

  stopLoop(name: string): void {
    const entry = this.loops.get(name);
    if (entry && !entry.audio.paused) {
      entry.audio.pause();
      entry.audio.currentTime = 0;
    }
  }

  /** Playlist aleatoria sin repetir pistas hasta agotar el ciclo completo. */
  startPlaylist(name: string, urls: string[], volumeScale = 1): void {
    if (urls.length === 0) return;
    this.unlock();
    let entry = this.playlists.get(name);
    if (!entry) {
      const order = shuffleTrackIndices(urls.length);
      const index = order[0];
      const audio = new Audio(urls[index]);
      audio.preload = "auto";
      entry = {
        audio,
        urls: [...urls],
        order,
        cursor: 0,
        index,
        volumeScale,
        currentScale: volumeScale,
        fadeToken: 0,
        stopped: false,
      };
      audio.addEventListener("ended", () => this.advancePlaylist(name));
      audio.addEventListener("error", () => {
        console.warn(`Pista musical no disponible: ${audio.src}`);
      });
      this.playlists.set(name, entry);
    } else {
      if (entry.stopped) {
        entry.order = shuffleTrackIndices(entry.urls.length, entry.index);
        entry.cursor = 0;
        entry.index = entry.order[0];
        entry.audio.src = entry.urls[entry.index];
        entry.audio.load();
        entry.audio.currentTime = 0;
        entry.stopped = false;
      }
      entry.volumeScale = volumeScale;
      entry.currentScale = volumeScale;
      entry.fadeToken++;
    }
    entry.audio.volume = Math.max(0, Math.min(1, this.volume * entry.currentScale));
    if (entry.audio.paused) {
      entry.audio.play().catch((err: unknown) => {
        if (this.isAutoplayBlock(err)) this.armLoopRetry();
        else console.warn(`Música "${name}" no disponible:`, err);
      });
    }
  }

  private advancePlaylist(name: string): void {
    const entry = this.playlists.get(name);
    if (!entry || entry.urls.length === 0 || entry.stopped) return;
    entry.cursor++;
    if (entry.cursor >= entry.order.length) {
      entry.order = shuffleTrackIndices(entry.urls.length, entry.index);
      entry.cursor = 0;
    }
    entry.index = entry.order[entry.cursor];
    entry.audio.src = entry.urls[entry.index];
    entry.audio.load();
    entry.audio.play().catch((err: unknown) => {
      if (this.isAutoplayBlock(err)) this.armLoopRetry();
      else console.warn(`Pista musical no disponible: ${entry.audio.src}`, err);
    });
  }

  private fadePlaylistTo(
    name: string,
    targetScale: number,
    durationMs: number,
    pauseAfter: boolean,
  ): Promise<void> {
    const entry = this.playlists.get(name);
    if (!entry) return Promise.resolve();
    const target = Math.max(0, targetScale);
    const from = entry.currentScale;
    const token = ++entry.fadeToken;
    if (durationMs <= 0 || Math.abs(from - target) < 0.0001) {
      entry.currentScale = target;
      entry.audio.volume = Math.max(0, Math.min(1, this.volume * target));
      if (pauseAfter) entry.audio.pause();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const started = performance.now();
      const step = (now: number) => {
        if (entry.fadeToken !== token) {
          resolve();
          return;
        }
        const t = Math.min(1, (now - started) / durationMs);
        const eased = t * t * (3 - 2 * t);
        entry.currentScale = from + (target - from) * eased;
        entry.audio.volume = Math.max(0, Math.min(1, this.volume * entry.currentScale));
        if (t < 1) {
          requestAnimationFrame(step);
          return;
        }
        if (pauseAfter) entry.audio.pause();
        resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /** Silencia y pausa la pista conservando su punto de reproducción. */
  pausePlaylist(name: string, fadeMs = 0): Promise<void> {
    return this.fadePlaylistTo(name, 0, fadeMs, true);
  }

  /** Continúa la misma pista y recupera su volumen con un fundido. */
  resumePlaylist(name: string, fadeMs = 0): void {
    const entry = this.playlists.get(name);
    if (!entry || entry.stopped) return;
    entry.fadeToken++;
    entry.currentScale = 0;
    entry.audio.volume = 0;
    entry.audio.play().then(() => {
      void this.fadePlaylistTo(name, entry.volumeScale, fadeMs, false);
    }).catch((err: unknown) => {
      if (this.isAutoplayBlock(err)) this.armLoopRetry();
      else console.warn(`Música "${name}" no disponible:`, err);
    });
  }

  /** Detiene la playlist y prepara un nuevo orden aleatorio para la próxima partida. */
  stopPlaylist(name: string): void {
    const entry = this.playlists.get(name);
    if (!entry) return;
    entry.fadeToken++;
    entry.audio.pause();
    entry.audio.currentTime = 0;
    entry.stopped = true;
    entry.currentScale = entry.volumeScale;
    entry.audio.volume = Math.max(0, Math.min(1, this.volume * entry.currentScale));
  }

  /** Estado mínimo expuesto para QA local. */
  playlistState(name: string): {
    paused: boolean;
    currentTime: number;
    volume: number;
    index: number;
    src: string;
  } | null {
    const entry = this.playlists.get(name);
    return entry
      ? {
          paused: entry.audio.paused,
          currentTime: entry.audio.currentTime,
          volume: entry.audio.volume,
          index: entry.index,
          src: entry.audio.src,
        }
      : null;
  }
}
