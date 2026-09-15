import type { GuitarSample } from "./catalog";

const DEFAULT_AUDIO_BASE = "https://musica.stormstudios.com.mx";
const DEFAULT_MUSIC_BASE = "https://samples.stormstudios.com.mx/music/oido-absoluto-multi";
const configuredBase = import.meta.env.VITE_AP_GUITAR_AUDIO_BASE_URL?.trim();
const configuredMusicBase = import.meta.env.VITE_MULTI_MUSIC_BASE?.trim();

// Sprite de pisadas (del WAV de pasos del robot): 6 variaciones de 0.33 s cada 0.5 s.
// Vive en R2 (bucket samples-guitarra) junto a acierto.mp3 y error.mp3.
const FOOTSTEP_VARIANTS = 6;
const FOOTSTEP_SLOT = 0.5;
const FOOTSTEP_LENGTH = 0.34;

const PLAYLISTS: Record<number, { directory: string; prefix: string; count: number }> = {
  1: { directory: "nivel-1", prefix: "jazz", count: 35 },
  2: { directory: "nivel-2", prefix: "agua", count: 35 },
  3: { directory: "nivel-3", prefix: "space", count: 36 },
  4: { directory: "nivel-4", prefix: "pantano", count: 36 },
  5: { directory: "nivel-5", prefix: "unicorn", count: 34 },
};

