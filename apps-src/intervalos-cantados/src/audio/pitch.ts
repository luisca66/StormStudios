export class MicDeniedError extends Error {
  constructor() {
    super("microphone-denied");
    this.name = "MicDeniedError";
  }
}

export class MicUnsupportedError extends Error {
  constructor() {
    super("microphone-unsupported");
    this.name = "MicUnsupportedError";
  }
}

export class MicPitchDetector {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private collecting = false;
  private collected: number[] = [];
  private generation = 0;
  private initializing: Promise<void> | null = null;
  private finishListening: (() => void) | null = null;

  constructor(private readonly ctx: AudioContext) {}

  ensureReady(): Promise<void> {
    if (this.worklet) return Promise.resolve();
    if (this.initializing) return this.initializing;
    const pending = this.initialize(this.generation).finally(() => {
      if (this.initializing === pending) this.initializing = null;
    });
    this.initializing = pending;
    return pending;
  }

  private async initialize(generation: number): Promise<void> {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new MicUnsupportedError();
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      throw new MicDeniedError();
    }
    if (generation !== this.generation) {
      stream.getTracks().forEach((track) => track.stop());
      throw new DOMException("Microphone initialization cancelled", "AbortError");
    }
    this.stream = stream;
    try {
      await this.ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}pitch-processor.js`);
      if (generation !== this.generation) {
        throw new DOMException("Microphone initialization cancelled", "AbortError");
      }
      this.source = this.ctx.createMediaStreamSource(stream);
      this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");
      this.worklet.port.onmessage = (event: MessageEvent<number>) => {
        if (this.collecting && event.data > 0) this.collected.push(event.data);
      };
      this.sink = this.ctx.createGain();
      this.sink.gain.value = 0;
      this.source.connect(this.worklet);
      this.worklet.connect(this.sink).connect(this.ctx.destination);
    } catch (error) {
      if (generation === this.generation) this.dispose();
      throw error;
    }
  }

  async listen(durationMs: number): Promise<number[]> {
    const generation = this.generation;
    try {
      await this.ensureReady();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (generation !== this.generation) {
        throw new DOMException("Microphone capture cancelled", "AbortError");
      }
      this.collected = [];
      this.collecting = true;
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.finishListening = null;
          resolve();
        }, durationMs);
        this.finishListening = () => { clearTimeout(timer); resolve(); };
      });
      if (generation !== this.generation) {
        throw new DOMException("Microphone capture cancelled", "AbortError");
      }
      return [...this.collected];
    } finally {
      // Cada respuesta abre una ventana de escucha; entre respuestas no captura.
      if (generation === this.generation) this.dispose();
    }
  }

  dispose(): void {
    this.generation += 1;
    this.initializing = null;
    this.collecting = false;
    this.finishListening?.();
    this.finishListening = null;
    this.collected = [];
    if (this.worklet) this.worklet.port.onmessage = null;
    for (const node of [this.source, this.worklet, this.sink]) {
      try { node?.disconnect(); } catch { /* Graph may already be torn down. */ }
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.worklet = null;
    this.sink = null;
  }
}
