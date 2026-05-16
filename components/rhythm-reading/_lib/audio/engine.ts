/**
 * engine.ts — AudioContext singleton, master gain, outputLatency.
 * Solo corre en el navegador (llamar desde useEffect o handlers de usuario).
 */

let _ctx: AudioContext | null = null;
let _masterGain: GainNode | null = null;

/** Obtiene (o crea) el AudioContext singleton. */
export function getAudioContext(): AudioContext {
  if (!_ctx) {
    _ctx = new (
      window.AudioContext ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitAudioContext
    )();
  }
  return _ctx;
}

/** Obtiene (o crea) el nodo de ganancia master. Toda la cadena converge aquí. */
export function getMasterGain(): GainNode {
  const ctx = getAudioContext();
  if (!_masterGain) {
    _masterGain = ctx.createGain();
    _masterGain.gain.value = 0.8;
    _masterGain.connect(ctx.destination);
  }
  return _masterGain;
}

/**
 * Inicializa el AudioContext y lo desbloquea si está en estado 'suspended'
 * (necesario en Safari y en navegadores que requieren gesto del usuario).
 */
export async function initAudio(): Promise<void> {
  const ctx = getAudioContext();
  getMasterGain();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
}

/**
 * Latencia de salida de audio reportada por el sistema operativo.
 * Se debe restar de los timestamps de input al evaluar onsets.
 * Retorna 0 si el navegador no lo soporta.
 */
export function getOutputLatency(): number {
  if (!_ctx) return 0;
  return _ctx.outputLatency ?? 0;
}

/** Latencia de procesamiento interno del Web Audio API. */
export function getBaseLatency(): number {
  if (!_ctx) return 0;
  return _ctx.baseLatency ?? 0;
}

/** Latencia total estimada (outputLatency + baseLatency) en milisegundos. */
export function getTotalLatencyMs(): number {
  return (getOutputLatency() + getBaseLatency()) * 1000;
}
