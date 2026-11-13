import { Fft } from './Fft';
import { NoteMapper } from './NoteMapper';
import { NoPitchReason, PitchDetectionResult } from './PitchDetectionResult';
import { SignalAnalyzer } from './SignalAnalyzer';
import { TunerConfig } from './TunerConfig';
export class PitchDetector {
  private fft?: Fft;
  private wr = new Float64Array(0);
  private wi = new Float64Array(0);
  private sr = new Float64Array(0);
  private si = new Float64Array(0);
  private energy = new Float64Array(0);
  constructor(private config = new TunerConfig(), private mapper = new NoteMapper(config), private analyzer = new SignalAnalyzer()) {}
  detect(input: Float32Array, sampleRate = this.config.sampleRate): PitchDetectionResult {
    const size = Math.min(input.length, this.config.analysisSize), stats = this.analyzer.analyze(input, size);
    const result = (values: Partial<PitchDetectionResult>) => new PitchDetectionResult({ rms: stats.rms, ...values });
    if (size < 256 || !Number.isFinite(stats.rms) || stats.rms < this.config.minRms) return result({ reason: NoPitchReason.TooQuiet });
    const crossingHz = stats.zeroCrossingRate * sampleRate / 2;
    if (crossingHz > this.config.maxFrequency * 1.12) return result({ frequencyHz: crossingHz, reason: NoPitchReason.OutOfRange });
    const minTau = Math.max(2, Math.floor(sampleRate / this.config.maxFrequency));
    const maxTau = Math.min(Math.floor(sampleRate / this.config.minFrequency), Math.floor(size / 2));
    if (maxTau <= minTau) return result({ reason: NoPitchReason.OutOfRange });
    const difference = this.differenceFunction(input, size, maxTau), yin = difference.slice();
    let sum = 0;
    yin[0] = 1;
    for (let tau = 1; tau <= maxTau; tau++) { sum += yin[tau]; yin[tau] = sum === 0 ? 1 : yin[tau] * tau / sum; }
    let estimate = -1;
    for (let tau = minTau; tau <= maxTau; tau++) if (yin[tau] < this.config.yinThreshold) {
      while (tau + 1 <= maxTau && yin[tau + 1] < yin[tau]) tau++;
      estimate = tau; break;
    }
    if (estimate === -1) {
      estimate = minTau;
      for (let tau = minTau; tau <= maxTau; tau++) if (yin[tau] < yin[estimate]) estimate = tau;
    }
    const frequencyHz = sampleRate / this.parabolicTau(difference, estimate);
    const confidence = Math.max(0, Math.min(1, 1 - yin[estimate]));
    const note = this.mapper.map(frequencyHz);
    if (!note) return result({ frequencyHz, confidence, reason: NoPitchReason.OutOfRange });
    if (confidence < this.config.clarityThreshold) return result({ frequencyHz, confidence, note, reason: NoPitchReason.LowConfidence });
    return result({ frequencyHz, confidence, note });
  }
  differenceFunction(input: Float32Array, size: number, maxTau: number) {
    const window = size - maxTau, fftSize = Fft.nextPowerOfTwo(size);
    if (this.fft?.size !== fftSize) {
      this.fft = new Fft(fftSize);
      this.wr = new Float64Array(fftSize); this.wi = new Float64Array(fftSize);
      this.sr = new Float64Array(fftSize); this.si = new Float64Array(fftSize);
    }
    if (this.energy.length < size + 1) this.energy = new Float64Array(size + 1);
    this.energy[0] = 0;
    this.wr.fill(0); this.wi.fill(0); this.sr.fill(0); this.si.fill(0);
    for (let i = 0; i < size; i++) {
      const sample = input[i]; this.sr[i] = sample;
      if (i < window) this.wr[i] = sample;
      this.energy[i + 1] = this.energy[i] + sample * sample;
    }
    this.fft!.transform(this.wr, this.wi); this.fft!.transform(this.sr, this.si);
    for (let k = 0; k < fftSize; k++) {
      const ar = this.wr[k], ai = this.wi[k], br = this.sr[k], bi = this.si[k];
      this.wr[k] = ar * br + ai * bi; this.wi[k] = ar * bi - ai * br;
    }
    this.fft!.transform(this.wr, this.wi, true);
    const difference = new Float64Array(maxTau + 1);
    for (let tau = 1; tau <= maxTau; tau++) difference[tau] = Math.max(0, this.energy[window] + this.energy[tau + window] - this.energy[tau] - 2 * this.wr[tau]);
    return difference;
  }
  private parabolicTau(values: Float64Array, tau: number) {
    if (tau <= 1 || tau >= values.length - 1) return tau;
    const left = values[tau - 1], center = values[tau], right = values[tau + 1], denominator = left - 2 * center + right;
    return denominator === 0 ? tau : tau + 0.5 * (left - right) / denominator;
  }
}
