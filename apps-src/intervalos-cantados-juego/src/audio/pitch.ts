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

// One analysis frame posted by pitch-processor.js. The worklet posts a frame
// every hop (~21 ms) WITHOUT exception: unvoiced/silence arrives as frequency -1.
// That steady stream is the tracker's clock — the hold machine below only
// advances when frames arrive, and audio-clock timestamps make the timing
// immune to main-thread jank.
export interface PitchFrame {
  frequency: number; // Hz, or -1 when unvoiced/silent
  clarity: number; // 0..1, confidence of the YIN estimate
  rms: number;
  t: number; // audio-clock timestamp in seconds
}

export interface PitchState {
  frequency: number; // 0 when unvoiced
  centsOff: number; // median-filtered deviation from the target
  isOnPitch: boolean; // currently within tolerance (for the tuner UI)
  holdProgress: number; // 0..1 toward HOLD_REQUIRED_SECONDS of sustained on-pitch singing
}

export class MicPitchDetector {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;

  private isListening = false;
  private targetFrequency = 0;

  // ── Tunable tracking constants (the "standard tuner" contract) ──
  private readonly TOLERANCE_CENTS = 50.0; // ± window around the target
  private readonly HOLD_REQUIRED_SECONDS = 1.5; // sustained singing needed to charge
  private readonly GRACE_SECONDS = 0.25; // dropouts shorter than this pause the hold instead of resetting it
  private readonly MEDIAN_WINDOW = 5; // ~107 ms of frames — kills single-frame octave blips
  private readonly MIN_VOICED_FRAMES = 3; // ~64 ms of voice required before "on pitch" can trigger
  private readonly STALE_FRAME_MS = 150; // no frames for this long ⇒ report not-on-pitch
  private readonly MIN_FREQ = 65.0;
  private readonly MAX_FREQ = 1200.0;

  // ── Live tracking state ──
  private currentFrequency = 0.0;
  private currentCentsOff = 0.0;
  private recentCents: number[] = [];
  private voicedStreak = 0;
  private holdSeconds = 0.0;
  private offPitchSeconds = 0.0;
  private onPitchNow = false;
  private lastFrameT = 0.0; // audio-clock time of the previous frame
  private lastFrameWallMs = 0.0; // performance.now() of the last frame (staleness watchdog)

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

    // Load the worklet module. The ?v= query busts any HTTP cache so a stale
    // worklet can never pair with a newer tracker.
    await this.ctx.audioWorklet.addModule("./pitch-processor.js?v=2");
    console.info("[Mic] Afinador estándar v2 activo — hold 1.5s, gracia 0.25s, mediana 5 frames");

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");

    this.worklet.port.onmessage = (event: MessageEvent<PitchFrame>) => {
      this.handleFrame(event.data);
    };

    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0.0; // Mute mic feed so the user doesn't hear their own delayed voice

    this.source.connect(this.worklet);
    this.worklet.connect(this.sink).connect(this.ctx.destination);
  }

  startListening(targetFreq: number): void {
    this.targetFrequency = targetFreq;
    this.resetTracking();
    this.isListening = true;
  }

  stopListening(): void {
    this.isListening = false;
    this.resetTracking();
  }

  private resetTracking(): void {
    this.currentFrequency = 0.0;
    this.currentCentsOff = 0.0;
    this.recentCents = [];
    this.voicedStreak = 0;
    this.holdSeconds = 0.0;
    this.offPitchSeconds = 0.0;
    this.onPitchNow = false;
    this.lastFrameT = 0.0;
    this.lastFrameWallMs = 0.0;
  }

  getCurrentState(): PitchState {
    // Watchdog: the worklet posts every ~21 ms; if frames stopped arriving
    // (context suspended, device unplugged) never report a frozen "on pitch".
    if (
      this.isListening &&
      this.lastFrameWallMs > 0 &&
      performance.now() - this.lastFrameWallMs > this.STALE_FRAME_MS
    ) {
      this.onPitchNow = false;
      this.currentFrequency = 0.0;
    }

    return {
      frequency: this.currentFrequency,
      centsOff: this.currentCentsOff,
      isOnPitch: this.onPitchNow,
      holdProgress: Math.min(1.0, this.holdSeconds / this.HOLD_REQUIRED_SECONDS),
    };
  }

  private handleFrame(frame: PitchFrame): void {
    if (!this.isListening) return;

    // Real elapsed time between frames, from the audio clock (~0.0213 s/hop).
    const dt = this.lastFrameT > 0 ? Math.min(0.1, Math.max(0, frame.t - this.lastFrameT)) : 0.0213;
    this.lastFrameT = frame.t;
    this.lastFrameWallMs = performance.now();

    const voiced = frame.frequency > this.MIN_FREQ && frame.frequency < this.MAX_FREQ;

    if (voiced) {
      this.voicedStreak += 1;
      this.currentFrequency = frame.frequency;
      if (this.targetFrequency > 0.0) {
        const cents = 1200.0 * Math.log2(frame.frequency / this.targetFrequency);
        this.recentCents.push(cents);
        if (this.recentCents.length > this.MEDIAN_WINDOW) this.recentCents.shift();
        this.currentCentsOff = median(this.recentCents);
      } else {
        this.currentCentsOff = 0.0;
      }
    } else {
      this.voicedStreak = 0;
      this.currentFrequency = 0.0;
      // Keep recentCents: a consonant shouldn't wipe the median context.
    }

    // "On pitch" needs sustained voice (no single-frame attacks) AND the
    // median deviation inside tolerance.
    const onPitchRaw =
      voiced &&
      this.targetFrequency > 0.0 &&
      this.voicedStreak >= this.MIN_VOICED_FRAMES &&
      Math.abs(this.currentCentsOff) <= this.TOLERANCE_CENTS;

    if (onPitchRaw) {
      this.onPitchNow = true;
      this.offPitchSeconds = 0.0;
      this.holdSeconds += dt;
    } else {
      this.onPitchNow = false;
      this.offPitchSeconds += dt;
      if (this.offPitchSeconds > this.GRACE_SECONDS) {
        // Sustained break: the note must be sung again from the start.
        this.holdSeconds = 0.0;
      }
      // Within the grace window the hold merely pauses.
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

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
