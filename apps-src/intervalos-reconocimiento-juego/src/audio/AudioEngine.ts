export class AudioEngine {
  private context: AudioContext | null = null;
  private buffers: Map<string, AudioBuffer> = new Map();
  private initialized = false;
  private masterGain: GainNode | null = null;
  private currentVolume: number = 0.72;

  // Web Audio usa fetch(): el dominio de samples permite CORS para el sitio y localhost:3000.
  private readonly R2_BASE_URL = 'https://samples.stormstudios.com.mx';

  constructor() {}

  private resumeContext() {
    if (this.context?.state === 'suspended') {
      void this.context.resume().catch((error) => {
        console.warn('[AudioEngine] No se pudo reanudar el AudioContext:', error);
      });
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    this.context = new Ctor();
    
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = this.currentVolume;
    this.masterGain.connect(this.context.destination);

    this.resumeContext();
    
    this.initialized = true;
    console.log("AudioEngine initialized. Context state:", this.context.state);
    // Preload ya no es bloqueante y masivo, lo hacemos lazy en playNote
  }

  public setVolume(volume: number) {
    this.currentVolume = volume;
    if (this.masterGain) {
      // Ramp for smooth volume change
      this.masterGain.gain.setTargetAtTime(volume, this.context!.currentTime, 0.05);
    }
  }

  private async loadBuffer(timbre: string, note: string): Promise<AudioBuffer | null> {
    if (!this.context) return null;
    const key = `${timbre}_${note}`;
    if (this.buffers.has(key)) return this.buffers.get(key)!;

    try {
      const url = `${this.R2_BASE_URL}/${encodeURIComponent(timbre)}/${encodeURIComponent(note)}.mp3`;
      // no-cache: un <audio> sin crossOrigin puede dejar en caché la respuesta sin CORS; revalidar la evita.
      const response = await fetch(url, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      this.buffers.set(key, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`[AudioEngine] Error cargando ${key}:`, error);
      return null;
    }
  }

  private async playNote(timbre: string, note: string, startTime: number): Promise<void> {
    if (!this.context) return;
    this.resumeContext();

    const buffer = await this.loadBuffer(timbre, note);
    if (buffer && this.masterGain) {
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.masterGain);
      source.start(startTime);
    }
  }

  public async playInterval(timbre: string, root: string, intervalNote: string, mode: string): Promise<void> {
    if (!this.context) return;
    this.resumeContext();
    
    // Lazy load the buffers first so they are ready at the same time
    await Promise.all([
      this.loadBuffer(timbre, root),
      this.loadBuffer(timbre, intervalNote)
    ]);
    
    // Agregar 50ms para evitar jitter
    const startTime = this.context.currentTime + 0.05;

    let resolvedMode = mode;
    if (resolvedMode === 'random') {
      const modes = ['harmonic', 'melodic'];
      resolvedMode = modes[Math.floor(Math.random() * modes.length)];
    }

    if (resolvedMode === 'melodic') {
      const melodicModes = ['melodic-asc', 'melodic-desc'];
      resolvedMode = melodicModes[Math.floor(Math.random() * melodicModes.length)];
    }

    if (resolvedMode === 'harmonic') {
      this.playNote(timbre, root, startTime);
      this.playNote(timbre, intervalNote, startTime);
    } else if (resolvedMode === 'melodic-desc') {
      this.playNote(timbre, intervalNote, startTime);
      this.playNote(timbre, root, startTime + 1.0); 
    } else {
      this.playNote(timbre, root, startTime);
      this.playNote(timbre, intervalNote, startTime + 1.0); 
    }
  }

  public getContext(): AudioContext | null {
    return this.context;
  }
}
