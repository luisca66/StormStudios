const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

const INTERVAL_SEMITONES: Record<string, number> = {
  '2m': 1, '2M': 2, '3m': 3, '3M': 4, '4J': 5, '5dis': 6,
  '5J': 7, '6m': 8, '6M': 9, '7m': 10, '7M': 11, '8J': 12,
  '9m': 13, '9M': 14
};

export interface GeneratedInterval {
  rootNote: string;
  intervalNote: string;
  intervalId: string;
}

export class IntervalLogic {
  public static generate(activeIntervals: string[]): GeneratedInterval {
    if (!activeIntervals || activeIntervals.length === 0) {
      throw new Error("Debe haber al menos un intervalo activo");
    }

    // 1. Pick a random interval from the allowed ones
    const intervalId = activeIntervals[Math.floor(Math.random() * activeIntervals.length)];
    const semitones = INTERVAL_SEMITONES[intervalId];

    // 2. Pick a random root note
    // C2 is MIDI 36. C7 is MIDI 96.
    // We must ensure rootMidi + semitones <= 96
    const minMidi = 36;
    const maxMidi = 96 - semitones;
    
    const rootMidi = Math.floor(Math.random() * (maxMidi - minMidi + 1)) + minMidi;
    const intervalMidi = rootMidi + semitones;

    return {
      rootNote: midiToName(rootMidi),
      intervalNote: midiToName(intervalMidi),
      intervalId
    };
  }
}
