export interface SignalStats { rms: number; peak: number; zeroCrossingRate: number }
export class SignalAnalyzer {
  analyze(samples: Float32Array, size = samples.length): SignalStats {
    size = Math.min(size, samples.length);
    if (size <= 0) return { rms: 0, peak: 0, zeroCrossingRate: 0 };
    let sum = 0, peak = 0, crossings = 0;
    for (let i = 0; i < size; i++) {
      sum += samples[i] * samples[i];
      peak = Math.max(peak, Math.abs(samples[i]));
      if (i > 0 && (samples[i - 1] >= 0) !== (samples[i] >= 0)) crossings++;
    }
    return { rms: Math.sqrt(sum / size), peak, zeroCrossingRate: crossings / size };
  }
}
