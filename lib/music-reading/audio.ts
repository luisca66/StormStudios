import type { Pitch } from "./types";

export const SAMPLE_BASE_URL =
  "https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";

export const SAMPLE_INSTRUMENTS = [
  "Piano",
  "Cello",
  "Corno",
  "Coro",
  "Fagot",
] as const;

export type SampleInstrument = (typeof SAMPLE_INSTRUMENTS)[number];

export const DEFAULT_SAMPLE_INSTRUMENT: SampleInstrument = "Piano";

const SAMPLE_VOLUME = 0.5;
const warnedFailedSamples = new Set<string>();

export function getSampleKey(pitch: Pitch): string {
  return `${pitch.note}${pitch.octave}`;
}

export function getSampleUrl(
  instrument: SampleInstrument,
  sampleKey: string,
): string {
  const safeKey = sampleKey.replace("#", "%23");
  return `${SAMPLE_BASE_URL}/${instrument}/${safeKey}.mp3`;
}

export function playNoteSample(
  pitch: Pitch,
  instrument: SampleInstrument = DEFAULT_SAMPLE_INSTRUMENT,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const sampleKey = getSampleKey(pitch);
  const sampleUrl = getSampleUrl(instrument, sampleKey);
  const audio = new Audio(sampleUrl);

  audio.volume = SAMPLE_VOLUME;
  audio.currentTime = 0;
  audio.play().catch((error: unknown) => {
    warnFailedSample(instrument, sampleKey, error);
  });
}

function warnFailedSample(
  instrument: SampleInstrument,
  sampleKey: string,
  error: unknown,
) {
  const warningKey = `${instrument}_${sampleKey}`;

  if (warnedFailedSamples.has(warningKey)) {
    return;
  }

  warnedFailedSamples.add(warningKey);
  console.warn(
    `No se pudo reproducir el sample ${instrument}/${sampleKey}.`,
    error,
  );
}
