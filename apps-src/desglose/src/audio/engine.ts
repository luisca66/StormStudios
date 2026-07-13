/**
 * engine.ts — Motor de audio (Web Audio API).
 *
 * Carga samples MP3 desde R2 (fetch → decodeAudioData → caché en memoria) y
 * reproduce acordes simultáneos. Equivale a `playChordSimultaneously` de Android.
 */
import {
  FEEDBACK_ERROR_URL,
  FEEDBACK_OK_URL,
  TIMBRES,
  sampleUrl,
  type Instrument,
  type Timbre,
} from "../config";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private readonly cache = new Map<string, AudioBuffer>();
  private active: AudioBufferSourceNode[] = [];

  /** Crea/reanuda el AudioContext. Llamar desde un gesto del usuario. */
  async unlock(): Promise<void> {
    const ctx = this.context();
    if (ctx.state === "suspended") await ctx.resume();
  }

  context(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = await this.context().decodeAudioData(arrayBuffer);
      this.cache.set(url, buffer);
      return buffer;
    } catch (err) {
      console.warn("[engine] no se pudo cargar:", url, err);
      return null;
    }
  }

  /** Resuelve el timbre concreto de una nota ("random" → aleatorio por nota). */
  private resolveTimbre(instrument: Instrument): Timbre {
    if (instrument === "random") {
      return TIMBRES[Math.floor(Math.random() * TIMBRES.length)];
    }
    return instrument;
  }

  /** Detiene cualquier reproducción en curso. */
  stopAll(): void {
    for (const src of this.active) {
      try {
        src.stop();
      } catch {
        // ya detenido
      }
    }
    this.active = [];
  }

  /**
   * Reproduce las notas no silenciadas a la vez.
   * En modo aleatorio resuelve un timbre independiente para cada nota.
   */
  async playChord(
    notes: string[],
    instrument: Instrument,
    mutedIndices: Set<number>,
    volume: number,
  ): Promise<void> {
    this.stopAll();
    const ctx = this.context();
    await this.unlock();

    const jobs = notes
      .map((note, index) => ({ note, index }))
      .filter(({ index }) => !mutedIndices.has(index))
      .map(async ({ note }) => {
        const timbre = this.resolveTimbre(instrument);
        const buffer = await this.loadBuffer(sampleUrl(timbre, note));
        return buffer;
      });

    const buffers = await Promise.all(jobs);
    const startAt = ctx.currentTime + 0.06; // pequeño margen para alinear ataques
    const safeVolume = Math.min(1, Math.max(0, volume));

    for (const buffer of buffers) {
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = safeVolume;
      source.connect(gain).connect(ctx.destination);
      source.onended = () => {
        this.active = this.active.filter((s) => s !== source);
      };
      source.start(startAt);
      this.active.push(source);
    }
  }

  /** Reproduce el sonido de acierto/error. */
  async playFeedback(ok: boolean, volume: number): Promise<void> {
    const ctx = this.context();
    const buffer = await this.loadBuffer(ok ? FEEDBACK_OK_URL : FEEDBACK_ERROR_URL);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = Math.min(1, Math.max(0, volume));
    source.connect(gain).connect(ctx.destination);
    source.start();
  }
}
