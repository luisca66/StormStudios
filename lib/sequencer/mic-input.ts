/**
 * mic-input.ts — Escribir cantando o tocando (Sequencer v5).
 *
 * Dos piezas puras, probadas sin micrófono:
 * - `detectPitch`: frecuencia fundamental de un bloque de audio (método YIN:
 *   diferencia normalizada + interpolación parabólica). Resiste armónicos, que
 *   es lo que hace fallar a un detector por FFT con voces e instrumentos.
 * - `NoteSegmenter`: convierte la lectura continua en notas sueltas. Una nota
 *   se entrega una sola vez cuando se sostiene estable; para la siguiente hace
 *   falta un silencio o un cambio de altura.
 *
 * La captura (getUserMedia, AnalyserNode) vive en `useMicInput`.
 */

export type PitchReading = { hz: number; midi: number; clarity: number };

const THRESHOLD = 0.12;

/** Frecuencia fundamental del bloque, o null si es silencio o ruido sin altura clara. */
export function detectPitch(samples: Float32Array, sampleRate: number, minHz = 60, maxHz = 1200, silence = 0.012): PitchReading | null {
  const size = samples.length;
  let energy = 0;
  for (let i = 0; i < size; i++) energy += samples[i] * samples[i];
  if (Math.sqrt(energy / size) < silence) return null;
  const maxTau = Math.min(Math.floor(size / 2), Math.ceil(sampleRate / minHz)), minTau = Math.max(2, Math.floor(sampleRate / maxHz));
  const window = size - maxTau;
  const normalized = new Float32Array(maxTau + 1);
  normalized[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    let difference = 0;
    for (let i = 0; i < window; i++) { const delta = samples[i] - samples[i + tau]; difference += delta * delta; }
    running += difference;
    normalized[tau] = running ? (difference * tau) / running : 1;
  }
  // Primer valle bajo el umbral: el periodo fundamental, no uno de sus múltiplos.
  let tau = -1;
  for (let candidate = minTau; candidate <= maxTau; candidate++) {
    if (normalized[candidate] >= THRESHOLD) continue;
    while (candidate + 1 <= maxTau && normalized[candidate + 1] < normalized[candidate]) candidate++;
    tau = candidate; break;
  }
  if (tau < 0) return null;
  // Interpolación parabólica entre los vecinos del valle.
  const before = normalized[tau - 1] ?? normalized[tau], after = normalized[tau + 1] ?? normalized[tau];
  const curve = before + after - 2 * normalized[tau];
  const period = curve ? tau + (before - after) / (2 * curve) : tau;
  const hz = sampleRate / period;
  if (!Number.isFinite(hz) || hz < minHz || hz > maxHz) return null;
  return { hz, midi: 69 + 12 * Math.log2(hz / 440), clarity: 1 - normalized[tau] };
}

export type SegmenterOptions = {
  /** Tiempo que la nota debe sostenerse estable antes de escribirse. */
  holdMs?: number;
  /** Silencio que separa dos notas iguales. */
  releaseMs?: number;
  /** Desafinación máxima (en cents) para contar como esa nota. */
  toleranceCents?: number;
};

/** Lecturas continuas (o null = silencio) → notas MIDI enteras, una por nota cantada o tocada. */
export class NoteSegmenter {
  private candidate: number | null = null;
  private candidateSince = 0;
  private held: number | null = null;
  private silentSince: number | null = null;
  private readonly holdMs: number; private readonly releaseMs: number; private readonly tolerance: number;
  constructor(private onNote: (midi: number) => void, options: SegmenterOptions = {}) {
    this.holdMs = options.holdMs ?? 160; this.releaseMs = options.releaseMs ?? 110; this.tolerance = options.toleranceCents ?? 40;
  }
  /** `midi` puede traer decimales (afinación); `time` en milisegundos. */
  push(midi: number | null, time: number) {
    const note = midi === null ? null : Math.round(midi);
    const inTune = note !== null && Math.abs(midi! - note) * 100 <= this.tolerance;
    if (!inTune) {
      // Silencio o altura entre dos notas: corta al candidato y, si dura, suelta la nota sostenida.
      this.candidate = null;
      if (this.silentSince === null) this.silentSince = time;
      if (this.held !== null && time - this.silentSince >= this.releaseMs) this.held = null;
      return;
    }
    this.silentSince = null;
    if (note === this.held) { this.candidate = null; return; }
    if (note !== this.candidate) { this.candidate = note; this.candidateSince = time; return; }
    if (time - this.candidateSince >= this.holdMs) { this.held = note; this.candidate = null; this.onNote(note!); }
  }
  reset() { this.candidate = null; this.held = null; this.silentSince = null; }
}
