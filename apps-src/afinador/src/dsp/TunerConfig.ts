/** Defaults faithfully retain Kotlin's extended bass range. The web app sets C2. */
export class TunerConfig {
  sampleRate = 44_100;
  minFrequency = 41.20344461410874;
  maxFrequency = 2093.004522404789;
  minMidi = 28;
  maxMidi = 96;
  a4Frequency = 440;
  minRms = 0.006;
  yinThreshold = 0.12;
  clarityThreshold = 0.82;
  analysisSize = 8192;
  inTuneCents = 5;
  constructor(overrides: Partial<TunerConfig> = {}) { Object.assign(this, overrides); }
}
