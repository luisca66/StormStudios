// Reproductor de samples (PLAN §3.3) — port TS del audio-player.js de la webapp seria.
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

export class SamplePlayer {
  private cache = new Map<string, HTMLAudioElement>();
  private activeAudios: HTMLAudioElement[] = [];
  private loops = new Map<string, { audio: HTMLAudioElement; volumeScale: number }>();
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
      // Otro gesto (por ejemplo tocar una criatura) volverá a intentarlo.
      this.unlockAudio = null;
    });
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    for (const { audio, volumeScale } of this.loops.values()) {
      audio.volume = this.volume * volumeScale;
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

  private playUrl(url: string, volume: number): void {
    const base = this.cache.get(url);
    const audio = base ? (base.cloneNode() as HTMLAudioElement) : new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err: unknown) => {
      // NotAllowedError es recuperable con el siguiente gesto; no es un fallo del asset.
      if (!this.isAutoplayBlock(err)) console.warn("Audio no disponible:", err);
    });
    this.activeAudios.push(audio);
    audio.addEventListener(
      "ended",
      () => {
        this.activeAudios = this.activeAudios.filter((a) => a !== audio);
      },
      { once: true },
    );
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
    this.playUrl(`${AUDIO_BASE}/acierto.mp3`, this.volume);
  }

  playIncorrect(): void {
    this.playUrl(`${AUDIO_BASE}/error.mp3`, this.volume);
  }

  // Sonido ambiental en loop (ej. burbujas submarinas). Requiere gesto previo del
  // usuario (autoplay policy) — llamar desde startDive(), no antes.
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
    entry.audio.volume = this.volume * volumeScale;
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
}
