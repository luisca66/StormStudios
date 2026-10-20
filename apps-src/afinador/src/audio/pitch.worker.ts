import { PitchDetector } from '../dsp/PitchDetector';
import { SmoothingFilter } from '../dsp/SmoothingFilter';
import { TunerConfig } from '../dsp/TunerConfig';
const config = new TunerConfig({
  minMidi: 36,
  // Half-semitone margins allow detuning at the C2/C7 endpoints; NoteMapper enforces MIDI range.
  minFrequency: 65.40639132514966 * 2 ** (-50 / 1200),
  maxFrequency: 2093.004522404789 * 2 ** (50 / 1200),
});
const detector = new PitchDetector(config), smoothing = new SmoothingFilter(6);
self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number }>) => {
  const raw = detector.detect(event.data.samples, event.data.sampleRate);
  const state = smoothing.push(raw);
  // Explicit flag: structured cloning does not retain class getters or methods.
  self.postMessage({ ...state, hasPitch: state.result.hasPitch, rms: raw.rms, confidence: raw.confidence });
};
