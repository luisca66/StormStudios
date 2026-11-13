import type { MusicalNote } from './PitchDetectionResult';
export interface TuningTarget { label: string; midi: number }
export class InstrumentMode {
  constructor(public id: string, public targets: TuningTarget[] = []) {}
  get isChromatic() { return this.targets.length === 0; }
  match(note: MusicalNote | null) { return note ? this.targets.find(t => t.midi === note.midi) ?? null : null; }
}
function mode(id: string, labels: string[], midis: number[]) { return new InstrumentMode(id, labels.map((label, i) => ({ label, midi: midis[i] }))); }
// Los mismos modos que la app Android: el usuario los elige en el panel del modo.
export const InstrumentModes = {
  Chromatic: new InstrumentMode('chromatic'),
  GuitarStandard: mode('guitar_standard', ['6E', '5A', '4D', '3G', '2B', '1E'], [40, 45, 50, 55, 59, 64]),
  BassStandard: mode('bass_standard', ['4E', '3A', '2D', '1G'], [28, 33, 38, 43]),
  UkuleleStandard: mode('ukulele_standard', ['4G', '3C', '2E', '1A'], [67, 60, 64, 69]),
  ViolinStandard: mode('violin_standard', ['G', 'D', 'A', 'E'], [55, 62, 69, 76]),
  ViolaStandard: mode('viola_standard', ['C', 'G', 'D', 'A'], [48, 55, 62, 69]),
  CelloStandard: mode('cello_standard', ['C', 'G', 'D', 'A'], [36, 43, 50, 57]),
  byId(id?: string | null): InstrumentMode { return this.all.find(m => m.id === id) ?? this.Chromatic; },
  get all(): InstrumentMode[] { return [this.Chromatic, this.GuitarStandard, this.BassStandard, this.UkuleleStandard, this.ViolinStandard, this.ViolaStandard, this.CelloStandard]; },
};
