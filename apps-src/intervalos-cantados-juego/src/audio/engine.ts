import { ALL_NOTES } from "@/music/core";

export const AUDIO_BASE = "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";
const VOCAL_ARCADE_SFX_BASE = `${AUDIO_BASE}/vocal-arcade`;
const REMOTE_SFX_LEVELS = new Set([1, 2, 3, 4, 5]);

const LOCAL_SFX_NAMES: Record<string, string> = {
  carga: "clank",
  disparo: "shot",
  enemigo: "enemy",
  "gira-torreta": "gira-torreta",
  "muere-enemigo": "muere-enemigo"
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private activeSounds: Set<HTMLAudioElement> = new Set();
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private loopSounds: Map<string, HTMLAudioElement> = new Map();
  private isMuted = false;
  private sfxUrlCache: Map<string, string> = new Map();
  private failedSfxUrls: Set<string> = new Set();

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

  playSFX(name: string, loop = false, volume = 0.8, level?: number): HTMLAudioElement | null {
    if (this.isMuted) return null;
    const key = this.sfxKey(name, level);
    
    if (loop && this.loopSounds.has(key)) {
      const existing = this.loopSounds.get(key)!;
      existing.volume = volume;
      if (existing.paused) {
        existing.play().catch(() => {});
      }
      return existing;
    }

    const audio = new Audio();
    audio.loop = loop;
    audio.volume = volume;

    if (loop) {
      this.loopSounds.set(key, audio);
    } else {
      this.activeSounds.add(audio);
      audio.addEventListener("ended", () => {
        this.activeSounds.delete(audio);
      });
    }

    this.playSFXFromCandidates(audio, name, key, this.sfxCandidates(name, level), loop);
    return audio;
  }

  stopSFX(name: string, level?: number): void {
    const key = this.sfxKey(name, level);
    if (this.loopSounds.has(key)) {
      const audio = this.loopSounds.get(key)!;
      audio.pause();
      audio.currentTime = 0;
      this.loopSounds.delete(key);
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

  private sfxKey(name: string, level?: number): string {
    return level ? `${level}:${name}` : name;
  }

  private sfxCandidates(name: string, level?: number): string[] {
    const localFallback = `./sfx/${this.localSfxName(name)}.mp3`;
    if (!level || !REMOTE_SFX_LEVELS.has(level)) return [localFallback];

    const remoteUrls = [`${VOCAL_ARCADE_SFX_BASE}/${this.remoteSfxFolder(level)}/${name}.mp3`];
    if (this.remoteOnlySfx(name, level)) return remoteUrls;
    return [...remoteUrls, localFallback];
  }

  private remoteSfxFolder(level: number): string {
    const padded = String(level).padStart(2, "0");
    return `level-${padded}`;
  }

  private localSfxName(name: string): string {
    return LOCAL_SFX_NAMES[name] ?? name;
  }

  private remoteOnlySfx(_name: string, level: number): boolean {
    return REMOTE_SFX_LEVELS.has(level);
  }

  private playSFXFromCandidates(
    audio: HTMLAudioElement,
    name: string,
    key: string,
    candidates: string[],
    loop: boolean
  ): void {
    const cached = this.sfxUrlCache.get(key);
    const availableCandidates = candidates.filter(url => !this.failedSfxUrls.has(url));
    const urls = cached && availableCandidates.includes(cached)
      ? [cached, ...availableCandidates.filter(url => url !== cached)]
      : availableCandidates;

    const tryUrl = (index: number) => {
      if (loop && this.loopSounds.get(key) !== audio) return;

      const url = urls[index];
      if (!url) {
        console.warn(`[Audio] Failed to play SFX: ${name}; no source loaded`);
        this.activeSounds.delete(audio);
        if (loop) this.loopSounds.delete(key);
        return;
      }

      let finished = false;
      const fail = (err?: unknown) => {
        if (finished) return;
        finished = true;
        audio.removeEventListener("error", fail);
        this.failedSfxUrls.add(url);
        if (this.sfxUrlCache.get(key) === url) {
          this.sfxUrlCache.delete(key);
        }
        if (index === urls.length - 1) {
          console.warn(`[Audio] Failed to play SFX: ${name}`, err);
        }
        tryUrl(index + 1);
      };

      audio.addEventListener("error", fail, { once: true });
      audio.src = url;
      audio.load();
      audio.play()
        .then(() => {
          finished = true;
          audio.removeEventListener("error", fail);
          this.sfxUrlCache.set(key, url);
        })
        .catch(fail);
    };

    tryUrl(0);
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
