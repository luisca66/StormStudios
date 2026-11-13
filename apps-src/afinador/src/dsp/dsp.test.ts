import { describe, expect, it } from 'vitest';
import { TunerConfig } from './TunerConfig';
import { NoteMapper } from './NoteMapper';
import { SignalAnalyzer } from './SignalAnalyzer';
import { PitchDetector } from './PitchDetector';
import { AccidentalStyle, NoPitchReason, PitchDetectionResult } from './PitchDetectionResult';
import { InstrumentModes } from './InstrumentMode';
import { SmoothingFilter } from './SmoothingFilter';
import { Fft } from './Fft';

const config = new TunerConfig(), mapper = new NoteMapper(config);
function sine(frequency: number, amplitude = 0.75, rate = config.sampleRate, phase = 0) {
  return Float32Array.from({ length: config.analysisSize }, (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * i / rate + phase));
}
function harmonic(frequency: number) {
  return Float32Array.from({ length: config.analysisSize }, (_, i) => [0.25, 0.5, 0.4, 0.2, 0.12, 0.06].reduce((sum, a, h) =>
    sum + (frequency * (h + 1) < config.sampleRate / 2 ? a * Math.sin(2 * Math.PI * frequency * (h + 1) * i / config.sampleRate) : 0), 0) * 0.6);
}
function noise(seed: number) {
  return Float32Array.from({ length: config.analysisSize }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 * 2 - 1) * 0.5; });
}
describe('NoteMapper — Kotlin parity', () => {
  it('maps A4 exactly', () => { expect(mapper.map(440)!.name()).toBe('A4'); expect(mapper.map(440)!.cents).toBeCloseTo(0, 4); });
  it('maps sharps and flats', () => { const n = mapper.map(277.1826309768721)!; expect(n.name()).toBe('C#4'); expect(n.name(AccidentalStyle.Flats)).toBe('Db4'); });
  it('reports high/low cents', () => { for (const c of [8, -11]) expect(mapper.map(440 * 2 ** (c / 1200))!.cents).toBeCloseTo(c, 3); });
  it('rejects invalid and out of range frequencies', () => { for (const f of [35, 2500, 0, -1, NaN, Infinity]) expect(mapper.map(f)).toBeNull(); });
});
describe('SignalAnalyzer — Kotlin parity', () => {
  it('measures silence and empty arrays', () => { for (const size of [0, 1024]) expect(new SignalAnalyzer().analyze(new Float32Array(size))).toEqual({ rms: 0, peak: 0, zeroCrossingRate: 0 }); });
  it('measures signal level', () => { const s = new SignalAnalyzer().analyze(Float32Array.from({ length: 1024 }, (_, i) => i % 2 === 0 ? 0.5 : -0.5)); expect(s.rms).toBe(0.5); expect(s.peak).toBe(0.5); expect(s.zeroCrossingRate).toBeGreaterThan(0.9); });
});
describe('InstrumentMode — Kotlin parity', () => {
  it('matches guitar strings', () => { for (const [midi, label] of [[40, '6E'], [45, '5A'], [64, '1E']] as const) expect(InstrumentModes.GuitarStandard.match(mapper.map(mapper.frequencyFor(midi)))?.label).toBe(label); });
  it('has no chromatic target', () => { expect(InstrumentModes.Chromatic.match(mapper.map(440))).toBeNull(); });
  it('matches string families', () => { for (const [mode, midi, label] of [[InstrumentModes.UkuleleStandard, 67, '4G'], [InstrumentModes.ViolinStandard, 76, 'E'], [InstrumentModes.ViolaStandard, 48, 'C'], [InstrumentModes.CelloStandard, 36, 'C']] as const) expect(mode.match(mapper.map(mapper.frequencyFor(midi)))?.label).toBe(label); });
  it('falls back to chromatic', () => expect(InstrumentModes.byId('missing')).toBe(InstrumentModes.Chromatic));
});
describe('PitchDetector — Kotlin synthetic tests', () => {
  const detector = new PitchDetector();
  it('detects every chromatic note C2–C7 within ±1 cent', () => {
    for (let midi = 36; midi <= 96; midi++) {
      const r = detector.detect(sine(mapper.frequencyFor(midi)));
      expect(r.hasPitch, `MIDI ${midi}: ${JSON.stringify(r)}`).toBe(true);
      expect(r.note!.midi).toBe(midi); expect(Math.abs(r.note!.cents)).toBeLessThanOrEqual(1);
      expect(r.confidence).toBeGreaterThanOrEqual(config.clarityThreshold);
    }
  });
  it('rejects quiet signals', () => { const r = detector.detect(sine(440, 0.0005)); expect(r.hasPitch).toBe(false); expect(r.reason).toBe(NoPitchReason.TooQuiet); });
  it('preserves core support for bass low E', () => { const r = detector.detect(sine(mapper.frequencyFor(28))); expect(r.hasPitch).toBe(true); expect(r.note!.midi).toBe(28); expect(Math.abs(r.note!.cents)).toBeLessThanOrEqual(1); });
  it('rejects 3000 Hz', () => { const r = detector.detect(sine(3000)); expect(r.hasPitch).toBe(false); expect(r.reason).toBe(NoPitchReason.OutOfRange); });
  it('FFT difference matches direct sums', () => {
    const samples = harmonic(mapper.frequencyFor(45)), maxTau = 1070, window = samples.length - maxTau;
    const fast = detector.differenceFunction(samples, samples.length, maxTau);
    for (const tau of [1, 17, 250, 980, maxTau]) {
      let direct = 0; for (let i = 0; i < window; i++) direct += (samples[i] - samples[i + tau]) ** 2;
      expect(Math.abs(fast[tau] - direct)).toBeLessThan(direct * 1e-9 + 1e-6);
    }
  });
  it('detects harmonics with weak fundamental', () => {
    for (let midi = 28; midi <= 76; midi++) { const r = detector.detect(harmonic(mapper.frequencyFor(midi))); expect(r.hasPitch, `MIDI ${midi}`).toBe(true); expect(r.note!.midi).toBe(midi); expect(Math.abs(r.note!.cents)).toBeLessThanOrEqual(2); }
  });
  it('measures detuned harmonic notes', () => { for (const cents of [-30, -7, 4, 18]) { const r = detector.detect(harmonic(196 * 2 ** (cents / 1200))); expect(r.note!.midi).toBe(55); expect(Math.abs(r.note!.cents - cents)).toBeLessThanOrEqual(1); } });
});
describe('Web accuracy and rejection regressions', () => {
  it('is accurate across device sample rates, phases and detuning', () => {
    for (const rate of [44100, 48000, 96000]) {
      const detector = new PitchDetector(new TunerConfig({ minMidi: 36, minFrequency: mapper.frequencyFor(36) * 2 ** (-50 / 1200), maxFrequency: mapper.frequencyFor(96) * 2 ** (50 / 1200) }));
      for (const midi of [36, 37, 48, 60, 69, 81, 90, 95, 96]) for (const cents of [-25, 0, 23]) {
        const r = detector.detect(sine(mapper.frequencyFor(midi) * 2 ** (cents / 1200), 0.2, rate, 1.2), rate);
        expect(r.hasPitch, `${rate} MIDI ${midi} ${cents}`).toBe(true); expect(r.note!.midi).toBe(midi);
        expect(Math.abs(r.note!.cents - cents), `${rate} MIDI ${midi} ${cents}`).toBeLessThanOrEqual(1);
      }
    }
  });
  it('does not invent notes from white or low-pass noise', () => {
    const detector = new PitchDetector();
    for (let seed = 1; seed <= 20; seed++) {
      const samples = noise(seed); expect(detector.detect(samples).hasPitch).toBe(false);
      let value = 0; for (let i = 0; i < samples.length; i++) { value = 0.92 * value + 0.08 * samples[i]; samples[i] = value; }
      expect(detector.detect(samples).hasPitch).toBe(false);
    }
  });
  it('never accepts a low confidence result', () => expect(new PitchDetectionResult({ frequencyHz: 440, note: mapper.map(440), confidence: 0.3, reason: NoPitchReason.LowConfidence }).hasPitch).toBe(false));
  it('holds brief dropouts, clears stale readings and resets', () => {
    const filter = new SmoothingFilter(2), pitch = new PitchDetectionResult({ frequencyHz: 440, note: mapper.map(440), confidence: 1 });
    expect(filter.push(pitch).stable).toBe(true);
    const missing = new PitchDetectionResult({ reason: NoPitchReason.LowConfidence });
    expect(filter.push(missing).held).toBe(true); expect(filter.push(missing).stable).toBe(false);
    expect(filter.push(missing).result.hasPitch).toBe(false);
    filter.push(pitch); filter.reset(); expect(filter.push(missing).held).toBe(false);
  });
  it('keeps a sustained note visible indefinitely', () => { const filter = new SmoothingFilter(); for (let i = 0; i < 1000; i++) expect(filter.push(new PitchDetector().detect(sine(440, 0.05, 44100, i))).result.hasPitch).toBe(true); });
  it('retains Kotlin attack/release and changes note without a stale transition', () => {
    const filter = new SmoothingFilter();
    const reading = (cents: number, midi = 69) => { const frequencyHz = mapper.frequencyFor(midi) * 2 ** (cents / 1200); return new PitchDetectionResult({ frequencyHz, note: mapper.map(frequencyHz), confidence: 1 }); };
    filter.push(reading(0));
    expect(filter.push(reading(20)).result.note!.cents).toBeCloseTo(8.4, 6);
    expect(filter.push(reading(10)).result.note!.cents).toBeCloseTo(8.656, 6);
    const switched = filter.push(reading(-15, 70)).result;
    expect(switched.note!.midi).toBe(70); expect(switched.note!.cents).toBeCloseTo(-15, 6);
  });
  it('FFT round trips and validates size', () => {
    expect(() => new Fft(7)).toThrow(); const re = Float64Array.from([1, 2, 3, 4]), im = new Float64Array(4), fft = new Fft(4);
    fft.transform(re, im); fft.transform(re, im, true); for (let i = 0; i < 4; i++) expect(re[i]).toBeCloseTo(i + 1, 10);
  });
});
