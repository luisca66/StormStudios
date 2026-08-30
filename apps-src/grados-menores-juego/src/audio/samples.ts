// samples.ts — Reproductor de samples R2 (PLAN §3.3). Port del patrón de la casa
// (Batisfera → Expreso Tonal): HTMLAudioElement con cache y clonado para solapar.
// Propio del Cometa: el fallback enharmónico C##→D / G##→A al construir la URL.

import { AUDIO_BASE, PRELOAD_TIMEOUT_MS, SFX_BASE, SFX_DIR } from "@/config";
import { AUDIO_NOTE_FALLBACKS } from "@/music/degrees";

// WAV PCM silencioso: se reproduce en el primer gesto para desbloquear HTMLAudioElement.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";

/**
 * Sustituye las clases que no existen como archivo por su enarmónica — port de
 * `normalizeAudioSegment` de referencias/engine.js. Solo afecta al ARCHIVO: el nombre
 * teórico (C##, G##) se sigue mostrando en consola y estadísticas (PLAN §3.2).
 */
function normalizeAudioSegment(segment: string): string {
  const match = segment.match(/^([A-G]##)(\d)\.mp3$/);
  if (!match) return segment;
  const fallback = AUDIO_NOTE_FALLBACKS[match[1]];
  return fallback ? `${fallback}${match[2]}.mp3` : segment;
}

// URL segura: aplica el fallback y codifica cada segmento (espacios, #, ♭…) — port de
// audioUrl() de la app base. JAMÁS construir URLs de samples a mano (PLAN §16).
export function audioUrl(relPath: string): string {
  return AUDIO_BASE + "/" + relPath.split("/").map(normalizeAudioSegment).map(encodeURIComponent).join("/");
}

/**
 * URL de un sfx propio del juego. Misma regla que `audioUrl`: los nombres pueden llevar
 * espacios, así que nunca se concatenan a mano.
 */
export function sfxUrl(file: string): string {
  return `${SFX_BASE}/${SFX_DIR}/${encodeURIComponent(file)}`;
}

/**
 * Ruta del sample de acorde menor de una tonalidad — la firma sonora del radiofaro
 * (PLAN §3.4). Calcada de `playChord()` de la webapp seria, que es la referencia de
 * ruteo: `{timbre}/Minor Chords/{tónica}minor.mp3`.
 */
export function tonicChordPath(timbreDir: string, tonicFileName: string): string {
  return `${timbreDir}/Minor Chords/${tonicFileName}`;
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

  /** Nota suelta: pregunta, repetición, revelación de la deriva. */
  async playNote(relPath: string, volumeScale = 1): Promise<void> {
    this.unlock();
    await this.preload(relPath);
    this.playUrl(audioUrl(relPath), this.volume * volumeScale);
  }

  /** Radiofaro de casa (PLAN §3.4): el acorde de tónica menor del timbre del viaje. */
  async playTonicChord(timbreDir: string, tonicFileName: string, volumeScale = 1): Promise<void> {
    this.unlock();
    const path = tonicChordPath(timbreDir, tonicFileName);
    await this.preload(path);
    this.playUrl(audioUrl(path), this.volume * volumeScale);
  }

  /**
   * Tríada apilada (PLAN §3.5): 3 samples simultáneos. Es el mecanismo del iv y el V de
   * la cadencia, que no tienen sample de acorde propio en el bucket.
   *
   * El volumen se reparte por EQUIPOTENCIA (1/√n): a volumen completo las tres se suman
   * a ~3× la amplitud de una nota sola y saturan; 1/n deja el acorde demasiado tímido.
   * Con sonidos que no están en fase, la raíz es la mezcla que oye el oído. (Calibración
   * heredada del Expreso.)
   */
  async playTriad(relPaths: string[], volumeScale = 1): Promise<void> {
    this.unlock();
    await Promise.all(relPaths.map((p) => this.preload(p)));
    const spread = 1 / Math.sqrt(Math.max(1, relPaths.length));
    for (const p of relPaths) this.playUrl(audioUrl(p), this.volume * volumeScale * spread);
  }

  /**
   * Secuencia con separación fija (la espiral de 15 anillos, PLAN §12; también útil para
   * tónica→nota de la deriva). Devuelve cuando termina; cancelable con stopAll().
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
