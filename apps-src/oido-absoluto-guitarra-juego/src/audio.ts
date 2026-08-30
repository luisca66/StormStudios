import type { GuitarSample } from "./catalog";

const DEFAULT_AUDIO_BASE = "https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev";
const configuredBase = import.meta.env.VITE_AP_GUITAR_AUDIO_BASE_URL?.trim();

function assetUrl(path: string) {
  const base = (configuredBase || DEFAULT_AUDIO_BASE).replace(/\/$/, "");
  return `${base}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export class GuitarAudio {
  private active: HTMLAudioElement | null = null;
  private volume = 0.88;

  preload(samples: GuitarSample[]) {
    samples.slice(0, 24).forEach((sample) => {
      const audio = new Audio(assetUrl(sample.filePath));
      audio.preload = "metadata";
    });
  }

  async playSample(sample: GuitarSample) {
    return this.play(sample.filePath);
  }

  async playCorrect() {
    return this.play("acierto.mp3", 0.74);
  }

  async playWrong() {
    return this.play("error.mp3", 0.68);
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.active) this.active.volume = this.volume;
  }

  getVolume() {
    return this.volume;
  }

  stop() {
    if (!this.active) return;
    this.active.pause();
    this.active.currentTime = 0;
    this.active = null;
  }

  private async play(path: string, level = 1) {
    this.stop();
    const audio = new Audio(assetUrl(path));
    audio.volume = this.volume * level;
    this.active = audio;
    audio.addEventListener("ended", () => {
      if (this.active === audio) this.active = null;
    });
    try {
      await audio.play();
      return true;
    } catch {
      if (this.active === audio) this.active = null;
      return false;
    }
  }
}
