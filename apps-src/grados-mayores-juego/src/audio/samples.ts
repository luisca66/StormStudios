// samples.ts — Reproductor de samples R2 (PLAN §3.3). Port del patrón de la casa
// (Batisfera src/audio/samples.ts): HTMLAudioElement con cache y clonado para solapar.
// Novedades del Expreso: audioUrl con encode POR SEGMENTO (♭, ##, "Major Chords"),
// playTonicChord (silbato §3.4), playTriad (cadencia §3.5), playScaleWalk (arcos §12).

import { AUDIO_BASE, PRELOAD_TIMEOUT_MS, SFX_BASE, SFX_DIR } from "@/config";

// WAV PCM silencioso: se reproduce en el primer gesto para desbloquear HTMLAudioElement.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";

// URL segura: codifica cada segmento (espacios, #, ♭…) — port de audioUrl() de la
// app base. JAMÁS construir URLs de samples a mano (PLAN §16).
export function audioUrl(relPath: string): string {
  return AUDIO_BASE + "/" + relPath.split("/").map(encodeURIComponent).join("/");
}

/**
 * URL de un sfx (lluvia, truenos, tren, fuegos). Misma regla que `audioUrl`: los
 * nombres llevan espacios ("41 Rain.mp3"), así que nunca se concatenan a mano.
 */
export function sfxUrl(file: string): string {
  return `${SFX_BASE}/${SFX_DIR}/${encodeURIComponent(file)}`;
}

export function tonicChordPath(timbreDir: string, tonic: string): string {
  return `${timbreDir}/Major Chords/${tonic}major.mp3`;
}

export class SamplePlayer {
  private cache = new Map<string, HTMLAudioElement>();
  private activeAudios: HTMLAudioElement[] = [];
  private volume = 0.8;
  private unlocked = false;
  private unlockAudio: HTMLAudioElement | null = null;
  private walkToken = 0;

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
      // Otro gesto real volverá a intentarlo.
      this.unlockAudio = null;
    });
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  getVolume(): number {
    return this.volume;
  }

  preload(relPath: string): Promise<HTMLAudioElement> {
    const url = audioUrl(relPath);
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

      timeoutId = window.setTimeout(done, PRELOAD_TIMEOUT_MS);
      audio.addEventListener("canplaythrough", done);
      audio.addEventListener("loadeddata", done);
      audio.addEventListener("error", done);
      audio.src = url;
      audio.load();
    });
  }

  async preloadEffects(): Promise<void> {
    await Promise.all([this.preload("acierto.mp3"), this.preload("error.mp3")]);
  }

  private playUrl(url: string, volume: number): void {
    const base = this.cache.get(url);
    const audio = base ? (base.cloneNode() as HTMLAudioElement) : new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((err: unknown) => {
      // NotAllowedError es recuperable con el siguiente gesto; no es un fallo del asset.
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) {
        console.warn("Audio no disponible:", err);
      }
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

  /** Nota suelta: pregunta, repetición, revelación del desvío. */
  async playNote(relPath: string, volumeScale = 1): Promise<void> {
    this.unlock();
    await this.preload(relPath);
    this.playUrl(audioUrl(relPath), this.volume * volumeScale);
  }

  /** Silbato-tónica (PLAN §3.4): sample real "Major Chords" del timbre dado. */
  async playTonicChord(timbreDir: string, tonic: string, volumeScale = 1): Promise<void> {
    this.unlock();
    const path = tonicChordPath(timbreDir, tonic);
    await this.preload(path);
    this.playUrl(audioUrl(path), this.volume * volumeScale);
  }

  /** Tríada de la cadencia (PLAN §3.5): 3 samples de nota simultáneos. */
  async playTriad(relPaths: string[], volumeScale = 1): Promise<void> {
    this.unlock();
    await Promise.all(relPaths.map((p) => this.preload(p)));
    for (const p of relPaths) this.playUrl(audioUrl(p), this.volume * volumeScale);
  }

  /**
   * Secuencia con separación fija (los 8 arcos de la llegada, PLAN §12; también útil
   * para tónica→nota del desvío). Devuelve cuando termina; cancelable con stopAll().
   */
  async playScaleWalk(relPaths: string[], gapMs: number, volumeScale = 1): Promise<void> {
    this.unlock();
    const token = ++this.walkToken;
    await Promise.all(relPaths.map((p) => this.preload(p)));
    for (const p of relPaths) {
      if (this.walkToken !== token) return; // cancelado
      this.playUrl(audioUrl(p), this.volume * volumeScale);
      await new Promise((r) => window.setTimeout(r, gapMs));
    }
  }

  /** Detiene notas/acordes activos y cancela cualquier playScaleWalk en curso. */
  stopAll(): void {
    this.walkToken++;
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

  playCorrect(volumeScale = 1): void {
    this.playUrl(audioUrl("acierto.mp3"), this.volume * volumeScale);
  }

  playIncorrect(volumeScale = 1): void {
    this.playUrl(audioUrl("error.mp3"), this.volume * volumeScale);
  }
}
