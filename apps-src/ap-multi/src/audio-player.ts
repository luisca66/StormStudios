import { TIMBRES, sampleName, type Pitch } from '../../ap-core/progression';

export class AssetAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private volume = 0.9;
  private cache = new Map<string, HTMLAudioElement>();
  private preloadVersion = 0;
  private playbackVersion = 0;

  async play(assetPath: string, loop = false, onComplete?: () => void) {
    this.stop();
    const version = this.playbackVersion;

    const audio = this.cache.get(assetPath) ?? new Audio(toAudioUrl(assetPath));
    audio.currentTime = 0;
    audio.loop = loop;
    audio.volume = this.volume;
    audio.onended = () => {
      if (!audio.loop && this.audio === audio && version === this.playbackVersion) this.audio = null;
      onComplete?.();
    };

    this.audio = audio;

    try {
      await audio.play();
      if (version !== this.playbackVersion) return "blocked" as const;
      return "playing" as const;
    } catch {
      if (version !== this.playbackVersion) return "blocked" as const;
      this.audio = null;
      return audio.error ? ("failed" as const) : ("blocked" as const);
    }
  }

  async preload(pitches: Pitch[]) {
    const version = ++this.preloadVersion;
    // Pitch-first order: the first keys become available across all six timbres.
    const paths = pitches.flatMap(p => TIMBRES.map(t => `${t}/${sampleName(p)}.mp3`));
    for (let i = 0; i < paths.length && version === this.preloadVersion; i += 3) {
      await Promise.all(paths.slice(i, i + 3).map(path => this.preloadOne(path)));
    }
  }

  cancelPreload() { this.preloadVersion++; }

  private preloadOne(path: string): Promise<void> {
    if (this.cache.has(path)) return Promise.resolve();
    const audio = new Audio();
    audio.preload = 'auto';
    this.cache.set(path, audio);
    return new Promise(resolve => {
      const finish = () => {
        clearTimeout(timer);
        audio.removeEventListener('canplaythrough', finish);
        audio.removeEventListener('error', failed);
        resolve();
      };
      const failed = () => { this.cache.delete(path); finish(); };
      const timer = setTimeout(finish, 6000);
      audio.addEventListener('canplaythrough', finish, { once: true });
      audio.addEventListener('error', failed, { once: true });
      audio.src = toAudioUrl(path); audio.load();
    });
  }

  setLooping(loop: boolean) {
    if (this.audio) this.audio.loop = loop;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) this.audio.volume = this.volume;
  }

  isPlaying() {
    return this.audio ? !this.audio.paused : false;
  }

  stop() {
    this.playbackVersion++;
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio = null;
  }
}

const defaultAudioBaseUrl = "https://samples.stormstudios.com.mx";
const configuredAudioBaseUrl = import.meta.env.VITE_AP_MULTI_AUDIO_BASE_URL?.trim();

export function toAudioUrl(assetPath: string) {
  const encodedPath = assetPath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  const audioBaseUrl = (configuredAudioBaseUrl || defaultAudioBaseUrl).replace(/\/$/, "");
  return `${audioBaseUrl}/${encodedPath}`;
}
