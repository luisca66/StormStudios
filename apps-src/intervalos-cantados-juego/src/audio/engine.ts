import { ALL_NOTES } from "@/music/core";

export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeSounds: Set<HTMLAudioElement> = new Set();
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private loopSounds: Map<string, HTMLAudioElement> = new Map();
  private isMuted = false;

  context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.context();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }

  playSFX(name: string, loop = false, volume = 0.8): HTMLAudioElement | null {
    if (this.isMuted) return null;
    const url = `./sfx/${name}.mp3`;
    
    if (loop && this.loopSounds.has(name)) {
      const existing = this.loopSounds.get(name)!;
      existing.volume = volume;
      if (existing.paused) {
        existing.play().catch(() => {});
      }
      return existing;
    }

    const audio = new Audio(url);
    audio.loop = loop;
    audio.volume = volume;
    
    audio.play().catch(err => {
      console.warn(`[Audio] Failed to play SFX: ${name}`, err);
    });

    if (loop) {
      this.loopSounds.set(name, audio);
    } else {
      this.activeSounds.add(audio);
      audio.addEventListener("ended", () => {
        this.activeSounds.delete(audio);
      });
    }

    return audio;
  }

  stopSFX(name: string): void {
    if (this.loopSounds.has(name)) {
      const audio = this.loopSounds.get(name)!;
      audio.pause();
      audio.currentTime = 0;
      this.loopSounds.delete(name);
    }
  }

  stopAllSFX(): void {
    for (const audio of this.activeSounds) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.activeSounds.clear();

    for (const audio of this.loopSounds.values()) {
      audio.pause();
      audio.currentTime = 0;
    }
    this.loopSounds.clear();
  }

  playNote(instrument: string, _noteName: string, midiNumber: number): Promise<void> {
    // Standardize note mapping: GameManager.get_sample_midi(midi_number) -> offset is -12
    const sampleMidi = midiNumber - 12;
    const sampleNote = ALL_NOTES[((sampleMidi % 12) + 12) % 12];
    const sampleOctave = Math.floor(sampleMidi / 12) - 1;
    
    const formattedNote = `${sampleNote}${sampleOctave}`;
    const escapedNote = encodeURIComponent(formattedNote.replace(/b/g, "♭"));
    
    // Instrument naming maps: "Piano" | "Cello" | "Corno" | "Coro" | "Fagot"
    let instFolder = instrument;
    if (instFolder === "Aleatorio" || instFolder === "random") {
      const list = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
      instFolder = list[Math.floor(Math.random() * list.length)];
    }

    const url = `${AUDIO_BASE}/${instFolder}/${escapedNote}.mp3`;
    return this.playUrl(url, 0.75);
  }

  private playUrl(url: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      let cached = this.audioCache.get(url);
      if (!cached) {
        cached = new Audio(url);
        cached.preload = "auto";
        this.audioCache.set(url, cached);
      }

      const player = cached.cloneNode(true) as HTMLAudioElement;
      player.volume = volume;
      player.play()
        .then(() => resolve())
        .catch(err => {
          console.warn("[Audio] Note playback failed", url, err);
          resolve(); // Resolve anyway so as not to block game flow
        });
    });
  }
}
