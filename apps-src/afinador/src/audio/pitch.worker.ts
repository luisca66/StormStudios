import { PitchDetector } from '../dsp/PitchDetector';
import { SmoothingFilter } from '../dsp/SmoothingFilter';
import { TunerConfig } from '../dsp/TunerConfig';
export interface TunerSettings { a4: number; lowestMidi: number }
// Half-semitone margins allow detuning at the endpoints; NoteMapper enforces the MIDI range.
const margin = 2 ** (50 / 1200);
function build({ a4, lowestMidi }: TunerSettings) {
  const hz = (midi: number) => a4 * 2 ** ((midi - 69) / 12);
  const config = new TunerConfig({ a4Frequency: a4, minMidi: lowestMidi, minFrequency: hz(lowestMidi) / margin, maxFrequency: hz(96) * margin });
  return { detector: new PitchDetector(config), smoothing: new SmoothingFilter(6) };
}
// C2 a C7 con A4 = 440 hasta que la interfaz mande los ajustes guardados.
let { detector, smoothing } = build({ a4: 440, lowestMidi: 36 });
self.onmessage = (event: MessageEvent<{ samples: Float32Array; sampleRate: number } | { settings: TunerSettings }>) => {
  if ('settings' in event.data) { ({ detector, smoothing } = build(event.data.settings)); return; }
  const raw = detector.detect(event.data.samples, event.data.sampleRate);
  const state = smoothing.push(raw);
  // Explicit flag: structured cloning does not retain class getters or methods.
  self.postMessage({ ...state, hasPitch: state.result.hasPitch, rms: raw.rms, confidence: raw.confidence });
};
