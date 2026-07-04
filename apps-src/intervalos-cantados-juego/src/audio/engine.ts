import { ALL_NOTES } from "@/music/core";

export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeSounds: Set<HTMLAudioElement> = new Set();
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private loopSounds: Map<string, HTMLAudioElement> = new Map();
  private isMuted = false;

  // Decoded note samples kept in memory so playback (and replay) is instant.
  private noteBuffers: Map<string, AudioBuffer> = new Map();
  private noteLoads: Map<string, Promise<AudioBuffer>> = new Map();
  private currentNoteSource: AudioBufferSourceNode | null = null;

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

  // "Aleatorio" picks a concrete timbre; callers that need to replay the same
  // note (or prefetch its URL) must resolve once and reuse the result.
  resolveInstrument(instrument: string): string {
    if (instrument === "Aleatorio" || instrument === "random") {
      const list = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
      return list[Math.floor(Math.random() * list.length)];
    }
    return instrument;
  }

  noteUrl(instrument: string, midiNumber: number): string {
    // Standardize note mapping: GameManager.get_sample_midi(midi_number) -> offset is -12
    const sampleMidi = midiNumber - 12;
    const sampleNote = ALL_NOTES[((sampleMidi % 12) + 12) % 12];
    const sampleOctave = Math.floor(sampleMidi / 12) - 1;

    const formattedNote = `${sampleNote}${sampleOctave}`;
    const escapedNote = encodeURIComponent(formattedNote.replace(/b/g, "♭"));

    return `${AUDIO_BASE}/${instrument}/${escapedNote}.mp3`;
  }

  loadNote(url: string): Promise<AudioBuffer> {
    const cached = this.noteBuffers.get(url);
    if (cached) return Promise.resolve(cached);

    let pending = this.noteLoads.get(url);
    if (!pending) {
      pending = fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        })
        .then(data => this.context().decodeAudioData(data))
        .then(buffer => {
          this.noteBuffers.set(url, buffer);
          this.noteLoads.delete(url);
          return buffer;
        })
        .catch(err => {
          this.noteLoads.delete(url);
          throw err;
        });
      this.noteLoads.set(url, pending);
    }
    return pending;
  }

  async playNoteUrl(url: string, volume = 0.75): Promise<void> {
    try {
      const buffer = await this.loadNote(url);
      if (this.isMuted) return;

      const ctx = this.context();
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {});
      }

      this.stopNote();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => {
        if (this.currentNoteSource === source) this.currentNoteSource = null;
      };
      source.start();
      this.currentNoteSource = source;
    } catch (err) {
      // Decode/fetch failed: fall back to plain <audio> streaming
      console.warn("[Audio] Buffered note failed, falling back to <audio>", url, err);
      await this.playUrl(url, volume);
    }
  }

  stopNote(): void {
    if (this.currentNoteSource) {
      try { this.currentNoteSource.stop(); } catch { /* already stopped */ }
      this.currentNoteSource = null;
    }
  }

  playNote(instrument: string, _noteName: string, midiNumber: number): Promise<void> {
    const url = this.noteUrl(this.resolveInstrument(instrument), midiNumber);
    return this.playNoteUrl(url);
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
