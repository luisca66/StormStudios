import { MusicalNote } from './PitchDetectionResult';
import { TunerConfig } from './TunerConfig';
export class NoteMapper {
  constructor(private config = new TunerConfig()) {}
  frequencyFor(midi: number) { return this.config.a4Frequency * 2 ** ((midi - 69) / 12); }
  map(frequencyHz: number): MusicalNote | null {
    if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
    const midi = Math.round(69 + 12 * Math.log2(frequencyHz / this.config.a4Frequency));
    if (midi < this.config.minMidi || midi > this.config.maxMidi) return null;
    const target = this.frequencyFor(midi);
    return new MusicalNote(midi, ((midi % 12) + 12) % 12, Math.floor(midi / 12) - 1, target, 1200 * Math.log2(frequencyHz / target));
  }
}
