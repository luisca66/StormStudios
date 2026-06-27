import { DEFAULT_VOLUME, TIMBRES, feedbackUrl, sampleUrl, type Instrument, type Timbre } from "@/config";
import { randomItem } from "@/music/core";

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private active: HTMLAudioElement[] = [];
  private readonly audioCache = new Map<string, HTMLAudioElement>();

  context(): AudioContext {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext;
      if (!Ctor) throw new Error("audio-context-unavailable");
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  async unlock(): Promise<void> {
    const ctx = this.context();
    if (ctx.state === "suspended") await ctx.resume();
  }

  stopAll(): void {
    for (const player of this.active) {
      try {
        player.pause();
        player.currentTime = 0;
      } catch {
        // The player may already be gone.
      }
    }
    this.active = [];
  }

  async playNote(note: string, instrument: Instrument, volume = DEFAULT_VOLUME): Promise<void> {
    const timbre = this.resolveTimbre(instrument);
    await this.playUrl(sampleUrl(timbre, note), volume, true);
  }

  async playFeedback(ok: boolean, volume = DEFAULT_VOLUME): Promise<void> {
    await this.playUrl(feedbackUrl(ok), volume * 0.82, false);
  }

  private resolveTimbre(instrument: Instrument): Timbre {
    if (instrument === "random") return randomItem([...TIMBRES]);
    return instrument;
  }

  private async playUrl(url: string, volume: number, stopFirst: boolean): Promise<void> {
    if (stopFirst) this.stopAll();

    let template = this.audioCache.get(url);
    if (!template) {
      template = new Audio(url);
      template.preload = "auto";
      this.audioCache.set(url, template);
    }

    const player = template.cloneNode(true) as HTMLAudioElement;
    player.volume = Math.max(0, Math.min(1, volume));
    player.currentTime = 0;
    player.addEventListener(
      "ended",
      () => {
        this.active = this.active.filter((item) => item !== player);
      },
      { once: true },
    );
    this.active.push(player);

    try {
      await player.play();
    } catch (error) {
      this.active = this.active.filter((item) => item !== player);
      console.warn("[audio] playback blocked or failed", url, error);
    }
  }
}
