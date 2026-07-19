// Detección de afinación (PLAN §3.6) — port del módulo PROBADO de Intervalos
// Cantados juego (src/audio/pitch.ts). El contrato del afinador estándar NO se
// cambia sin permiso de Luis: está calibrado.
//
// Se añade aquí FakePitchDetector (?fakemic=1) con la MISMA interfaz para QA:
// frames sintéticos deterministas controlados por teclado (ver clase abajo).

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

// Un frame de análisis posteado por pitch-processor.js. El worklet postea un
// frame cada hop (~21 ms) SIN excepción: silencio/no-voz llega como frequency -1.
// Ese flujo constante es el reloj del tracker — la máquina de hold solo avanza
// cuando llegan frames, y los timestamps de reloj de audio la inmunizan contra
// jank del hilo principal.
export interface PitchFrame {
  frequency: number; // Hz, o -1 si no hay voz
  clarity: number; // 0..1, confianza de la estimación YIN
  rms: number;
  t: number; // timestamp de reloj de audio en segundos
}

export interface PitchState {
  frequency: number; // 0 si no hay voz
  centsOff: number; // desviación (mediana) respecto al target
  isOnPitch: boolean; // dentro de tolerancia ahora mismo (para el afinador)
  holdProgress: number; // 0..1 hacia HOLD_REQUIRED_SECONDS de canto sostenido
}

// Interfaz común que consume el juego (PLAN §3.6): el loop llama
// getCurrentState() cada frame y pinta afinador + brillo de linterna.
export interface PitchDetectorLike {
  ensureReady(): Promise<void>;
  startListening(targetFreq: number): void;
  stopListening(): void;
  getCurrentState(): PitchState;
  dispose(): void;
}

// ── Máquina de tracking compartida (contrato del afinador estándar §3.6) ──
// La comparten el mic real y el falso para que QA ejercite EXACTAMENTE la
// misma lógica de hold/gracia/mediana que producción.
abstract class PitchTracker implements PitchDetectorLike {
  protected isListening = false;
  protected targetFrequency = 0;

  // ── Constantes del contrato (NO cambiar sin permiso de Luis) ──
  protected readonly TOLERANCE_CENTS = 50.0;
  protected readonly HOLD_REQUIRED_SECONDS = 1.5;
  protected readonly GRACE_SECONDS = 0.25;
  protected readonly MEDIAN_WINDOW = 5; // ~107 ms de frames
  protected readonly MIN_VOICED_FRAMES = 3; // ~64 ms de voz
  protected readonly STALE_FRAME_MS = 150;
  protected readonly MIN_FREQ = 65.0;
  protected readonly MAX_FREQ = 1200.0;

  // ── Estado vivo ──
  private currentFrequency = 0.0;
  private currentCentsOff = 0.0;
  private recentCents: number[] = [];
  private voicedStreak = 0;
  private holdSeconds = 0.0;
  private offPitchSeconds = 0.0;
  private onPitchNow = false;
  private lastFrameT = 0.0;
  private lastFrameWallMs = 0.0;

  abstract ensureReady(): Promise<void>;
  abstract dispose(): void;

  startListening(targetFreq: number): void {
    this.targetFrequency = targetFreq;
    this.resetTracking();
    this.isListening = true;
  }

  stopListening(): void {
    this.isListening = false;
    this.resetTracking();
  }

  protected resetTracking(): void {
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
    // Watchdog: el worklet postea cada ~21 ms; si dejaron de llegar frames
    // (contexto suspendido, dispositivo desconectado) jamás reportar un
    // "on pitch" congelado.
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

  protected handleFrame(frame: PitchFrame): void {
    if (!this.isListening) return;

    // Tiempo real transcurrido entre frames, del reloj de audio (~0.0213 s/hop).
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
      // recentCents se conserva: una consonante no debe borrar el contexto de la mediana.
    }

    // "On pitch" exige voz sostenida (nada de ataques de un frame) Y la
    // desviación mediana dentro de tolerancia.
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
        // Corte sostenido: la nota debe cantarse otra vez desde cero.
        this.holdSeconds = 0.0;
      }
      // Dentro de la ventana de gracia el hold solo se pausa.
    }
  }
}

