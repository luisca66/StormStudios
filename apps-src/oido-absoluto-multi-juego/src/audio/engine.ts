import { ASSET_BASE, NOTES_BASE } from "@/config";

export class AudioEngine {
  private activeNotes: HTMLAudioElement[] = [];
  private audioCache = new Map<string, HTMLAudioElement>();
  
  // Background Music Player
  private bgPlayer: HTMLAudioElement | null = null;
  private currentPlaylist: string[] = [];
  private currentTrackIndex = 0;
  private globalVolume = 0.8;
  private trackFailures = 0; // consecutive load failures, to avoid infinite skip loops
  
  // Environmental Loop Players
  private loops = new Map<string, HTMLAudioElement>();

  constructor() {
    // Initialize cached sound helpers if needed
  }

  setVolume(vol: number) {
    this.globalVolume = Math.max(0, Math.min(1, vol));
    if (this.bgPlayer) {
      this.bgPlayer.volume = this.globalVolume * 0.4; // BG music is softer
    }
    for (const [_, player] of this.loops) {
      player.volume = this.globalVolume * 0.5;
    }
  }

  getVolume(): number {
    return this.globalVolume;
  }

  stopAllNotes(): void {
    for (const player of this.activeNotes) {
      try {
        player.pause();
        player.currentTime = 0;
      } catch (e) {
        // Already stopped or destroyed
      }
    }
    this.activeNotes = [];
  }

  // Preload a set of notes to avoid delays during gameplay
  preloadNotes(notes: { note_index: number; octave: number }[], instrument: string): void {
    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    for (const note of notes) {
      const noteName = noteNames[note.note_index];
      const url = `${NOTES_BASE}/${instrument}/${encodeURIComponent(noteName)}${note.octave}.mp3`;
      if (!this.audioCache.has(url)) {
        const audio = new Audio(url);
        audio.preload = "auto";
        this.audioCache.set(url, audio);
      }
    }
  }

  playNote(instrument: string, noteIndex: number, octave: number): void {
    this.stopAllNotes();

    const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const noteName = noteNames[noteIndex];
    if (instrument === "Aleatorio") {
      const insts = ["Piano", "Cello", "Corno", "Coro", "Fagot"];
      instrument = insts[Math.floor(Math.random() * insts.length)];
    }
    
    const url = `${NOTES_BASE}/${instrument}/${encodeURIComponent(noteName)}${octave}.mp3`;

    let template = this.audioCache.get(url);
    if (!template) {
      template = new Audio(url);
      template.preload = "auto";
      this.audioCache.set(url, template);
    }

    const player = template.cloneNode(true) as HTMLAudioElement;
    player.volume = this.globalVolume;
    player.currentTime = 0;
    
    player.addEventListener("ended", () => {
      this.activeNotes = this.activeNotes.filter(item => item !== player);
    }, { once: true });
    
    this.activeNotes.push(player);
    player.play().catch(err => console.warn("Audio play blocked", err));
  }

  playCorrect(): void {
    this.playSFX(`${ASSET_BASE}/samples/acierto.mp3`);
  }

  playWrong(): void {
    this.playSFX(`${ASSET_BASE}/samples/error.mp3`);
  }

  private playSFX(url: string): void {
    const audio = new Audio(url);
    audio.volume = this.globalVolume * 0.9;
    audio.play().catch(err => console.warn("SFX play blocked", err));
  }

  // Environmental loops (steps, water, thrusters, wings, wind)
  startLoop(name: string, url: string, volumeScale = 0.5): void {
    let player = this.loops.get(name);
    if (!player) {
      player = new Audio(url);
      player.loop = true;
      player.preload = "auto";
      this.loops.set(name, player);
    }
    player.volume = this.globalVolume * volumeScale;
    if (player.paused) {
      player.play().catch(err => console.warn(`Loop ${name} play blocked`, err));
    }
  }

  stopLoop(name: string): void {
    const player = this.loops.get(name);
    if (player && !player.paused) {
      player.pause();
      player.currentTime = 0;
    }
  }

  stopAllLoops(): void {
    for (const [_, player] of this.loops) {
      player.pause();
      player.currentTime = 0;
    }
  }

  // Background music management
  startMusic(level: number): void {
    if (this.bgPlayer) {
      this.bgPlayer.pause();
    }

    // Build playlist according to level rules
    this.currentPlaylist = [];
    const prefixMap: { [key: number]: { dir: string; prefix: string; count: number } } = {
      1: { dir: "nivel-1", prefix: "jazz", count: 35 },
      2: { dir: "nivel-2", prefix: "agua", count: 35 },
      3: { dir: "nivel-3", prefix: "space", count: 36 },
      4: { dir: "nivel-4", prefix: "pantano", count: 36 },
      5: { dir: "nivel-5", prefix: "unicorn", count: 34 }
    };

    const cfg = prefixMap[level] || prefixMap[1];
    for (let i = 1; i <= cfg.count; i++) {
      const idx = String(i).padStart(2, "0");
      this.currentPlaylist.push(`${ASSET_BASE}/${cfg.dir}/${cfg.prefix}-${idx}.mp3`);
    }

    // Shuffle playlist
    this.shufflePlaylist();
    this.currentTrackIndex = 0;
    this.playCurrentTrack();
  }

  nextTrack(): void {
    if (this.bgPlayer) {
      this.bgPlayer.pause();
    }
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.currentPlaylist.length;
    if (this.currentTrackIndex === 0) {
      this.shufflePlaylist();
    }
    this.playCurrentTrack();
  }

  stopMusic(): void {
    if (this.bgPlayer) {
      this.bgPlayer.pause();
    }
  }

  private shufflePlaylist(): void {
    for (let i = this.currentPlaylist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.currentPlaylist[i], this.currentPlaylist[j]] = [this.currentPlaylist[j], this.currentPlaylist[i]];
    }
  }

  private playCurrentTrack(): void {
    if (this.currentPlaylist.length === 0) return;
    
    const trackUrl = this.currentPlaylist[this.currentTrackIndex];
    this.bgPlayer = new Audio(trackUrl);
    this.bgPlayer.volume = this.globalVolume * 0.4; // BG music is soft
    this.bgPlayer.loop = false;

    this.bgPlayer.addEventListener("ended", () => {
      this.trackFailures = 0;
      this.nextTrack();
    });

    // If a track is missing (e.g. a removed take, or a wrong asset path), skip to the
    // next one instead of stalling the playlist in silence.
    this.bgPlayer.addEventListener("error", () => {
      this.trackFailures++;
      if (this.trackFailures < this.currentPlaylist.length) {
        this.nextTrack();
      } else {
        console.warn("All background tracks failed to load — check the asset base URL.");
      }
    });

    this.bgPlayer.play().then(() => { this.trackFailures = 0; }).catch(err => {
      console.warn("Background music play blocked. Waiting for user interaction.", err);
      // If blocked, we listen to first document click to play
      const unlock = () => {
        this.bgPlayer?.play().catch(e => console.warn("Still blocked", e));
        document.removeEventListener("click", unlock);
        document.removeEventListener("keydown", unlock);
      };
      document.addEventListener("click", unlock);
      document.addEventListener("keydown", unlock);
    });
  }
}
