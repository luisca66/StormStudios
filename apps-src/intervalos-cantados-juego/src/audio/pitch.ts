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

  private isListening = false;
  private targetFrequency = 0;
  private toleranceCents = 50.0;
  
  // Pitch Lock state matching Godot
  private pitchLock = 0.0;
  private currentFrequency = 0.0;
  private currentCentsOff = 0.0;

  private readonly PITCH_LOCK_ATTACK = 0.34;
  private readonly PITCH_LOCK_RELEASE = 0.17;
  private readonly PITCH_LOCK_THRESHOLD = 0.30;
  private readonly MIN_FREQ = 65.0;
  private readonly MAX_FREQ = 1200.0;

  constructor(private readonly ctx: AudioContext) {}

  async ensureReady(): Promise<void> {
    if (this.worklet) return;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new MicUnsupportedError();
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // Echo cancellation is helpful in browser to avoid feedback loops
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      console.error("[Mic] Permission denied", err);
      throw new MicDeniedError();
    }

    // Load the worklet module. Using absolute path from base url
    await this.ctx.audioWorklet.addModule("./pitch-processor.js");
    
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");
    
    this.worklet.port.onmessage = (event: MessageEvent<number>) => {
      this.processIncomingPitch(event.data);
    };

    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0.0; // Mute mic feed so the user doesn't hear their own delayed voice

    this.source.connect(this.worklet);
    this.worklet.connect(this.sink).connect(this.ctx.destination);
  }

  startListening(targetFreq: number): void {
    this.targetFrequency = targetFreq;
    this.pitchLock = 0.0;
    this.currentFrequency = 0.0;
    this.currentCentsOff = 0.0;
    this.isListening = true;
  }

  stopListening(): void {
    this.isListening = false;
    this.currentFrequency = 0.0;
    this.currentCentsOff = 0.0;
    this.pitchLock = 0.0;
  }

  getCurrentState() {
    return {
      frequency: this.currentFrequency,
      centsOff: this.currentCentsOff,
      pitchLock: this.pitchLock,
      isOnPitch: this.pitchLock >= this.PITCH_LOCK_THRESHOLD,
    };
  }

  private processIncomingPitch(freq: number): void {
    if (!this.isListening) return;

    if (freq > this.MIN_FREQ && freq < this.MAX_FREQ) {
      this.currentFrequency = freq;
      if (this.targetFrequency > 0.0) {
        this.currentCentsOff = 1200.0 * Math.log2(freq / this.targetFrequency);
      } else {
        this.currentCentsOff = 0.0;
      }
    } else {
      this.currentFrequency = 0.0;
    }

    this.updatePitchLock();
  }

  private updatePitchLock(): void {
    let rawOnPitch = false;
    if (this.currentFrequency > this.MIN_FREQ && this.targetFrequency > 0.0) {
      rawOnPitch = Math.abs(this.currentCentsOff) <= this.toleranceCents;
    }

    if (rawOnPitch) {
      this.pitchLock = Math.min(1.0, this.pitchLock + this.PITCH_LOCK_ATTACK);
    } else {
      this.pitchLock = Math.max(0.0, this.pitchLock - this.PITCH_LOCK_RELEASE);
    }
  }

  dispose(): void {
    this.isListening = false;
    try {
      this.source?.disconnect();
      this.worklet?.disconnect();
      this.sink?.disconnect();
    } catch (err) {
      console.warn("[Mic] Error tearing down mic graph", err);
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }

    this.stream = null;
    this.source = null;
    this.worklet = null;
    this.sink = null;
  }
}
