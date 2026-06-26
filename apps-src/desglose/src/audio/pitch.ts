/**
 * pitch.ts — Captura de micrófono y recolección de frecuencias.
 *
 * Conecta el micrófono a un AudioWorklet (pitch-processor.js) que estima la
 * frecuencia con YIN en el hilo de audio. Aquí solo se recolectan las
 * frecuencias durante la ventana de escucha; `gradeAttempt` (lib/desglose)
 * decide el veredicto.
 */

export class MicDeniedError extends Error {
  constructor() {
    super("microphone-denied");
    this.name = "MicDeniedError";
  }
}

export class MicPitchDetector {
  private readonly ctx: AudioContext;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private worklet: AudioWorkletNode | null = null;
  private sink: GainNode | null = null;
  private collecting = false;
  private collected: number[] = [];

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  /** Pide el micrófono y arma el grafo una sola vez. Lanza MicDeniedError. */
  async ensureReady(): Promise<void> {
    if (this.worklet) return;
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

    await this.ctx.audioWorklet.addModule(
      `${import.meta.env.BASE_URL}pitch-processor.js`,
    );

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");
    this.worklet.port.onmessage = (event: MessageEvent<number>) => {
      if (this.collecting) this.collected.push(event.data);
    };

    // Salida muda hacia el destino: mantiene el worklet "vivo" en el grafo
    // sin reenviar el micrófono a los altavoces (evita realimentación).
    this.sink = this.ctx.createGain();
    this.sink.gain.value = 0;
    this.source.connect(this.worklet);
    this.worklet.connect(this.sink).connect(this.ctx.destination);
  }

  /** Recolecta frecuencias durante `durationMs` y las devuelve. */
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
      // grafo ya desmontado
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.source = null;
    this.worklet = null;
    this.sink = null;
  }
}
