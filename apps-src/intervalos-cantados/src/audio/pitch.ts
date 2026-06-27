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

  constructor(private readonly ctx: AudioContext) {}

  async ensureReady(): Promise<void> {
    if (this.worklet) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new MicUnsupportedError();
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      throw new MicDeniedError();
    }

    await this.ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}pitch-processor.js`);
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");
    this.worklet.port.onmessage = (event: MessageEvent<number>) => {
      if (this.collecting && event.data > 0) this.collected.push(event.data);
    };
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.worklet);
    this.worklet.connect(this.sink).connect(this.ctx.destination);
  }

  async listen(durationMs: number): Promise<number[]> {
    await this.ensureReady();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.collected = [];
    this.collecting = true;
    await new Promise((resolve) => setTimeout(resolve, durationMs));
    this.collecting = false;
    return [...this.collected];
  }

  dispose(): void {
    this.collecting = false;
    try {
      this.source?.disconnect();
      this.worklet?.disconnect();
      this.sink?.disconnect();
    } catch {
      // Graph may already be torn down.
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.worklet = null;
    this.sink = null;
  }
}
