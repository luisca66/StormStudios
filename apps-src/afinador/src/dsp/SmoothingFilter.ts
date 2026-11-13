import { MusicalNote, NoPitchReason, PitchDetectionResult } from './PitchDetectionResult';
export interface SmoothedTunerState { result: PitchDetectionResult; stable: boolean; held: boolean }
export class SmoothingFilter {
  private last: PitchDetectionResult | null = null;
  private missing = 0;
  constructor(private holdFrames = 10, private centsAttack = 0.42, private centsRelease = 0.16, private frequencyBlend = 0.35, private inTuneCents = 5) {}
  push(result: PitchDetectionResult): SmoothedTunerState {
    if (!result.hasPitch) {
      this.missing++;
      if (this.last && this.missing <= this.holdFrames) return { result: this.last, stable: false, held: true };
      this.last = null;
      return { result, stable: false, held: false };
    }
    this.missing = 0;
    const previous = this.last;
    let smoothed = result;
    if (previous?.hasPitch && previous.note!.midi === result.note!.midi) {
      const n = result.note!, delta = n.cents - previous.note!.cents;
      const blend = Math.abs(delta) > 12 ? this.centsAttack : this.centsRelease;
      smoothed = new PitchDetectionResult({ ...result,
        note: new MusicalNote(n.midi, n.pitchClass, n.octave, n.frequencyHz, previous.note!.cents + delta * blend),
        frequencyHz: previous.frequencyHz! + (result.frequencyHz! - previous.frequencyHz!) * this.frequencyBlend,
      });
    }
    this.last = smoothed;
    return { result: smoothed, stable: Math.abs(smoothed.note!.cents) <= this.inTuneCents, held: false };
  }
  reset() { this.last = null; this.missing = 0; }
}
