export class AssetAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private volume = 0.9;

  async play(assetPath: string, loop = false, onComplete?: () => void) {
    this.stop();

    const audio = new Audio(toAudioUrl(assetPath));
    audio.loop = loop;
    audio.volume = this.volume;
    audio.addEventListener("ended", () => {
      if (!audio.loop) this.audio = null;
      onComplete?.();
    });

    this.audio = audio;

    try {
      await audio.play();
      return true;
    } catch {
      this.audio = null;
      return false;
    }
  }

  setLooping(loop: boolean) {
    if (this.audio) this.audio.loop = loop;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) this.audio.volume = this.volume;
  }

  getVolume() {
    return this.volume;
  }

  isPlaying() {
    return this.audio ? !this.audio.paused : false;
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio = null;
  }
}

const defaultAudioBaseUrl = "https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev";
const configuredAudioBaseUrl = import.meta.env.VITE_AP_GUITAR_AUDIO_BASE_URL?.trim();

export function toAudioUrl(assetPath: string) {
  const audioBaseUrl = (configuredAudioBaseUrl || defaultAudioBaseUrl).replace(/\/$/, "");

  return `${audioBaseUrl}/${assetPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}`;
}