function assetUrl(path: string) {
  const base = (configuredBase || DEFAULT_AUDIO_BASE).replace(/\/$/, "");
  return `${base}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function musicUrl(path: string) {
  const base = (configuredMusicBase || DEFAULT_MUSIC_BASE).replace(/\/$/, "");
  return `${base}/${path}`;
}

export class GuitarAudio {
  private activeNote: HTMLAudioElement | null = null;
  private activeSfx: HTMLAudioElement | null = null;
  private background: HTMLAudioElement | null = null;
  private playlist: string[] = [];
  private trackIndex = 0;
  private trackFailures = 0;
  private volume = 0.88;
  private stepContext: AudioContext | null = null;
  private stepBuffer: AudioBuffer | null = null;
  private stepLoading = false;
  private lastStep = -1;

  preload(samples: GuitarSample[]) {
    samples.slice(0, 24).forEach((sample) => {
      const audio = new Audio(assetUrl(sample.filePath));
      audio.preload = "metadata";
    });
  }

  async playSample(sample: GuitarSample) {
    this.stopNote();
    const audio = new Audio(assetUrl(sample.filePath));
    audio.volume = this.volume;
    this.activeNote = audio;
    audio.addEventListener("ended", () => {
      if (this.activeNote === audio) this.activeNote = null;
    });
    return this.tryPlay(audio, () => {
      if (this.activeNote === audio) this.activeNote = null;
    });
  }

  async playCorrect() {
    return this.playSfx("acierto.mp3", 0.74);
  }

  async playWrong() {
    return this.playSfx("error.mp3", 0.68);
  }

  startMusic(level: number) {
    this.stopMusic();
    const config = PLAYLISTS[level] || PLAYLISTS[1];
    this.playlist = Array.from({ length: config.count }, (_, index) => {
      const number = String(index + 1).padStart(2, "0");
      return musicUrl(`${config.directory}/${config.prefix}-${number}.mp3`);
    });
    this.shufflePlaylist();
    this.trackIndex = 0;
    this.trackFailures = 0;
    void this.playCurrentTrack();
  }

  nextTrack() {
    if (!this.playlist.length) return;
    this.stopBackgroundPlayer();
    this.trackIndex = (this.trackIndex + 1) % this.playlist.length;
    if (this.trackIndex === 0) this.shufflePlaylist();
    void this.playCurrentTrack();
  }

  stopMusic() {
    this.stopBackgroundPlayer();
    this.playlist = [];
    this.trackIndex = 0;
    this.trackFailures = 0;
  }

  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.activeNote) this.activeNote.volume = this.volume;
    if (this.activeSfx) this.activeSfx.volume = this.volume * 0.74;
    if (this.background) this.background.volume = this.volume * 0.4;
  }

  /** Llamar desde un gesto del usuario: crea el contexto de audio y descarga las pisadas. */
  primeFootsteps() {
    if (!this.stepContext) {
      try {
        this.stepContext = new AudioContext();
      } catch {
        return;
      }
    }
    const context = this.stepContext;
    void context.resume();
    if (this.stepBuffer || this.stepLoading) return;
    this.stepLoading = true;
    fetch(assetUrl("pasos-robot.mp3"))
      .then((response) => response.arrayBuffer())
      .then((bytes) => context.decodeAudioData(bytes))
      .then((buffer) => { this.stepBuffer = buffer; })
      .catch((error: unknown) => console.warn("No se pudieron cargar las pisadas.", error))
      .finally(() => { this.stepLoading = false; });
  }

  /** Una pisada del robot; intensity 0..1 según la velocidad. Nunca repite la variación anterior. */
  playFootstep(intensity: number) {
    const context = this.stepContext;
    if (!context || !this.stepBuffer || context.state !== "running" || this.volume === 0) return;
    let variant = Math.floor(Math.random() * (FOOTSTEP_VARIANTS - 1));
    if (variant >= this.lastStep) variant += 1;
    this.lastStep = variant;
    const source = context.createBufferSource();
    source.buffer = this.stepBuffer;
    source.playbackRate.value = 0.93 + Math.random() * 0.14;
    const gain = context.createGain();
    gain.gain.value = this.volume * (0.3 + 0.35 * intensity);
    source.connect(gain).connect(context.destination);
    source.start(0, variant * FOOTSTEP_SLOT, FOOTSTEP_LENGTH);
  }

  getVolume() {
    return this.volume;
  }

  stop() {
    this.stopNote();
    this.stopSfx();
    this.stopMusic();
  }

  private async playSfx(path: string, level: number) {
    this.stopSfx();
    const audio = new Audio(assetUrl(path));
    audio.volume = this.volume * level;
    this.activeSfx = audio;
    audio.addEventListener("ended", () => {
      if (this.activeSfx === audio) this.activeSfx = null;
    });
    return this.tryPlay(audio, () => {
      if (this.activeSfx === audio) this.activeSfx = null;
    });
  }

  private async playCurrentTrack() {
    const source = this.playlist[this.trackIndex];
    if (!source) return;
    const audio = new Audio(source);
    audio.volume = this.volume * 0.4;
    audio.preload = "auto";
    this.background = audio;

    audio.addEventListener("ended", () => {
      if (this.background !== audio) return;
      this.trackFailures = 0;
      this.nextTrack();
    });
    audio.addEventListener("error", () => {
      if (this.background !== audio) return;
      this.trackFailures += 1;
      if (this.trackFailures < this.playlist.length) this.nextTrack();
      else console.warn("No se pudieron cargar las pistas de fondo.");
    });

    try {
      await audio.play();
      this.trackFailures = 0;
    } catch (error) {
      if (this.background === audio) console.warn("La música espera una interacción del usuario.", error);
    }
  }

  private shufflePlaylist() {
    for (let index = this.playlist.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [this.playlist[index], this.playlist[randomIndex]] = [this.playlist[randomIndex], this.playlist[index]];
    }
  }

  private stopNote() {
    if (!this.activeNote) return;
    this.activeNote.pause();
    this.activeNote.currentTime = 0;
    this.activeNote = null;
  }

  private stopSfx() {
    if (!this.activeSfx) return;
    this.activeSfx.pause();
    this.activeSfx.currentTime = 0;
    this.activeSfx = null;
  }

  private stopBackgroundPlayer() {
    if (!this.background) return;
    this.background.pause();
    this.background.currentTime = 0;
    this.background = null;
  }

  private async tryPlay(audio: HTMLAudioElement, onFailure: () => void) {
    try {
      await audio.play();
      return true;
    } catch {
      onFailure();
      return false;
    }
  }
}
