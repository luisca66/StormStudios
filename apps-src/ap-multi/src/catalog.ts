import type { InstrumentSpec, NoteSample } from "./types";

export const randomInstrument = "Aleatorio";

export const chromaticNotes = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const answerOptions = chromaticNotes;

export const chromaticOrderMap: Map<string, number> = new Map(chromaticNotes.map((note, index) => [note, index]));

export const instruments: InstrumentSpec[] = [
  { displayName: "Cello", folderName: "Cello" },
  { displayName: "Piano", folderName: "Piano" },
  { displayName: "Corno", folderName: "Corno" },
  { displayName: "Coro", folderName: "Coro" },
  { displayName: "Fagot", folderName: "Fagot" },
];

export const allSamples: NoteSample[] = instruments.flatMap(samplesForInstrument);

export const allUniqueNoteNames = Array.from(new Set(allSamples.map((sample) => sample.noteName))).sort(
  compareFullNotes,
);

export function noteBase(noteName: string) {
  return noteName.replace(/\d/g, "");
}

export function noteOctave(noteName: string) {
  const match = noteName.match(/\d+$/);
  return match ? Number(match[0]) : 0;
}

export function compareFullNotes(a: string, b: string) {
  const octaveDelta = noteOctave(a) - noteOctave(b);
  if (octaveDelta !== 0) return octaveDelta;
  return (chromaticOrderMap.get(noteBase(a)) ?? 99) - (chromaticOrderMap.get(noteBase(b)) ?? 99);
}

export function sampleId(sample: NoteSample) {
  return sample.filePath;
}

function samplesForInstrument(instrument: InstrumentSpec): NoteSample[] {
  const samples: NoteSample[] = [];

  for (let octave = 2; octave <= 6; octave += 1) {
    chromaticNotes.forEach((note) => {
      const noteName = `${note}${octave}`;
      samples.push({
        instrument: instrument.displayName,
        noteName,
        filePath: `${instrument.folderName}/${noteName}.mp3`,
      });
    });
  }

  samples.push({
    instrument: instrument.displayName,
    noteName: "C7",
    filePath: `${instrument.folderName}/C7.mp3`,
  });

  return samples;
}
