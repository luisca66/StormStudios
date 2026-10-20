export enum AccidentalStyle { Sharps = 'sharps', Flats = 'flats' }
export enum NoPitchReason { TooQuiet = 'TooQuiet', OutOfRange = 'OutOfRange', LowConfidence = 'LowConfidence' }
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export class MusicalNote {
  constructor(public midi: number, public pitchClass: number, public octave: number, public frequencyHz: number, public cents: number) {}
  name(style = AccidentalStyle.Sharps) { return (style === AccidentalStyle.Sharps ? SHARPS : FLATS)[this.pitchClass] + this.octave; }
}
export class PitchDetectionResult {
  frequencyHz: number | null = null;
  confidence = 0;
  rms = 0;
  note: MusicalNote | null = null;
  reason: NoPitchReason | null = null;
  constructor(values: Partial<PitchDetectionResult> = {}) { Object.assign(this, values); }
  // Deliberate fix: Kotlin's getter also accepted LowConfidence results.
  get hasPitch() { return this.reason === null && this.frequencyHz !== null && this.note !== null; }
}