export class MicPitchDetector extends PitchTracker {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;

  constructor(private readonly ctx: AudioContext) {
    super();
  }

  async ensureReady(): Promise<void> {
    if (this.worklet) return;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new MicUnsupportedError();
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true, // evita retroalimentación en navegador
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      console.error("[Mic] Permiso denegado", err);
      throw new MicDeniedError();
    }

    // Carga del worklet. El ?v= revienta el cache HTTP para que un worklet
    // viejo nunca se empareje con un tracker más nuevo (PLAN §16).
    await this.ctx.audioWorklet.addModule("./pitch-processor.js?v=2");
    console.info("[Mic] Afinador estándar v2 activo — hold 1.5s, gracia 0.25s, mediana 5 frames");

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");

    this.worklet.port.onmessage = (event: MessageEvent<PitchFrame>) => {
      this.handleFrame(event.data);
    };

    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0.0; // silencia el feed del mic (no oír tu voz con delay)

    this.source.connect(this.worklet);
    this.worklet.connect(this.sink).connect(this.ctx.destination);
  }

  dispose(): void {
    this.isListening = false;
    try {
      this.source?.disconnect();
      this.worklet?.disconnect();
      this.sink?.disconnect();
    } catch (err) {
      console.warn("[Mic] Error desmontando el grafo del mic", err);
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

// ── Mic falso para QA y desarrollo (PLAN §3.6, ?fakemic=1) ──
// Genera frames sintéticos deterministas cada ~21 ms sobre el MISMO tracker:
//   ↑/↓        = ±10 cents
//   PageUp/Dn  = ±1 semitono (±100 cents)
//   M sostenida = silencio (frames no-voz; sirve para probar gracia y reset)
// Frecuencia inicial = target de startListening (la linterna activa).
export class FakePitchDetector extends PitchTracker {
  private centsOffset = 0;
  private muted = false;
  private intervalId = 0;
  // Reloj propio monotónico (dt fijo 21.3 ms por frame): el tracking es
  // determinista aunque el navegador acelere o frene los timers.
  private fakeT = 0;
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowUp") { this.centsOffset += 10; e.preventDefault(); }
    else if (e.key === "ArrowDown") { this.centsOffset -= 10; e.preventDefault(); }
    else if (e.key === "PageUp") { this.centsOffset += 100; e.preventDefault(); }
    else if (e.key === "PageDown") { this.centsOffset -= 100; e.preventDefault(); }
    else if (e.key === "m" || e.key === "M") this.muted = true;
  };
  private readonly onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "m" || e.key === "M") this.muted = false;
  };

  async ensureReady(): Promise<void> {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    console.info("[FakeMic] ?fakemic=1 activo — ↑/↓ ±10 cents, PageUp/Dn ±1 st, M = silencio");
  }

  override startListening(targetFreq: number): void {
    super.startListening(targetFreq);
    this.centsOffset = 0;
    this.muted = false;
    window.clearInterval(this.intervalId);
    this.intervalId = window.setInterval(() => this.emitFrame(), 21);
  }

  private emitFrame(): void {
    this.fakeT += 0.0213;
    const freq = this.muted
      ? -1
      : this.targetFrequency * Math.pow(2, this.centsOffset / 1200);
    this.handleFrame({
      frequency: freq,
      clarity: this.muted ? 0 : 1,
      rms: this.muted ? 0 : 0.2,
      t: this.fakeT,
    });
  }

  /** QA: inyecta n frames de golpe (síncrono, dt fijo) sin esperar al reloj real. */
  pumpFrames(n: number): PitchState {
    for (let i = 0; i < n; i++) this.emitFrame();
    return this.getCurrentState();
  }

  override stopListening(): void {
    window.clearInterval(this.intervalId);
    this.intervalId = 0;
    super.stopListening();
  }

  /** Desplazamiento actual en cents (QA programático). */
  setCentsOffset(cents: number): void {
    this.centsOffset = cents;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  dispose(): void {
    this.stopListening();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }
}

export function isFakeMicRequested(): boolean {
  return new URLSearchParams(window.location.search).get("fakemic") === "1";
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
