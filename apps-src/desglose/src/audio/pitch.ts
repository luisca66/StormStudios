/**
 * Captura de micrófono con el afinador vocal v2.
 *
 * El worklet publica un frame cada hop (~21 ms), incluso durante el silencio.
 * Esta clase aplica sostén de 1.5 s, gracia ante cortes breves, mediana contra
 * saltos de octava y un watchdog para detectar un flujo de audio congelado.
 */

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

export interface PitchFrame {
  frequency: number;
  clarity: number;
  rms: number;
  /** Timestamp del reloj de audio, en segundos. */
  t: number;
}

export interface PitchState {
  /** Frecuencia detectada; 0 durante silencio o señal no vocal. */
  frequency: number;
  /** Desviación filtrada respecto de la clase de altura esperada. */
  centsOff: number;
  isOnPitch: boolean;
  /** Progreso 0..1 hacia los 1.5 s de afinación sostenida. */
  holdProgress: number;
}

export interface PitchListenResult {
  matched: boolean;
  heardVoice: boolean;
  state: PitchState;
}

type ProgressListener = (state: PitchState) => void;

export class MicPitchDetector {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;

  private isListening = false;
  private targetFrequency = 0;

  private readonly TOLERANCE_CENTS = 50;
  private readonly HOLD_REQUIRED_SECONDS = 1.5;
  private readonly GRACE_SECONDS = 0.25;
  private readonly MEDIAN_WINDOW = 5;
  private readonly MIN_VOICED_FRAMES = 3;
  private readonly STALE_FRAME_MS = 150;
  private readonly MIN_FREQ = 65;
  private readonly MAX_FREQ = 1200;

  private currentFrequency = 0;
  private currentCentsOff = 0;
  private recentCents: number[] = [];
  private voicedStreak = 0;
  private holdSeconds = 0;
  private offPitchSeconds = 0;
  private onPitchNow = false;
  private heardVoice = false;
  private lastFrameT = 0;
  private lastFrameWallMs = 0;

  constructor(private readonly ctx: AudioContext) {}

  async ensureReady(): Promise<void> {
    if (this.worklet) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new MicUnsupportedError();
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      console.error("[Mic] Permission denied", error);
      throw new MicDeniedError();
    }

    await this.ctx.audioWorklet.addModule(
      "/apps/desglose/pitch-processor.js?v=2",
    );
    console.info(
      "[Mic] Afinador v2 activo — hold 1.5s, gracia 0.25s, mediana 5 frames",
    );

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");
    this.worklet.port.onmessage = (event: MessageEvent<PitchFrame>) => {
      this.handleFrame(event.data);
    };

    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.worklet);
    this.worklet.connect(this.sink).connect(this.ctx.destination);
  }

  /**
   * Espera hasta completar el sostén v2 o agotar el tiempo máximo.
   * Desglose compara clases de altura: cantar la nota en otra octava es válido.
   */
  async listenForTarget(
    targetFrequency: number,
    timeoutMs: number,
    onProgress?: ProgressListener,
  ): Promise<PitchListenResult> {
    await this.ensureReady();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.startListening(targetFrequency);
    const startedAt = performance.now();

    return new Promise((resolve) => {
      const finish = (matched: boolean) => {
        const state = this.getCurrentState();
        const heardVoice = this.heardVoice;
        this.stopListening();
        resolve({ matched, heardVoice, state });
      };

      const poll = () => {
        const state = this.getCurrentState();
        onProgress?.(state);
        if (state.holdProgress >= 1) {
          finish(true);
          return;
        }
        if (performance.now() - startedAt >= timeoutMs) {
          finish(false);
          return;
        }
        window.setTimeout(poll, 50);
      };

      poll();
    });
  }

  private startListening(targetFrequency: number): void {
    this.targetFrequency = targetFrequency;
    this.resetTracking();
    this.isListening = true;
  }

  private stopListening(): void {
    this.isListening = false;
    this.targetFrequency = 0;
  }

  private resetTracking(): void {
    this.currentFrequency = 0;
    this.currentCentsOff = 0;
    this.recentCents = [];
    this.voicedStreak = 0;
    this.holdSeconds = 0;
    this.offPitchSeconds = 0;
    this.onPitchNow = false;
    this.heardVoice = false;
    this.lastFrameT = 0;
    this.lastFrameWallMs = 0;
  }

  private getCurrentState(): PitchState {
    if (
      this.isListening &&
      this.lastFrameWallMs > 0 &&
      performance.now() - this.lastFrameWallMs > this.STALE_FRAME_MS
    ) {
      this.onPitchNow = false;
      this.currentFrequency = 0;
    }

    return {
      frequency: this.currentFrequency,
      centsOff: this.currentCentsOff,
      isOnPitch: this.onPitchNow,
      holdProgress: Math.min(1, this.holdSeconds / this.HOLD_REQUIRED_SECONDS),
    };
  }

  private handleFrame(frame: PitchFrame): void {
    if (!this.isListening) return;

    const dt =
      this.lastFrameT > 0
        ? Math.min(0.1, Math.max(0, frame.t - this.lastFrameT))
        : 0.0213;
    this.lastFrameT = frame.t;
    this.lastFrameWallMs = performance.now();

    const voiced = frame.frequency > this.MIN_FREQ && frame.frequency < this.MAX_FREQ;
    if (voiced) {
      this.heardVoice = true;
      this.voicedStreak += 1;
      this.currentFrequency = frame.frequency;
      const rawCents = 1200 * Math.log2(frame.frequency / this.targetFrequency);
      this.recentCents.push(foldCentsToPitchClass(rawCents));
      if (this.recentCents.length > this.MEDIAN_WINDOW) this.recentCents.shift();
      this.currentCentsOff = median(this.recentCents);
    } else {
      this.voicedStreak = 0;
      this.currentFrequency = 0;
    }

    const onPitchRaw =
      voiced &&
      this.targetFrequency > 0 &&
      this.voicedStreak >= this.MIN_VOICED_FRAMES &&
      Math.abs(this.currentCentsOff) <= this.TOLERANCE_CENTS;

    if (onPitchRaw) {
      this.onPitchNow = true;
      this.offPitchSeconds = 0;
      this.holdSeconds += dt;
    } else {
      this.onPitchNow = false;
      this.offPitchSeconds += dt;
      if (this.offPitchSeconds > this.GRACE_SECONDS) this.holdSeconds = 0;
    }
  }

  dispose(): void {
    this.isListening = false;
    try {
      this.source?.disconnect();
      this.worklet?.disconnect();
      this.sink?.disconnect();
    } catch (error) {
      console.warn("[Mic] Error tearing down mic graph", error);
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.worklet = null;
    this.sink = null;
  }
}

/** Pliega cualquier desviación a la clase de altura equivalente (±600 cents). */
export function foldCentsToPitchClass(cents: number): number {
  return cents - Math.round(cents / 1200) * 1200;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}
